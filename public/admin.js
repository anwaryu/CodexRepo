const state = {
  token: localStorage.getItem('adminToken') || null
};

const authSection = document.getElementById('adminAuth');
const panelSection = document.getElementById('adminPanel');
const message = document.getElementById('message');
const inviteResult = document.getElementById('inviteResult');

function setMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? '#fca5a5' : '#86efac';
}

async function api(path, method = 'GET', body) {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

function setAuthedUi(isAuthed) {
  authSection.classList.toggle('hidden', isAuthed);
  panelSection.classList.toggle('hidden', !isAuthed);
}

function renderFamilies(families) {
  document.getElementById('familiesList').innerHTML = families
    .map((family) => `<li>#${family.id} ${family.name} — members: ${family.membersCount}, devices: ${family.devicesCount}</li>`)
    .join('');
}

function renderDevices(devices) {
  const target = document.getElementById('devicesList');
  if (!devices.length) {
    target.innerHTML = '<li>No enrolled devices yet.</li>';
    return;
  }

  target.innerHTML = devices
    .map((device) => `<li>${device.name} (${device.deviceId}) — family #${device.familyId} — ${device.status}</li>`)
    .join('');
}

async function refreshAll() {
  const families = await api('/api/admin/families');
  const devices = await api('/api/admin/devices');
  renderFamilies(families);
  renderDevices(devices);
}

document.getElementById('adminLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));

  try {
    const result = await api('/api/admin/login', 'POST', payload);
    state.token = result.token;
    localStorage.setItem('adminToken', state.token);
    setAuthedUi(true);
    await refreshAll();
    setMessage('Admin logged in.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('inviteForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));
  payload.familyId = Number(payload.familyId);
  payload.expiresHours = Number(payload.expiresHours);
  payload.maxInstalls = Number(payload.maxInstalls);

  try {
    const result = await api('/api/admin/invitations', 'POST', payload);
    inviteResult.innerHTML = `Invitation link: <code>${result.installLink}</code>`;
    setMessage('Invitation created.');
    await refreshAll();
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('refreshFamiliesBtn').addEventListener('click', async () => {
  try {
    const families = await api('/api/admin/families');
    renderFamilies(families);
    setMessage('Families refreshed.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('refreshDevicesBtn').addEventListener('click', async () => {
  try {
    const devices = await api('/api/admin/devices');
    renderDevices(devices);
    setMessage('Devices refreshed.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

(async () => {
  if (!state.token) {
    setAuthedUi(false);
    return;
  }

  try {
    setAuthedUi(true);
    await refreshAll();
  } catch {
    localStorage.removeItem('adminToken');
    state.token = null;
    setAuthedUi(false);
  }
})();
