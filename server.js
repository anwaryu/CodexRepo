const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY || 'change-admin-key';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const INSTALLABLE_FILE = path.join(__dirname, 'artifacts', 'HouseholdChoresTracker.ipa');

const DEFAULT_CHORES = [
  { title: 'Walk the dog', estimatedMinutes: 25 },
  { title: 'Clean the dog', estimatedMinutes: 10 },
  { title: 'Empty the dishwasher', estimatedMinutes: 15 },
  { title: 'Evening Kitchen Clean', estimatedMinutes: 5 },
  { title: 'Load dishwasher', estimatedMinutes: 10 },
  { title: 'Prepare kids lunches', estimatedMinutes: 15 }
];

function initialStore() {
  return {
    nextIds: {
      user: 1,
      family: 1,
      member: 1,
      chore: 1,
      schedule: 1,
      assignment: 1,
      invitation: 1,
      device: 1
    },
    users: [],
    families: [],
    members: [],
    chores: [],
    schedules: [],
    assignments: [],
    installInvitations: [],
    devices: []
  };
}

function ensureStoreExists() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(initialStore(), null, 2));
}

function ensureInstallArtifactExists() {
  const artifactDir = path.dirname(INSTALLABLE_FILE);
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  if (!fs.existsSync(INSTALLABLE_FILE)) {
    fs.writeFileSync(
      INSTALLABLE_FILE,
      'Demo iOS private app artifact placeholder. Replace with signed .ipa during deployment.'
    );
  }
}

