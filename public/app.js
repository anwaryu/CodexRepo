// API URL
const API_URL = '';

// State
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let familyMembers = [];
let chores = [];
let defaultChores = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (token && currentUser) {
        showMainSection();
    } else {
        showAuthSection();
    }
});

// Auth functions
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMessage('Login successful!', 'success');
            showMainSection();
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const familyName = document.getElementById('register-family-name').value;

    if (!username || !email || !password || !familyName) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, familyName })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMessage('Registration successful!', 'success');
            showMainSection();
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuthSection();
    showMessage('Logged out successfully', 'success');
}

// Section switching
function showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('main-section').style.display = 'none';
}

function showMainSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    document.getElementById('user-info').textContent = `Welcome, ${currentUser.username}!`;
    loadFamily();
    loadFamilyMembers();
    loadChores();
    loadDefaultChores();
}

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}-tab`).style.display = 'block';

    // Add active class to clicked button
    event.target.classList.add('active');
}

// Family functions
async function loadFamily() {
    try {
        const response = await fetch(`${API_URL}/api/family`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const family = await response.json();
            document.getElementById('family-name').textContent = family.name;
        }
    } catch (error) {
        console.error('Error loading family:', error);
    }
}

// Family Members functions
async function loadFamilyMembers() {
    try {
        const response = await fetch(`${API_URL}/api/family-members`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            familyMembers = await response.json();
            renderFamilyMembers();
            updateMemberSelect();
        }
    } catch (error) {
        showMessage('Error loading family members', 'error');
    }
}

function renderFamilyMembers() {
    const list = document.getElementById('members-list');
    
    if (familyMembers.length === 0) {
        list.innerHTML = '<p class="info-text">No family members yet. Add your first member!</p>';
        return;
    }

    list.innerHTML = familyMembers.map(member => `
        <div class="list-item">
            <div class="item-info">
                <div class="item-name">👤 ${member.name}</div>
            </div>
            <div class="item-actions">
                <button class="btn-delete" onclick="deleteFamilyMember(${member.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function updateMemberSelect() {
    const select = document.getElementById('chore-member');
    select.innerHTML = '<option value="">Unassigned</option>' + 
        familyMembers.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
}

async function addFamilyMember() {
    const name = document.getElementById('member-name').value;

    if (!name) {
        showMessage('Please enter a name', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/family-members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            document.getElementById('member-name').value = '';
            showMessage('Family member added!', 'success');
            loadFamilyMembers();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Error adding family member', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function deleteFamilyMember(id) {
    if (!confirm('Are you sure you want to delete this family member?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/family-members/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showMessage('Family member deleted', 'success');
            loadFamilyMembers();
            loadChores(); // Refresh chores as assignments may have changed
        } else {
            const data = await response.json();
            showMessage(data.error || 'Error deleting family member', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Chores functions
async function loadChores() {
    try {
        const response = await fetch(`${API_URL}/api/chores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            chores = await response.json();
            renderChores();
        }
    } catch (error) {
        showMessage('Error loading chores', 'error');
    }
}

function renderChores() {
    const list = document.getElementById('chores-list');
    const showPending = document.getElementById('filter-pending').checked;
    const showCompleted = document.getElementById('filter-completed').checked;

    const filteredChores = chores.filter(chore => {
        if (chore.status === 'pending' && showPending) return true;
        if (chore.status === 'completed' && showCompleted) return true;
        return false;
    });

    if (filteredChores.length === 0) {
        list.innerHTML = '<p class="info-text">No chores found. Add your first chore!</p>';
        return;
    }

    list.innerHTML = filteredChores.map(chore => `
        <div class="list-item ${chore.status === 'completed' ? 'completed' : ''}">
            <div class="item-info">
                <div class="item-name">✓ ${chore.name}</div>
                <div class="item-details">
                    <span class="item-badge time">⏱️ ${chore.estimated_minutes} min</span>
                    ${chore.assigned_to ? `<span class="item-badge assigned">👤 ${chore.assigned_to}</span>` : ''}
                    ${chore.schedule ? `<span class="item-badge schedule">📅 ${chore.schedule}</span>` : ''}
                    <span class="item-badge">${chore.status}</span>
                </div>
            </div>
            <div class="item-actions">
                ${chore.status === 'pending' 
                    ? `<button class="btn-complete" onclick="updateChoreStatus(${chore.id}, 'completed')">Complete</button>`
                    : `<button class="btn-pending" onclick="updateChoreStatus(${chore.id}, 'pending')">Mark Pending</button>`
                }
                <button class="btn-delete" onclick="deleteChore(${chore.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addChore() {
    const name = document.getElementById('chore-name').value;
    const estimated_minutes = document.getElementById('chore-minutes').value;
    const family_member_id = document.getElementById('chore-member').value;
    const schedule = document.getElementById('chore-schedule').value;

    if (!name || !estimated_minutes) {
        showMessage('Please enter chore name and estimated time', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/chores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                estimated_minutes: parseInt(estimated_minutes),
                family_member_id: family_member_id || null,
                schedule: schedule || null
            })
        });

        if (response.ok) {
            document.getElementById('chore-name').value = '';
            document.getElementById('chore-minutes').value = '';
            document.getElementById('chore-member').value = '';
            document.getElementById('chore-schedule').value = '';
            showMessage('Chore added!', 'success');
            loadChores();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Error adding chore', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function updateChoreStatus(id, status) {
    try {
        const response = await fetch(`${API_URL}/api/chores/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            showMessage(`Chore marked as ${status}!`, 'success');
            loadChores();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Error updating chore', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function deleteChore(id) {
    if (!confirm('Are you sure you want to delete this chore?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/chores/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showMessage('Chore deleted', 'success');
            loadChores();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Error deleting chore', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Default Chores functions
async function loadDefaultChores() {
    try {
        const response = await fetch(`${API_URL}/api/default-chores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            defaultChores = await response.json();
            renderDefaultChores();
        }
    } catch (error) {
        showMessage('Error loading default chores', 'error');
    }
}

function renderDefaultChores() {
    const list = document.getElementById('default-chores-list');

    list.innerHTML = defaultChores.map(chore => `
        <div class="list-item">
            <div class="item-info">
                <div class="item-name">📋 ${chore.name}</div>
                <div class="item-details">
                    <span class="item-badge time">⏱️ ${chore.estimated_minutes} min</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-use-template" onclick="useDefaultChore(${chore.id})">Use Template</button>
            </div>
        </div>
    `).join('');
}

function useDefaultChore(id) {
    const chore = defaultChores.find(c => c.id === id);
    if (chore) {
        document.getElementById('chore-name').value = chore.name;
        document.getElementById('chore-minutes').value = chore.estimated_minutes;
        showTab('chores');
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-button')[0].classList.add('active');
        showMessage('Template loaded! Assign to a family member and add.', 'success');
    }
}

// Utility functions
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}
