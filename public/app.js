const state = {
  token: localStorage.getItem('token') || null,
  members: [],
  chores: []
};

const authSection = document.getElementById('auth');
const appSection = document.getElementById('app');
const familyHeading = document.getElementById('familyHeading');
const message = document.getElementById('message');

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

function renderMembers() {
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = state.members.map((member) => `<li>${member.name} (${member.role})</li>`).join('');

  const scheduleMember = document.getElementById('scheduleMember');
  scheduleMember.innerHTML = state.members
    .map((member) => `<option value="${member.id}">${member.name}</option>`)
    .join('');
}

function renderChores() {
  const choresList = document.getElementById('choresList');
  choresList.innerHTML = state.chores
    .map((chore) => `<li>${chore.title} - ${chore.estimatedMinutes} min (${chore.source})</li>`)
    .join('');

  const scheduleChore = document.getElementById('scheduleChore');
  scheduleChore.innerHTML = state.chores
    .map((chore) => `<option value="${chore.id}">${chore.title}</option>`)
    .join('');
}

function renderSchedules(schedules) {
  const target = document.getElementById('schedulesList');

  if (!schedules.length) {
    target.innerHTML = '<p>No schedules created yet.</p>';
    return;
  }

  target.innerHTML = schedules
    .map((schedule) => {
      const details = schedule.assignments
        .map((assignment) => {
          const member = state.members.find((item) => item.id === assignment.memberId);
          const chore = state.chores.find((item) => item.id === assignment.choreId);
          return `<li>${member?.name || 'Unknown'}: ${chore?.title || 'Unknown chore'} (${assignment.status})</li>`;
        })
        .join('');

      return `<article><h4>${schedule.name} (${schedule.date})</h4><ul>${details}</ul></article>`;
    })
    .join('');
}

async function loadData() {
  const profile = await api('/api/me');
  familyHeading.textContent = `Family: ${profile.family.name}`;

  state.members = await api('/api/members');
  state.chores = await api('/api/chores');
  const schedules = await api('/api/schedules');

  renderMembers();
  renderChores();
  renderSchedules(schedules);
}

function setAuthedUi(isAuthed) {
  authSection.classList.toggle('hidden', isAuthed);
  appSection.classList.toggle('hidden', !isAuthed);
}

document.getElementById('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));

  try {
    const result = await api('/api/register', 'POST', payload);
    state.token = result.token;
    localStorage.setItem('token', state.token);
    setAuthedUi(true);
    await loadData();
    setMessage('Account created and logged in.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));

  try {
    const result = await api('/api/login', 'POST', payload);
    state.token = result.token;
    localStorage.setItem('token', state.token);
    setAuthedUi(true);
    await loadData();
    setMessage('Logged in.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('memberForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));

  try {
    await api('/api/members', 'POST', payload);
    event.target.reset();
    await loadData();
    setMessage('Member added.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('choreForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));
  payload.estimatedMinutes = Number(payload.estimatedMinutes);

  try {
    await api('/api/chores', 'POST', payload);
    event.target.reset();
    await loadData();
    setMessage('Chore added.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('scheduleForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));

  try {
    await api('/api/schedules', 'POST', {
      name: payload.name,
      date: payload.date,
      assignments: [
        {
          choreId: Number(payload.choreId),
          memberId: Number(payload.memberId)
        }
      ]
    });
    event.target.reset();
    await loadData();
    setMessage('Schedule created.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('loadDataBtn').addEventListener('click', async () => {
  try {
    await loadData();
    setMessage('Data refreshed.');
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
    await loadData();
  } catch {
    localStorage.removeItem('token');
    state.token = null;
    setAuthedUi(false);
  }
})();
