const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
process.env.ADMIN_PORTAL_KEY = 'test-admin-key';
const { createServer, DEFAULT_CHORES } = require('../server');

const dataFile = path.join(__dirname, '..', 'data', 'store.json');

let server;
let baseUrl;

test.before(async () => {
  if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
  server = createServer().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
});

async function request(pathname, method = 'GET', body, token, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  return { status: response.status, body: payload };
}

test('full functional flow including private install and device management', async () => {
  const registerA = await request('/api/register', 'POST', {
    displayName: 'Alice',
    familyName: 'Alpha',
    email: 'alice@example.com',
    password: 'test1234'
  });
  assert.equal(registerA.status, 201);
  const tokenA = registerA.body.token;

  const choresA = await request('/api/chores', 'GET', null, tokenA);
  assert.equal(choresA.status, 200);
  assert.equal(choresA.body.length, DEFAULT_CHORES.length);

  await request('/api/members', 'POST', { name: 'Kid 1', role: 'Child' }, tokenA);
  const membersA = await request('/api/members', 'GET', null, tokenA);
  const owner = membersA.body.find((member) => member.role === 'Owner');

  const addChore = await request('/api/chores', 'POST', {
    title: 'Take out trash',
    estimatedMinutes: 7
  }, tokenA);
  assert.equal(addChore.status, 201);

  const createSchedule = await request('/api/schedules', 'POST', {
    name: 'Monday Plan',
    date: '2026-01-05',
    assignments: [{ memberId: owner.id, choreId: addChore.body.id }]
  }, tokenA);
  assert.equal(createSchedule.status, 201);

  const registerB = await request('/api/register', 'POST', {
    displayName: 'Bob',
    familyName: 'Beta',
    email: 'bob@example.com',
    password: 'test1234'
  });
  assert.equal(registerB.status, 201);
  const tokenB = registerB.body.token;

  const crossFamily = await request('/api/schedules', 'POST', {
    name: 'Invalid cross-family',
    date: '2026-01-06',
    assignments: [{ memberId: 1, choreId: addChore.body.id }]
  }, tokenB);
  assert.equal(crossFamily.status, 400);

  const adminBadLogin = await request('/api/admin/login', 'POST', { adminKey: 'wrong' });
  assert.equal(adminBadLogin.status, 401);

  const adminLogin = await request('/api/admin/login', 'POST', { adminKey: 'test-admin-key' });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.token;

  const families = await request('/api/admin/families', 'GET', null, adminToken);
  assert.equal(families.status, 200);
  assert.equal(families.body.length, 2);

  const invite = await request('/api/admin/invitations', 'POST', {
    familyId: registerA.body.family.id,
    maxInstalls: 1,
    expiresHours: 4
  }, adminToken);
  assert.equal(invite.status, 201);
  assert.ok(invite.body.installLink.startsWith('/install/'));

  const installInfo = await request(invite.body.installLink, 'GET');
  assert.equal(installInfo.status, 200);
  assert.ok(installInfo.body.downloadUrl.includes('/download/'));

  const download = await request(
    installInfo.body.downloadUrl,
    'GET',
    null,
    null,
    { 'x-device-id': 'iphone-001', 'x-device-name': 'Kitchen iPhone' }
  );
  assert.equal(download.status, 200);
  assert.match(download.body, /placeholder/i);

  const downloadAgain = await request(installInfo.body.downloadUrl, 'GET');
  assert.equal(downloadAgain.status, 403);

  const devices = await request('/api/admin/devices', 'GET', null, adminToken);
  assert.equal(devices.status, 200);
  assert.equal(devices.body.length, 1);
  assert.equal(devices.body[0].deviceId, 'iphone-001');
});