function loadStore() {
  ensureStoreExists();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function nextId(store, key) {
  const id = store.nextIds[key];
  store.nextIds[key] += 1;
  return id;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function b64(data) {
  return Buffer.from(data).toString('base64url');
}

function unb64(data) {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function signToken(payload, expiresInSeconds = 8 * 60 * 60) {
  const fullPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const encoded = b64(JSON.stringify(fullPayload));
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(unb64(encoded));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sanitizeUser(user) {
  return { id: user.id, email: user.email, displayName: user.displayName, familyId: user.familyId };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        return resolve(JSON.parse(body));
      } catch {
        return reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

function readFamilyAuth(req, res) {
  const auth = getAuth(req);
  if (!auth || !auth.familyId || auth.scope !== 'family') {
    json(res, 401, { error: 'Missing or invalid token' });
    return null;
  }
  return auth;
}

function readAdminAuth(req, res) {
  const auth = getAuth(req);
  if (!auth || auth.scope !== 'admin') {
    json(res, 401, { error: 'Missing or invalid admin token' });
    return null;
  }
  return auth;
}

function resolveMimeType(filePath) {
  const ext = path.extname(filePath);
  if (ext === '.css') return 'text/css';
  if (ext === '.js') return 'text/javascript';
  if (ext === '.html') return 'text/html';
  if (ext === '.ipa') return 'application/octet-stream';
  return 'application/octet-stream';
}

function serveStatic(req, res) {
  const pathname = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR) || !fs.existsSync(safePath)) return false;
  res.writeHead(200, { 'Content-Type': resolveMimeType(safePath) });
  res.end(fs.readFileSync(safePath));
  return true;
}

function createInviteToken() {
  return crypto.randomBytes(20).toString('hex');
}

function lookupInvitation(store, token) {
  return store.installInvitations.find((invite) => invite.token === token);
}

function isInvitationActive(invitation) {
  return invitation && invitation.status === 'active' && invitation.expiresAt > Date.now() && invitation.remainingInstalls > 0;
}

function createServer() {
  ensureInstallArtifactExists();

  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && !req.url.startsWith('/api/') && !req.url.startsWith('/install/') && !req.url.startsWith('/download/')) {
        if (serveStatic(req, res)) return;
      }

      if (req.method === 'POST' && req.url === '/api/register') {
        const { email, password, displayName, familyName } = await parseBody(req);
        if (!email || !password || !displayName || !familyName) {
          return json(res, 400, { error: 'email, password, displayName and familyName are required' });
        }

        const store = loadStore();
        if (store.users.find((user) => user.email.toLowerCase() === email.toLowerCase())) {
          return json(res, 409, { error: 'Email already in use' });
        }

        const family = { id: nextId(store, 'family'), name: familyName };
        const user = {
          id: nextId(store, 'user'),
          email,
          displayName,
          passwordHash: hashPassword(password),
          familyId: family.id
        };

        store.families.push(family);
        store.users.push(user);
        store.members.push({ id: nextId(store, 'member'), familyId: family.id, name: displayName, role: 'Owner' });
        DEFAULT_CHORES.forEach((chore) => {
          store.chores.push({
            id: nextId(store, 'chore'),
            familyId: family.id,
            title: chore.title,
            estimatedMinutes: chore.estimatedMinutes,
            source: 'default'
          });
        });
        saveStore(store);

        return json(res, 201, {
          token: signToken({ userId: user.id, familyId: family.id, scope: 'family' }),
          user: sanitizeUser(user),
          family
        });
      }

      if (req.method === 'POST' && req.url === '/api/login') {
        const { email, password } = await parseBody(req);
        const store = loadStore();
        const user = store.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (!user || !verifyPassword(password, user.passwordHash)) return json(res, 401, { error: 'Invalid credentials' });
        return json(res, 200, {
          token: signToken({ userId: user.id, familyId: user.familyId, scope: 'family' }),
          user: sanitizeUser(user)
        });
      }

      if (req.method === 'POST' && req.url === '/api/admin/login') {
        const { adminKey } = await parseBody(req);
        if (!adminKey || adminKey !== ADMIN_PORTAL_KEY) {
          return json(res, 401, { error: 'Invalid admin key' });
        }
        return json(res, 200, {
          token: signToken({ scope: 'admin', name: 'CentralAdmin' }, 12 * 60 * 60)
        });
      }

      if (req.method === 'GET' && req.url.startsWith('/install/')) {
        const token = req.url.replace('/install/', '').split('?')[0];
        const store = loadStore();
        const invitation = lookupInvitation(store, token);
        if (!isInvitationActive(invitation)) return json(res, 403, { error: 'Invitation is invalid or expired' });

        const family = store.families.find((entry) => entry.id === invitation.familyId);
        return json(res, 200, {
          message: 'Invitation accepted. Use the provided URL to install the private app.',
          family: { id: family.id, name: family.name },
          expiresAt: invitation.expiresAt,
          downloadUrl: `/download/${token}/HouseholdChoresTracker.ipa`
        });
      }

      if (req.method === 'GET' && req.url.startsWith('/download/')) {
        const match = req.url.match(/^\/download\/([a-f0-9]+)\/HouseholdChoresTracker\.ipa$/);
        if (!match) return json(res, 404, { error: 'Not found' });
        const token = match[1];
        const store = loadStore();
        const invitation = lookupInvitation(store, token);
        if (!isInvitationActive(invitation)) return json(res, 403, { error: 'Invitation is invalid or expired' });

        const deviceId = req.headers['x-device-id'];
        const deviceName = req.headers['x-device-name'];
        if (deviceId) {
          const existing = store.devices.find((d) => d.deviceId === deviceId);
          if (!existing) {
            store.devices.push({
              id: nextId(store, 'device'),
              familyId: invitation.familyId,
              invitationId: invitation.id,
              deviceId,
              name: deviceName || 'Unnamed iPhone',
              enrolledAt: Date.now(),
              status: 'active'
            });
          }
        }

        invitation.remainingInstalls -= 1;
        if (invitation.remainingInstalls <= 0) invitation.status = 'consumed';
        saveStore(store);

        res.writeHead(200, {
          'Content-Type': resolveMimeType(INSTALLABLE_FILE),
          'Content-Disposition': 'attachment; filename="HouseholdChoresTracker.ipa"'
        });
        return res.end(fs.readFileSync(INSTALLABLE_FILE));
      }

      if (req.method === 'GET' && req.url === '/api/me') {
        const auth = readFamilyAuth(req, res);
        if (!auth) return;
        const store = loadStore();
        const user = store.users.find((u) => u.id === auth.userId && u.familyId === auth.familyId);
        const family = store.families.find((f) => f.id === auth.familyId);
        return json(res, 200, { user: sanitizeUser(user), family });
      }

      if (req.method === 'GET' && req.url === '/api/members') {
        const auth = readFamilyAuth(req, res);
        if (!auth) return;
        const store = loadStore();
        return json(res, 200, store.members.filter((m) => m.familyId === auth.familyId));
      }

      if (req.method === 'POST' && req.url === '/api/members') {
        const auth = readFamilyAuth(req, res);
        if (!auth) return;
        const { name, role } = await parseBody(req);
        if (!name) return json(res, 400, { error: 'name is required' });
        const store = loadStore();
        const member = { id: nextId(store, 'member'), familyId: auth.familyId, name, role: role || 'Member' };
        store.members.push(member);
        saveStore(store);
        return json(res, 201, member);
      }

      if (req.method === 'GET' && req.url === '/api/chores') {
        const auth = readFamilyAuth(req, res);
        if (!auth) return;
        const store = loadStore();
        return json(res, 200, store.chores.filter((c) => c.familyId === auth.familyId));
      }

      if (req.method === 'POST' && req.url === '/api/chores') {
        const auth = readFamilyAuth(req, res);
        if (!auth) return;
        const { title, estimatedMinutes } = await parseBody(req);
        if (!title || !estimatedMinutes) return json(res, 400, { error: 'title and estimatedMinutes are required' });
        const store = loadStore();
        const chore = {
          id: nextId(store, 'chore'),
          familyId: auth.familyId,
          title,
          estimatedMinutes: Number(estimatedMinutes),
          source: 'custom'
        };
        store.chores.push(chore);
        saveStore(store);
        return json(res, 201, chore);
      }

      if (req.method === 'GET' && req.url === '/api/schedules') {
        const auth = readFamilyAuth(req, res);
        if (!auth) return;
        const store = loadStore();
        const schedules = store.schedules
          .filter((s) => s.familyId === auth.familyId)
          .map((s) => ({ ...s, assignments: store.assignments.filter((a) => a.scheduleId === s.id) }));
        return json(res, 200, schedules);
      }

      if (req.method === 'POST' && req.url === '/api/schedules') {
        const auth = readFamilyAuth(req, res);
        if (!auth) return;
        const { name, date, assignments } = await parseBody(req);
        if (!name || !date || !Array.isArray(assignments)) {
          return json(res, 400, { error: 'name, date and assignments array are required' });
        }
        const store = loadStore();
        for (const assignment of assignments) {
          const member = store.members.find((m) => m.id === assignment.memberId && m.familyId === auth.familyId);
          const chore = store.chores.find((c) => c.id === assignment.choreId && c.familyId === auth.familyId);
          if (!member || !chore) {
            return json(res, 400, { error: 'Each assignment must reference a valid family member and chore' });
          }
        }
        const schedule = { id: nextId(store, 'schedule'), familyId: auth.familyId, name, date };
        store.schedules.push(schedule);
        assignments.forEach((assignment) => {
          store.assignments.push({
            id: nextId(store, 'assignment'),
            familyId: auth.familyId,
            scheduleId: schedule.id,
            memberId: assignment.memberId,
            choreId: assignment.choreId,
            status: assignment.status || 'pending'
          });
        });
        saveStore(store);
        return json(res, 201, {
          ...schedule,
          assignments: store.assignments.filter((a) => a.scheduleId === schedule.id)
        });
      }

      if (req.method === 'GET' && req.url === '/api/admin/families') {
        const auth = readAdminAuth(req, res);
        if (!auth) return;
        const store = loadStore();
        const families = store.families.map((family) => ({
          ...family,
          membersCount: store.members.filter((m) => m.familyId === family.id).length,
          devicesCount: store.devices.filter((d) => d.familyId === family.id).length
        }));
        return json(res, 200, families);
      }

      if (req.method === 'GET' && req.url === '/api/admin/devices') {
        const auth = readAdminAuth(req, res);
        if (!auth) return;
        const store = loadStore();
        return json(res, 200, store.devices);
      }

      if (req.method === 'POST' && req.url === '/api/admin/invitations') {
        const auth = readAdminAuth(req, res);
        if (!auth) return;
        const { familyId, expiresHours = 24, maxInstalls = 1 } = await parseBody(req);
        const store = loadStore();
        const family = store.families.find((entry) => entry.id === Number(familyId));
        if (!family) return json(res, 404, { error: 'Family not found' });

        const invitation = {
          id: nextId(store, 'invitation'),
          familyId: family.id,
          token: createInviteToken(),
          status: 'active',
          remainingInstalls: Number(maxInstalls),
          createdAt: Date.now(),
          expiresAt: Date.now() + Number(expiresHours) * 60 * 60 * 1000
        };
        store.installInvitations.push(invitation);
        saveStore(store);

        return json(res, 201, {
          invitationId: invitation.id,
          familyId: family.id,
          installLink: `/install/${invitation.token}`,
          expiresAt: invitation.expiresAt,
          remainingInstalls: invitation.remainingInstalls
        });
      }

      return json(res, 404, { error: 'Not found' });
    } catch (error) {
      return json(res, 500, { error: error.message || 'Server error' });
    }
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => console.log(`Chores tracker listening at http://localhost:${PORT}`));
}

module.exports = { createServer, DEFAULT_CHORES, initialStore, hashPassword, verifyPassword };
