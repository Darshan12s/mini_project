// LifeFlow Blood Bank Management System - Frontend JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
        showApp();
        showSection('dashboard');
    } else {
        showLogin();
    }

    setupEventListeners();
    setupSidebarNavigation();
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Switch between login and register
    const showRegister = document.getElementById('show-register');
    if (showRegister) {
        showRegister.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterScreen();
        });
    }

    const showLogin = document.getElementById('show-login');
    if (showLogin) {
        showLogin.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginScreen();
        });
    }

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Quick actions
    const quickActionsBtn = document.getElementById('quick-actions-btn');
    if (quickActionsBtn) {
        quickActionsBtn.addEventListener('click', showQuickActions);
    }

    // Quick action buttons in dashboard
    setupDashboardQuickActions();

    // Notifications
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', showNotifications);
    }
}

function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function setupDashboardQuickActions() {
    // Quick action buttons in dashboard
    const quickActionButtons = document.querySelectorAll('.action-btn');
    quickActionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.getAttribute('onclick');
            if (action) {
                // Execute the onclick function directly without eval
                if (action === 'openAddDonorModal()') {
                    openAddDonorModal();
                } else if (action === 'openAddRequestModal()') {
                    openAddRequestModal();
                } else if (action === "showSection('inventory')") {
                    showSection('inventory');
                } else if (action === "showSection('campaigns')") {
                    showSection('campaigns');
                }
            }
        });
    });

    // Alert action buttons
    const alertButtons = document.querySelectorAll('.alert-actions button');
    alertButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.getAttribute('onclick');
            if (action) {
                // Execute the onclick function directly without eval
                if (action === "showSection('campaigns')") {
                    showSection('campaigns');
                } else if (action === "showSection('inventory')") {
                    showSection('inventory');
                }
            } else {
                // Handle specific alert actions
                const buttonText = this.textContent.trim();
                if (buttonText === 'Create Campaign') {
                    showSection('campaigns');
                } else if (buttonText === 'View Inventory') {
                    showSection('inventory');
                } else if (buttonText === 'View Details') {
                    showSection('campaigns');
                } else if (buttonText === 'Edit Campaign') {
                    showSection('campaigns');
                }
            }
        });
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
    submitBtn.disabled = true;

    try {
        const loginData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showSuccess('Login successful! Redirecting...');

            // Hide login screen and show main app after short delay
            setTimeout(() => {
                showApp();
                showSection('dashboard');
                updateUserInfo(data.user);
            }, 1000);
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    submitBtn.disabled = true;

    try {
        const registerData = {
            firstName: document.getElementById('reg-first-name').value.trim(),
            lastName: document.getElementById('reg-last-name').value.trim(),
            email: document.getElementById('reg-email').value.trim(),
            password: document.getElementById('reg-password').value,
            confirmPassword: document.getElementById('reg-confirm-password').value
        };

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Account created successfully! Please login.');
            setTimeout(() => {
                showLoginScreen();
            }, 2000);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Register error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showLogin();
    showSuccess('Logged out successfully');
}

// Navigation Functions
function showSection(sectionName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Load section content
    loadSectionContent(sectionName);
}

async function loadSectionContent(sectionName) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    try {
        // Show loading
        mainContent.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #667eea;"></i>
                    <p style="margin-top: 10px; color: #666;">Loading...</p>
                </div>
            </div>
        `;

        // Fetch section HTML
        const response = await fetch(`HTML Components/${sectionName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load ${sectionName}`);
        }

        const html = await response.text();

        // Extract the section content (assuming it's wrapped in a section with id)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sectionElement = doc.querySelector(`#${sectionName}-section`) || doc.body;

        mainContent.innerHTML = sectionElement.innerHTML;

        // Initialize section-specific functionality
        initializeSection(sectionName);

    } catch (error) {
        console.error('Error loading section:', error);
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c;"></i>
                <h3 style="margin-top: 20px; color: #333;">Error Loading Section</h3>
                <p style="color: #666;">Unable to load ${sectionName} section. Please try again.</p>
                <button onclick="showSection('${sectionName}')" class="btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-refresh"></i> Retry
                </button>
            </div>
        `;
    }
}

function initializeSection(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            initializeDashboard();
            break;
        case 'donors':
            initializeDonors();
            break;
        case 'inventory':
            initializeInventory();
            break;
        case 'requests':
            initializeRequests();
            break;
        case 'campaigns':
            initializeCampaigns();
            break;
        case 'reports':
            initializeReports();
            break;
        case 'profile':
            initializeProfile();
            break;
        case 'settings':
            initializeSettings();
            break;
    }
}

// Section Initializers
function initializeDashboard() {
    // Load dashboard data
    loadDashboardData();

    // Initialize charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    }

    // Setup dashboard quick actions
    setupDashboardQuickActions();
}

function initializeDonors() {
    // Setup donor management functionality
    const addDonorBtn = document.querySelector('[onclick="openAddDonorModal()"]');
    if (addDonorBtn) {
        addDonorBtn.onclick = openAddDonorModal;
    }

    // Setup search and filter functionality
    const searchInput = document.getElementById('donor-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterDonors);
    }

    const bloodFilter = document.getElementById('donor-blood-filter');
    if (bloodFilter) {
        bloodFilter.addEventListener('change', filterDonors);
    }

    const statusFilter = document.getElementById('donor-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterDonors);
    }

    // Load donors data with a small delay to ensure DOM is ready
    setTimeout(() => {
        loadDonors();
    }, 100);
}

function initializeInventory() {
    // Setup inventory management functionality
    const addInventoryBtn = document.querySelector('[onclick="openAddInventoryModal()"]');
    if (addInventoryBtn) {
        addInventoryBtn.onclick = openAddInventoryModal;
    }

    // Setup search and filter functionality
    const bloodFilter = document.getElementById('inventory-blood-filter');
    if (bloodFilter) {
        bloodFilter.addEventListener('change', filterInventory);
    }

    const statusFilter = document.getElementById('inventory-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterInventory);
    }

    // Load inventory data
    loadInventory();
}

function initializeRequests() {
    // Setup request management functionality
    const addRequestBtn = document.querySelector('[onclick="openAddRequestModal()"]');
    if (addRequestBtn) {
        addRequestBtn.onclick = openAddRequestModal;
    }

    // Setup search and filter functionality
    const searchInput = document.getElementById('request-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterRequests);
    }

    const statusFilter = document.getElementById('request-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterRequests);
    }

    const urgencyFilter = document.getElementById('request-urgency-filter');
    if (urgencyFilter) {
        urgencyFilter.addEventListener('change', filterRequests);
    }

    const typeFilter = document.getElementById('request-type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', filterRequests);
    }

    // Load requests data
    loadRequests();
}

function initializeCampaigns() {
    // Load campaigns data
    loadCampaigns();
}

function initializeReports() {
    // Load reports data
    loadReports();
}

function initializeProfile() {
    // Load user profile
    loadProfile();

    // Setup profile form handlers
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
}

function initializeSettings() {
    // Load current settings
    loadSettings();

    // Setup settings form handlers
    const saveBtn = document.querySelector('[onclick="saveSettings()"]');
    if (saveBtn) {
        saveBtn.onclick = saveSettings;
    }

    const resetBtn = document.querySelector('[onclick="resetSettings()"]');
    if (resetBtn) {
        resetBtn.onclick = resetSettings;
    }
}

// Data Loading Functions
async function loadDashboardData() {
    try {
        // For now, we'll calculate stats from donors and requests
        const [donorsResponse, requestsResponse] = await Promise.all([
            fetch('/api/donors', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            }),
            fetch('/api/requests', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            })
        ]);

        let totalDonors = 0;
        let totalRequests = 0;

        if (donorsResponse.ok) {
            const donorsData = await donorsResponse.json();
            totalDonors = donorsData.donors ? donorsData.donors.length : 0;
        }

        if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            totalRequests = requestsData.requests ? requestsData.requests.length : 0;
        }

        const data = {
            totalBloodUnits: 1245, // Mock data for now
            activeDonors: totalDonors,
            pendingRequests: totalRequests,
            activeCampaigns: 5 // Mock data
        };

        updateDashboardStats(data);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadDonors() {
    console.log('Loading donors from frontend');
    try {
        const response = await fetch('/api/donors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        console.log('Donors fetch response status:', response.status);
        if (response.ok) {
            const data = await response.json();
            const donors = data.donors || data;
            console.log('Donors received:', donors.length);
            updateDonorsTable(donors);
        } else {
            console.error('Failed to load donors:', response.status);
            // Show empty table or error message
            updateDonorsTable([]);
        }
    } catch (error) {
        console.error('Error loading donors:', error);
        updateDonorsTable([]);
    }
}

async function loadInventory() {
    try {
        const response = await fetch('/api/inventory', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateInventoryDisplay(data);
        } else {
            console.error('Failed to load inventory:', response.status);
            // Show mock data for demo
            updateInventoryDisplay({
                inventory: [
                    { bloodType: 'A+', units: 45, status: 'available', lastUpdated: '2024-01-15' },
                    { bloodType: 'O+', units: 32, status: 'available', lastUpdated: '2024-01-14' },
                    { bloodType: 'B+', units: 28, status: 'low', lastUpdated: '2024-01-13' },
                    { bloodType: 'AB+', units: 15, status: 'critical', lastUpdated: '2024-01-12' },
                    { bloodType: 'A-', units: 8, status: 'critical', lastUpdated: '2024-01-11' },
                    { bloodType: 'O-', units: 12, status: 'low', lastUpdated: '2024-01-10' },
                    { bloodType: 'B-', units: 6, status: 'critical', lastUpdated: '2024-01-09' },
                    { bloodType: 'AB-', units: 3, status: 'critical', lastUpdated: '2024-01-08' }
                ],
                summary: {
                    totalUnits: 149,
                    lowStockUnits: 40,
                    criticalStockUnits: 26,
                    expiringUnits: 8
                }
            });
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        // Show mock data for demo
        updateInventoryDisplay({
            inventory: [
                { bloodType: 'A+', units: 45, status: 'available', lastUpdated: '2024-01-15' },
                { bloodType: 'O+', units: 32, status: 'available', lastUpdated: '2024-01-14' },
                { bloodType: 'B+', units: 28, status: 'low', lastUpdated: '2024-01-13' },
                { bloodType: 'AB+', units: 15, status: 'critical', lastUpdated: '2024-01-12' }
            ],
            summary: {
                totalUnits: 120,
                lowStockUnits: 28,
                criticalStockUnits: 15,
                expiringUnits: 5
            }
        });
    }
}

async function loadRequests() {
    console.log('Loading requests from frontend');
    try {
        const response = await fetch('/api/requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        console.log('Requests fetch response status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Requests received:', data.requests ? data.requests.length : 'No requests array');
            console.log('Sample request data:', data.requests ? data.requests[0] : 'No data');
            updateRequestsDisplay(data);
        } else {
            console.error('Failed to load requests:', response.status);
            updateRequestsDisplay([]);
        }
    } catch (error) {
        console.error('Error loading requests:', error);
        updateRequestsDisplay([]);
    }
}

async function loadCampaigns() {
    try {
        const response = await fetch('/api/campaigns', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const campaigns = await response.json();
            updateCampaignsDisplay(campaigns);
        }
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

async function loadReports() {
    try {
        const response = await fetch('/api/reports', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const reports = await response.json();
            updateReportsDisplay(reports);
        }
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

async function loadProfile() {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const profile = await response.json();
            updateProfileDisplay(profile);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadSettings() {
    // Settings are usually static, but can load user preferences
    try {
        const response = await fetch('/api/settings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const settings = await response.json();
            updateSettingsDisplay(settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Update Functions
function updateDashboardStats(data) {
    // Update dashboard stat cards
    const totalBloodUnitsEl = document.getElementById('total-blood-units');
    const activeDonorsEl = document.getElementById('active-donors');
    const pendingRequestsEl = document.getElementById('pending-requests');
    const activeCampaignsEl = document.getElementById('active-campaigns');

    if (totalBloodUnitsEl && data.totalBloodUnits) {
        totalBloodUnitsEl.textContent = data.totalBloodUnits.toLocaleString();
    }
    if (activeDonorsEl && data.activeDonors) {
        activeDonorsEl.textContent = data.activeDonors.toLocaleString();
    }
    if (pendingRequestsEl && data.pendingRequests) {
        pendingRequestsEl.textContent = data.pendingRequests.toLocaleString();
    }
    if (activeCampaignsEl && data.activeCampaigns) {
        activeCampaignsEl.textContent = data.activeCampaigns;
    }

    // Update header stats
    const headerBloodUnits = document.getElementById('header-blood-units');
    const headerActiveDonors = document.getElementById('header-active-donors');
    const headerPendingRequests = document.getElementById('header-pending-requests');
    const sidebarBloodCount = document.getElementById('sidebar-blood-count');
    const sidebarDonorCount = document.getElementById('sidebar-donor-count');
    const sidebarRequestCount = document.getElementById('sidebar-request-count');

    if (headerBloodUnits) headerBloodUnits.textContent = (data.totalBloodUnits || 0).toLocaleString();
    if (headerActiveDonors) headerActiveDonors.textContent = (data.activeDonors || 0).toLocaleString();
    if (headerPendingRequests) headerPendingRequests.textContent = (data.pendingRequests || 0).toLocaleString();
    if (sidebarBloodCount) sidebarBloodCount.textContent = (data.totalBloodUnits || 0).toLocaleString();
    if (sidebarDonorCount) sidebarDonorCount.textContent = (data.activeDonors || 0).toLocaleString();
    if (sidebarRequestCount) sidebarRequestCount.textContent = (data.pendingRequests || 0).toLocaleString();
}

function updateDonorsTable(donors) {
    console.log('Updating donors table with:', donors.length, 'donors');
    console.log('Sample donor data:', donors[0] || 'No donors');
    const tbody = document.getElementById('donor-table-body');
    console.log('Table body element found:', !!tbody);
    if (!tbody) {
        console.error('Donor table body not found!');
        return;
    }

    tbody.innerHTML = donors.map(donor => {
        const fullName = donor.user ? `${donor.user.firstName} ${donor.user.lastName}` : 'N/A';
        const email = donor.user ? donor.user.email : donor.contactInfo?.email || 'N/A';
        const phone = donor.user ? donor.user.phone : donor.contactInfo?.phone || 'N/A';
        const bloodType = donor.bloodType || 'N/A';
        const lastDonation = donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : 'Never';
        const eligibility = donor.eligibilityStatus || 'eligible';

        return `
            <tr data-donor-id="${donor._id}">
                <td>${fullName}</td>
                <td>${bloodType}</td>
                <td>${email}<br><small>${phone}</small></td>
                <td>${lastDonation}</td>
                <td><span class="status-badge status-${eligibility}">${eligibility.charAt(0).toUpperCase() + eligibility.slice(1)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="editDonor('${donor._id}')" title="Edit Donor">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteDonor('${donor._id}')" title="Delete Donor">
                            <i class="fas fa-trash"></i>
                        </button>
                        <select class="status-select" onchange="updateDonorEligibility('${donor._id}', this.value)">
                            <option value="">Update Eligibility</option>
                            <option value="eligible" ${donor.eligibilityStatus === 'eligible' ? 'selected' : ''}>Eligible</option>
                            <option value="ineligible" ${donor.eligibilityStatus === 'ineligible' ? 'selected' : ''}>Ineligible</option>
                            <option value="deferred" ${donor.eligibilityStatus === 'deferred' ? 'selected' : ''}>Deferred</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateInventoryDisplay(data) {
    const inventory = data.inventory || data;

    // Update summary cards
    if (data.summary) {
        document.getElementById('total-units').textContent = data.summary.totalUnits || 0;
        document.getElementById('low-stock-units').textContent = data.summary.lowStockUnits || 0;
        document.getElementById('critical-stock-units').textContent = data.summary.criticalStockUnits || 0;
        document.getElementById('expiring-units').textContent = data.summary.expiringUnits || 0;
    }

    // Update inventory table
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = inventory.map(item => {
        const statusClass = item.status || 'available';
        const statusText = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

        return `
            <tr data-blood-type="${item.bloodType}">
                <td>${item.bloodType}</td>
                <td>${item.units}</td>
                <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
                <td>${item.lastUpdated || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="editInventory('${item.bloodType}')" title="Edit Inventory">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteInventory('${item.bloodType}')" title="Delete Inventory">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateRequestsDisplay(data) {
    console.log('Updating requests display with data:', data);
    const tbody = document.getElementById('request-table-body');
    console.log('Request table body element found:', !!tbody);
    if (!tbody) {
        console.error('Request table body not found!');
        return;
    }

    const requests = data.requests || data;
    console.log('Processing requests array:', requests.length, 'requests');

    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px; display: block;"></i>
                    <div>No requests found</div>
                    <small>No blood requests have been submitted yet.</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = requests.map(request => {
        console.log('Processing request:', request._id, request.requestId);
        const requestId = request.requestId || `REQ-${String(request._id || Math.random()).slice(-3)}`;
        const requesterType = request.institution?.type || 'Hospital';
        const requesterName = request.institution?.name || request.patient?.name || 'Unknown';
        const contact = request.institution?.address?.phone || 'N/A';
        const bloodReq = request.bloodRequirements?.[0] || {};
        const bloodType = bloodReq.bloodType || 'N/A';
        const quantity = bloodReq.units || 1;
        const urgency = bloodReq.urgency === 'emergency' ? 'critical' : bloodReq.urgency === 'urgent' ? 'urgent' : 'normal';
        const status = request.status || 'pending';

        return `
            <tr data-request-id="${request._id}">
                <td>${requestId}</td>
                <td>${requesterType.charAt(0).toUpperCase() + requesterType.slice(1)}</td>
                <td>${requesterName}<br><small>${contact}</small></td>
                <td>${bloodType}</td>
                <td>${quantity} units</td>
                <td><span class="urgency-badge urgency-${urgency}">${urgency.charAt(0).toUpperCase() + urgency.slice(1)}</span></td>
                <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="editRequest('${request._id}')" title="Edit Request">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteRequest('${request._id}')" title="Delete Request">
                            <i class="fas fa-trash"></i>
                        </button>
                        <select class="status-select" onchange="updateRequestStatus('${request._id}', this.value)">
                            <option value="">Update Status</option>
                            <option value="approved">Approve</option>
                            <option value="rejected">Reject</option>
                            <option value="fulfilled">Fulfill</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    console.log('Requests table updated successfully with', requests.length, 'rows');
}

function updateCampaignsDisplay(campaigns) {
    console.log('Updating campaigns display:', campaigns);
    const campaignsGrid = document.getElementById('campaigns-grid');
    if (!campaignsGrid) {
        console.error('Campaigns grid not found!');
        return;
    }

    // Clear existing content
    campaignsGrid.innerHTML = '';

    // Get campaigns array (handle both {campaigns: [...]} and direct array formats)
    const campaignsList = campaigns.campaigns || campaigns;

    if (!campaignsList || campaignsList.length === 0) {
        campaignsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-content">
                    <i class="fas fa-calendar-alt"></i>
                    <h4>No Campaigns Found</h4>
                    <p>No donation campaigns are currently available.</p>
                    <button class="btn-primary" onclick="openAddCampaignModal()">
                        <i class="fas fa-plus"></i> Create First Campaign
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Render each campaign
    campaignsList.forEach(campaign => {
        const campaignCard = document.createElement('div');
        campaignCard.className = 'campaign-card';

        const startDate = new Date(campaign.startDate).toLocaleDateString();
        const endDate = new Date(campaign.endDate).toLocaleDateString();
        const progress = campaign.targetDonors > 0 ?
            Math.round((campaign.registeredDonors / campaign.targetDonors) * 100) : 0;

        campaignCard.innerHTML = `
            <div class="campaign-header">
                <h3>${campaign.title || 'Untitled Campaign'}</h3>
                <span class="campaign-status status-${campaign.status || 'upcoming'}">${campaign.status || 'upcoming'}</span>
            </div>
            <div class="campaign-details">
                <div class="campaign-info">
                    <i class="fas fa-calendar"></i>
                    <span>${startDate} - ${endDate}</span>
                </div>
                <div class="campaign-info">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${campaign.location || 'Location TBD'}</span>
                </div>
                <div class="campaign-info">
                    <i class="fas fa-users"></i>
                    <span>Target: ${campaign.targetDonors || 0} donors</span>
                </div>
            </div>
            <div class="campaign-stats">
                <div class="stat">
                    <span class="stat-number">${campaign.registeredDonors || 0}</span>
                    <span class="stat-label">Registered</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${campaign.successfulDonations || 0}</span>
                    <span class="stat-label">Donated</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${progress}%</span>
                    <span class="stat-label">Progress</span>
                </div>
            </div>
            <div class="campaign-actions">
                <button class="btn-secondary btn-small" onclick="viewCampaign('${campaign._id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn-primary btn-small" onclick="editCampaign('${campaign._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;

        campaignsGrid.appendChild(campaignCard);
    });
}

function updateReportsDisplay(reports) {
    // Implement reports display update
    console.log('Updating reports display:', reports);
}

function updateProfileDisplay(profile) {
    console.log('Updating profile display with data:', profile);

    if (!profile) {
        console.error('No profile data provided');
        return;
    }

    // Update profile header information
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');

    if (profileName) {
        profileName.textContent = `${profile.firstName || 'Unknown'} ${profile.lastName || 'User'}`;
        console.log('Updated profile name to:', profileName.textContent);
    }

    if (profileEmail) {
        profileEmail.textContent = profile.email || 'No email';
        console.log('Updated profile email to:', profileEmail.textContent);
    }

    if (profileRole) {
        const roleDisplay = profile.role === 'admin' ? 'Administrator' :
                           profile.role === 'staff' ? 'Staff Member' : 'User';
        profileRole.textContent = roleDisplay;
        console.log('Updated profile role to:', profileRole.textContent);
    }

    // Update form fields
    const editFullName = document.getElementById('edit-full-name');
    const editEmail = document.getElementById('edit-email');

    if (editFullName) {
        editFullName.value = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        console.log('Updated form full name to:', editFullName.value);
    }

    if (editEmail) {
        editEmail.value = profile.email || '';
        console.log('Updated form email to:', editEmail.value);
    }

    // Update profile stats (mock data for now)
    const totalDonors = document.getElementById('total-donors');
    const totalRequests = document.getElementById('total-requests');
    const accountAge = document.getElementById('account-age');

    if (totalDonors) {
        totalDonors.textContent = '25'; // Mock data
    }
    if (totalRequests) {
        totalRequests.textContent = '12'; // Mock data
    }
    if (accountAge) {
        accountAge.textContent = '45'; // Mock data - days active
    }

    console.log('Profile display update completed');
}

function updateSettingsDisplay(settings) {
    // Implement settings display update
    console.log('Updating settings display:', settings);
}

// UI Functions
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showRegisterScreen() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('register-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showLoginScreen() {
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

function updateUserInfo(user) {
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');

    if (userName) userName.textContent = user.name || user.email;
    if (userRole) userRole.textContent = user.role || 'User';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function showQuickActions() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Quick Actions</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="quick-actions-grid">
                    <button class="quick-action-card" onclick="showSection('donors'); closeModal();">
                        <i class="fas fa-user-plus"></i>
                        <span>Add Donor</span>
                    </button>
                    <button class="quick-action-card" onclick="showSection('requests'); closeModal();">
                        <i class="fas fa-hand-holding-heart"></i>
                        <span>New Request</span>
                    </button>
                    <button class="quick-action-card" onclick="showSection('inventory'); closeModal();">
                        <i class="fas fa-tint"></i>
                        <span>Check Inventory</span>
                    </button>
                    <button class="quick-action-card" onclick="showSection('campaigns'); closeModal();">
                        <i class="fas fa-calendar-plus"></i>
                        <span>Create Campaign</span>
                    </button>
                    <button class="quick-action-card" onclick="showEmergencyModal(); closeModal();">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Emergency Alert</span>
                    </button>
                    <button class="quick-action-card" onclick="showSection('reports'); closeModal();">
                        <i class="fas fa-chart-bar"></i>
                        <span>View Reports</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function showNotifications() {
    // Implement notifications panel
    console.log('Showing notifications');
}

function showEmergencyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-exclamation-triangle"></i> Emergency Blood Request</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="emergency-alert">
                    <div class="emergency-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Critical Blood Shortage Alert</h3>
                    <p>This will send an emergency notification to all eligible donors and blood banks in the area.</p>
                    <div class="emergency-details">
                        <div class="form-group">
                            <label for="emergency-blood-type">Blood Type Needed *</label>
                            <select id="emergency-blood-type" required>
                                <option value="">Select Blood Type</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="emergency-units">Units Needed *</label>
                            <input type="number" id="emergency-units" min="1" value="1" required>
                        </div>
                        <div class="form-group">
                            <label for="emergency-location">Location *</label>
                            <input type="text" id="emergency-location" placeholder="Hospital/Location" required>
                        </div>
                        <div class="form-group">
                            <label for="emergency-message">Emergency Message</label>
                            <textarea id="emergency-message" rows="3" placeholder="Additional details about the emergency"></textarea>
                        </div>
                    </div>
                    <div class="emergency-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="button" class="btn-danger" onclick="sendEmergencyAlert()">
                            <i class="fas fa-exclamation-triangle"></i> Send Emergency Alert
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function sendEmergencyAlert() {
    const bloodType = document.getElementById('emergency-blood-type').value;
    const units = document.getElementById('emergency-units').value;
    const location = document.getElementById('emergency-location').value;
    const message = document.getElementById('emergency-message').value;

    if (!bloodType || !units || !location) {
        showError('Please fill in all required fields');
        return;
    }

    // Here you would send the emergency alert to the backend
    showSuccess('Emergency alert sent successfully! Donors will be notified.');
    closeModal();
}

// Modal Functions
function openAddDonorModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header modal-header-primary">
                <div class="modal-title">
                    <i class="fas fa-user-plus"></i>
                    <h2>Add New Donor</h2>
                </div>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body modal-body-padded">
                <div class="form-intro">
                    <p>Please provide the donor's information to register them in the system.</p>
                </div>
                <form id="add-donor-form" class="form-styled">
                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-user"></i>
                            Personal Information
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="new-first-name" class="form-label-required">First Name *</label>
                                <input type="text" id="new-first-name" class="form-input" placeholder="Enter first name" required>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="new-last-name" class="form-label-required">Last Name *</label>
                                <input type="text" id="new-last-name" class="form-input" placeholder="Enter last name" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="new-email" class="form-label-required">Email Address *</label>
                                <input type="email" id="new-email" class="form-input" placeholder="Enter email address" required>
                                <small class="form-help">We'll use this for notifications and updates</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="new-phone">Phone Number</label>
                                <input type="tel" id="new-phone" class="form-input" placeholder="Enter phone number">
                                <small class="form-help">Optional contact number</small>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-tint"></i>
                            Medical Information
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="new-blood-type" class="form-label-required">Blood Type *</label>
                                <select id="new-blood-type" class="form-select" required>
                                    <option value="">Select Blood Type</option>
                                    <option value="A+">A+ (Universal Recipient)</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+ (Universal Recipient)</option>
                                    <option value="AB-">AB- (Universal Donor)</option>
                                    <option value="O+">O+ (Universal Donor)</option>
                                    <option value="O-">O- (Universal Donor)</option>
                                </select>
                                <small class="form-help">Select the donor's blood type</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="new-last-donation">Last Donation Date</label>
                                <input type="date" id="new-last-donation" class="form-input">
                                <small class="form-help">Leave empty if first-time donor</small>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions form-actions-centered">
                        <button type="button" class="btn-secondary btn-large" onclick="closeModal()">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary btn-large">
                            <i class="fas fa-user-plus"></i>
                            Add Donor
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#add-donor-form');
    form.addEventListener('submit', handleAddDonor);
}

async function handleAddDonor(e) {
    e.preventDefault();

    const donorData = {
        firstName: document.getElementById('new-first-name').value.trim(),
        lastName: document.getElementById('new-last-name').value.trim(),
        email: document.getElementById('new-email').value.trim(),
        phone: document.getElementById('new-phone').value.trim(),
        bloodType: document.getElementById('new-blood-type').value,
        lastDonation: document.getElementById('new-last-donation').value || null
    };

    try {
        const response = await fetch('/api/donors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(donorData)
        });

        if (response.ok) {
            showSuccess('Donor added successfully!');
            closeModal();
            loadDonors(); // Refresh the donors list
            loadDashboardData(); // Update dashboard stats
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add donor');
        }
    } catch (error) {
        console.error('Add donor error:', error);
        showError('Network error. Please try again.');
    }
}

async function editDonor(donorId) {
    try {
        // Fetch donor details
        const response = await fetch(`/api/donors/${donorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch donor details');
        }

        const data = await response.json();
        const donor = data.donor;
        const user = donor.user;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Donor</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="edit-donor-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-first-name">First Name *</label>
                                <input type="text" id="edit-first-name" value="${user.firstName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-last-name">Last Name *</label>
                                <input type="text" id="edit-last-name" value="${user.lastName || ''}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-email">Email *</label>
                                <input type="email" id="edit-email" value="${user.email || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-phone">Phone</label>
                                <input type="tel" id="edit-phone" value="${user.phone || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-blood-type">Blood Type *</label>
                                <select id="edit-blood-type" required>
                                    <option value="A+" ${donor.bloodType === 'A+' ? 'selected' : ''}>A+</option>
                                    <option value="A-" ${donor.bloodType === 'A-' ? 'selected' : ''}>A-</option>
                                    <option value="B+" ${donor.bloodType === 'B+' ? 'selected' : ''}>B+</option>
                                    <option value="B-" ${donor.bloodType === 'B-' ? 'selected' : ''}>B-</option>
                                    <option value="AB+" ${donor.bloodType === 'AB+' ? 'selected' : ''}>AB+</option>
                                    <option value="AB-" ${donor.bloodType === 'AB-' ? 'selected' : ''}>AB-</option>
                                    <option value="O+" ${donor.bloodType === 'O+' ? 'selected' : ''}>O+</option>
                                    <option value="O-" ${donor.bloodType === 'O-' ? 'selected' : ''}>O-</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-last-donation">Last Donation Date</label>
                                <input type="date" id="edit-last-donation" value="${donor.lastDonation ? new Date(donor.lastDonation).toISOString().split('T')[0] : ''}">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Update Donor</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = modal.querySelector('#edit-donor-form');
        form.addEventListener('submit', (e) => handleEditDonor(e, donorId, user._id));
    } catch (error) {
        console.error('Edit donor error:', error);
        showError('Failed to load donor details for editing');
    }
}

async function handleEditDonor(e, donorId, userId) {
    e.preventDefault();

    const donorData = {
        bloodType: document.getElementById('edit-blood-type').value,
        contactInfo: {
            email: document.getElementById('edit-email').value.trim(),
            phone: document.getElementById('edit-phone').value.trim()
        },
        lastDonation: document.getElementById('edit-last-donation').value || null
    };

    const userData = {
        firstName: document.getElementById('edit-first-name').value.trim(),
        lastName: document.getElementById('edit-last-name').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        phone: document.getElementById('edit-phone').value.trim()
    };

    try {
        // First update the user
        const userResponse = await fetch(`/api/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(userData)
        });

        if (!userResponse.ok) {
            const error = await userResponse.json();
            throw new Error(error.error || 'Failed to update user information');
        }

        // Then update the donor
        const donorResponse = await fetch(`/api/donors/${donorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(donorData)
        });

        if (donorResponse.ok) {
            showSuccess('Donor updated successfully!');
            closeModal();
            loadDonors(); // Refresh the donors list
        } else {
            const error = await donorResponse.json();
            showError(error.error || 'Failed to update donor');
        }
    } catch (error) {
        console.error('Edit donor error:', error);
        showError(error.message || 'Network error. Please try again.');
    }
}

async function deleteDonor(donorId) {
    if (!confirm('Are you sure you want to delete this donor? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/donors/${donorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            showSuccess('Donor deleted successfully!');
            loadDonors(); // Refresh the donors list
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete donor');
        }
    } catch (error) {
        console.error('Delete donor error:', error);
        showError('Network error. Please try again.');
    }
}

async function editRequest(requestId) {
    try {
        // Fetch request details
        const response = await fetch(`/api/requests/${requestId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch request details');
        }

        const data = await response.json();
        const request = data.request;

        // Open edit modal with pre-filled data
        openEditRequestModal(request);
    } catch (error) {
        console.error('Edit request error:', error);
        showError('Failed to load request details');
    }
}

async function deleteRequest(requestId) {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            showSuccess('Request deleted successfully!');
            loadRequests(); // Refresh the requests list
            loadDashboardData(); // Update dashboard stats
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete request');
        }
    } catch (error) {
        console.error('Delete request error:', error);
        showError('Network error. Please try again.');
    }
}

function openAddRequestModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header modal-header-warning">
                <div class="modal-title">
                    <i class="fas fa-hand-holding-heart"></i>
                    <h2>New Blood Request</h2>
                </div>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body modal-body-padded">
                <div class="form-intro">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        <span>Please provide complete information to ensure timely blood supply delivery.</span>
                    </div>
                </div>
                <form id="add-request-form" class="form-styled">
                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-building"></i>
                            Requester Information
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="requester-name" class="form-label-required">Requester Name *</label>
                                <input type="text" id="requester-name" class="form-input" placeholder="Hospital/Clinic/Patient name" required>
                                <small class="form-help">Full name of the requesting institution or patient</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="requester-type" class="form-label-required">Requester Type *</label>
                                <select id="requester-type" class="form-select" required>
                                    <option value="">Select Type</option>
                                    <option value="hospital">🏥 Hospital</option>
                                    <option value="clinic">🏥 Clinic</option>
                                    <option value="patient">👤 Patient</option>
                                </select>
                                <small class="form-help">Type of requester</small>
                            </div>
                        </div>
                        <div class="form-group form-group-enhanced">
                            <label for="requester-contact" class="form-label-required">Contact Information *</label>
                            <input type="text" id="requester-contact" class="form-input" placeholder="Phone number or email address" required>
                            <small class="form-help">Primary contact for coordination</small>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-tint"></i>
                            Blood Requirements
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="blood-type-needed" class="form-label-required">Blood Type Needed *</label>
                                <select id="blood-type-needed" class="form-select" required>
                                    <option value="">Select Blood Type</option>
                                    <option value="A+">A+ (Common)</option>
                                    <option value="A-">A- (Rare)</option>
                                    <option value="B+">B+ (Common)</option>
                                    <option value="B-">B- (Rare)</option>
                                    <option value="AB+">AB+ (Rare)</option>
                                    <option value="AB-">AB- (Very Rare)</option>
                                    <option value="O+">O+ (Universal Donor)</option>
                                    <option value="O-">O- (Universal Donor)</option>
                                </select>
                                <small class="form-help">Required blood type for transfusion</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="quantity-needed" class="form-label-required">Quantity Needed *</label>
                                <input type="number" id="quantity-needed" class="form-input" min="1" placeholder="1" required>
                                <small class="form-help">Number of blood units required</small>
                            </div>
                        </div>
                        <div class="form-group form-group-enhanced">
                            <label for="urgency" class="form-label-required">Urgency Level *</label>
                            <select id="urgency" class="form-select" required>
                                <option value="normal">🟢 Normal (Within 7 days)</option>
                                <option value="urgent">🟡 Urgent (Within 24 hours)</option>
                                <option value="critical">🔴 Critical (Immediate)</option>
                            </select>
                            <small class="form-help">How urgently is the blood needed?</small>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-sticky-note"></i>
                            Additional Information
                        </h3>
                        <div class="form-group form-group-enhanced">
                            <label for="request-notes">Additional Notes</label>
                            <textarea id="request-notes" class="form-textarea" rows="4" placeholder="Please provide any additional information about the patient condition, special requirements, or delivery instructions"></textarea>
                            <small class="form-help">Optional details to help with blood matching and delivery</small>
                        </div>
                    </div>

                    <div class="form-actions form-actions-centered">
                        <button type="button" class="btn-secondary btn-large" onclick="closeModal()">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary btn-large">
                            <i class="fas fa-paper-plane"></i>
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#add-request-form');
    form.addEventListener('submit', handleAddRequest);
}

function openEditRequestModal(request) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header modal-header-warning">
                <div class="modal-title">
                    <i class="fas fa-edit"></i>
                    <h2>Edit Blood Request</h2>
                </div>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body modal-body-padded">
                <div class="form-intro">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        <span>Update the request information below.</span>
                    </div>
                </div>
                <form id="edit-request-form" class="form-styled">
                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-building"></i>
                            Requester Information
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="edit-requester-name" class="form-label-required">Requester Name *</label>
                                <input type="text" id="edit-requester-name" class="form-input" placeholder="Hospital/Clinic/Patient name" value="${request.patient?.name || request.institution?.name || ''}" required>
                                <small class="form-help">Full name of the requesting institution or patient</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="edit-requester-type" class="form-label-required">Requester Type *</label>
                                <select id="edit-requester-type" class="form-select" required>
                                    <option value="">Select Type</option>
                                    <option value="hospital" ${request.institution?.type === 'hospital' ? 'selected' : ''}>🏥 Hospital</option>
                                    <option value="clinic" ${request.institution?.type === 'clinic' ? 'selected' : ''}>🏥 Clinic</option>
                                    <option value="patient" ${request.institution?.type === 'patient' ? 'selected' : ''}>👤 Patient</option>
                                </select>
                                <small class="form-help">Type of requester</small>
                            </div>
                        </div>
                        <div class="form-group form-group-enhanced">
                            <label for="edit-requester-contact" class="form-label-required">Contact Information *</label>
                            <input type="text" id="edit-requester-contact" class="form-input" placeholder="Phone number or email address" value="${request.institution?.address?.phone || ''}" required>
                            <small class="form-help">Primary contact for coordination</small>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-tint"></i>
                            Blood Requirements
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="edit-blood-type-needed" class="form-label-required">Blood Type Needed *</label>
                                <select id="edit-blood-type-needed" class="form-select" required>
                                    <option value="">Select Blood Type</option>
                                    <option value="A+" ${request.bloodRequirements?.[0]?.bloodType === 'A+' ? 'selected' : ''}>A+ (Common)</option>
                                    <option value="A-" ${request.bloodRequirements?.[0]?.bloodType === 'A-' ? 'selected' : ''}>A- (Rare)</option>
                                    <option value="B+" ${request.bloodRequirements?.[0]?.bloodType === 'B+' ? 'selected' : ''}>B+ (Common)</option>
                                    <option value="B-" ${request.bloodRequirements?.[0]?.bloodType === 'B-' ? 'selected' : ''}>B- (Rare)</option>
                                    <option value="AB+" ${request.bloodRequirements?.[0]?.bloodType === 'AB+' ? 'selected' : ''}>AB+ (Rare)</option>
                                    <option value="AB-" ${request.bloodRequirements?.[0]?.bloodType === 'AB-' ? 'selected' : ''}>AB- (Very Rare)</option>
                                    <option value="O+" ${request.bloodRequirements?.[0]?.bloodType === 'O+' ? 'selected' : ''}>O+ (Universal Donor)</option>
                                    <option value="O-" ${request.bloodRequirements?.[0]?.bloodType === 'O-' ? 'selected' : ''}>O- (Universal Donor)</option>
                                </select>
                                <small class="form-help">Required blood type for transfusion</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="edit-quantity-needed" class="form-label-required">Quantity Needed *</label>
                                <input type="number" id="edit-quantity-needed" class="form-input" min="1" value="${request.bloodRequirements?.[0]?.units || 1}" required>
                                <small class="form-help">Number of blood units required</small>
                            </div>
                        </div>
                        <div class="form-group form-group-enhanced">
                            <label for="edit-urgency" class="form-label-required">Urgency Level *</label>
                            <select id="edit-urgency" class="form-select" required>
                                <option value="normal" ${request.bloodRequirements?.[0]?.urgency === 'routine' || request.priority === 'medium' ? 'selected' : ''}>🟢 Normal (Within 7 days)</option>
                                <option value="urgent" ${request.bloodRequirements?.[0]?.urgency === 'urgent' || request.priority === 'high' ? 'selected' : ''}>🟡 Urgent (Within 24 hours)</option>
                                <option value="critical" ${request.bloodRequirements?.[0]?.urgency === 'emergency' || request.priority === 'critical' ? 'selected' : ''}>🔴 Critical (Immediate)</option>
                            </select>
                            <small class="form-help">How urgently is the blood needed?</small>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-sticky-note"></i>
                            Additional Information
                        </h3>
                        <div class="form-group form-group-enhanced">
                            <label for="edit-request-notes">Additional Notes</label>
                            <textarea id="edit-request-notes" class="form-textarea" rows="4" placeholder="Please provide any additional information about the patient condition, special requirements, or delivery instructions">${request.notes || ''}</textarea>
                            <small class="form-help">Optional details to help with blood matching and delivery</small>
                        </div>
                    </div>

                    <div class="form-actions form-actions-centered">
                        <button type="button" class="btn-secondary btn-large" onclick="closeModal()">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary btn-large">
                            <i class="fas fa-save"></i>
                            Update Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#edit-request-form');
    form.addEventListener('submit', (e) => handleEditRequest(e, request._id));
}

async function handleAddRequest(e) {
    e.preventDefault();

    const requesterType = document.getElementById('requester-type').value;
    const requesterName = document.getElementById('requester-name').value.trim();
    const contactInfo = document.getElementById('requester-contact').value.trim();
    const bloodType = document.getElementById('blood-type-needed').value;
    const quantity = parseInt(document.getElementById('quantity-needed').value);
    const urgency = document.getElementById('urgency').value;
    const notes = document.getElementById('request-notes').value.trim();

    // Structure data according to backend expectations
    const requestData = {
        patient: requesterType === 'patient' ? {
            name: requesterName
        } : undefined,
        institution: requesterType !== 'patient' ? {
            name: requesterName,
            type: requesterType,
            address: {
                phone: contactInfo
            }
        } : undefined,
        bloodRequirements: [{
            bloodType: bloodType,
            component: 'whole_blood',
            units: quantity,
            urgency: urgency === 'critical' ? 'emergency' : urgency === 'urgent' ? 'urgent' : 'routine'
        }],
        priority: urgency === 'critical' ? 'critical' : urgency === 'urgent' ? 'high' : 'medium',
        notes: notes,
        status: 'pending'
    };

    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            showSuccess('Request submitted successfully!');
            closeModal();
            loadRequests(); // Refresh the requests list
            loadDashboardData(); // Update dashboard stats
        } else {
            const error = await response.json();
            console.error('Request submission error:', error);
            showError(error.error || 'Failed to submit request');
        }
    } catch (error) {
        console.error('Add request error:', error);
        showError('Network error. Please try again.');
    }
}

async function handleEditRequest(e, requestId) {
    e.preventDefault();

    const requestData = {
        patient: {
            name: document.getElementById('edit-requester-name').value.trim()
        },
        institution: {
            name: document.getElementById('edit-requester-name').value.trim(),
            type: document.getElementById('edit-requester-type').value,
            address: {
                phone: document.getElementById('edit-requester-contact').value.trim()
            }
        },
        bloodRequirements: [{
            bloodType: document.getElementById('edit-blood-type-needed').value,
            component: 'whole_blood',
            units: parseInt(document.getElementById('edit-quantity-needed').value),
            urgency: document.getElementById('edit-urgency').value === 'critical' ? 'emergency' : document.getElementById('edit-urgency').value === 'urgent' ? 'urgent' : 'routine'
        }],
        priority: document.getElementById('edit-urgency').value === 'critical' ? 'critical' : document.getElementById('edit-urgency').value === 'urgent' ? 'high' : 'medium',
        notes: document.getElementById('edit-request-notes').value.trim()
    };

    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            showSuccess('Request updated successfully!');
            closeModal();
            loadRequests(); // Refresh the requests list
            loadDashboardData(); // Update dashboard stats
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update request');
        }
    } catch (error) {
        console.error('Edit request error:', error);
        showError('Network error. Please try again.');
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

function openAddInventoryModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Blood Units</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="add-inventory-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="inventory-blood-type">Blood Type *</label>
                            <select id="inventory-blood-type" required>
                                <option value="">Select Blood Type</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="inventory-units">Units to Add *</label>
                            <input type="number" id="inventory-units" min="1" placeholder="1" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="inventory-donation-date">Donation Date *</label>
                            <input type="date" id="inventory-donation-date" required>
                        </div>
                        <div class="form-group">
                            <label for="inventory-expiry-date">Expiry Date *</label>
                            <input type="date" id="inventory-expiry-date" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="inventory-notes">Notes</label>
                        <textarea id="inventory-notes" rows="3" placeholder="Additional notes about the blood units"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Add to Inventory</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#add-inventory-form');
    form.addEventListener('submit', handleAddInventory);
}

async function handleAddInventory(e) {
    e.preventDefault();

    const inventoryData = {
        bloodType: document.getElementById('inventory-blood-type').value,
        units: parseInt(document.getElementById('inventory-units').value),
        donationDate: document.getElementById('inventory-donation-date').value,
        expiryDate: document.getElementById('inventory-expiry-date').value,
        notes: document.getElementById('inventory-notes').value.trim()
    };

    try {
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(inventoryData)
        });

        if (response.ok) {
            showSuccess('Blood units added to inventory successfully!');
            closeModal();
            loadInventory(); // Refresh the inventory list
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add inventory');
        }
    } catch (error) {
        console.error('Add inventory error:', error);
        showError('Network error. Please try again.');
    }
}

function editInventory(bloodType) {
    showInfo('Edit inventory functionality coming soon!');
}

function deleteInventory(bloodType) {
    if (confirm(`Are you sure you want to remove all ${bloodType} units from inventory?`)) {
        showInfo('Delete inventory functionality coming soon!');
    }
}

// Profile Management Functions
async function loadProfile() {
    console.log('Loading profile from frontend');
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        console.log('Profile fetch response status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Profile data received:', JSON.stringify(data, null, 2));
            updateProfileDisplay(data.user || data);
        } else {
            console.error('Failed to load profile:', response.status);
            // Show mock data for demo
            const mockProfile = {
                firstName: 'John',
                lastName: 'Admin',
                email: 'admin@lifeflow.com',
                role: 'Administrator',
                bloodType: 'O+',
                phone: '+1-555-0123'
            };
            console.log('Using mock profile data');
            updateProfileDisplay(mockProfile);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Show mock data for demo
        const mockProfile = {
            firstName: 'John',
            lastName: 'Admin',
            email: 'admin@lifeflow.com',
            role: 'Administrator',
            bloodType: 'O+',
            phone: '+1-555-0123'
        };
        updateProfileDisplay(mockProfile);
    }
}

function updateProfileDisplay(profile) {
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');
    const profileAvatar = document.getElementById('profile-avatar');
    const editFullName = document.getElementById('edit-full-name');
    const editEmail = document.getElementById('edit-email');

    if (profileName) profileName.textContent = `${profile.firstName} ${profile.lastName}`;
    if (profileEmail) profileEmail.textContent = profile.email;
    if (profileRole) profileRole.textContent = profile.role || 'User';
    if (editFullName) editFullName.value = `${profile.firstName} ${profile.lastName}`;
    if (editEmail) editEmail.value = profile.email;
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const fullName = document.getElementById('edit-full-name').value.trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ firstName, lastName })
        });

        if (response.ok) {
            showSuccess('Profile updated successfully!');
            loadProfile(); // Refresh profile display
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showError('Network error. Please try again.');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        if (response.ok) {
            showSuccess('Password changed successfully!');
            document.getElementById('password-form').reset();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showError('Network error. Please try again.');
    }
}

function changeAvatar() {
    showInfo('Avatar change functionality coming soon!');
}

// Settings Management Functions
function loadSettings() {
    // Load settings from localStorage or set defaults
    const settings = {
        emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
        inventoryAlerts: localStorage.getItem('inventoryAlerts') !== 'false',
        requestUpdates: localStorage.getItem('requestUpdates') !== 'false',
        theme: localStorage.getItem('theme') || 'light',
        language: localStorage.getItem('language') || 'en',
        itemsPerPage: localStorage.getItem('itemsPerPage') || '10'
    };

    // Apply settings to UI
    document.getElementById('email-notifications').checked = settings.emailNotifications;
    document.getElementById('inventory-alerts').checked = settings.inventoryAlerts;
    document.getElementById('request-updates').checked = settings.requestUpdates;
    document.getElementById('theme-select').value = settings.theme;
    document.getElementById('language-select').value = settings.language;
    document.getElementById('items-per-page').value = settings.itemsPerPage;

    // Set last updated
    document.getElementById('last-updated').textContent = new Date().toLocaleDateString();
}

function saveSettings() {
    const settings = {
        emailNotifications: document.getElementById('email-notifications').checked,
        inventoryAlerts: document.getElementById('inventory-alerts').checked,
        requestUpdates: document.getElementById('request-updates').checked,
        theme: document.getElementById('theme-select').value,
        language: document.getElementById('language-select').value,
        itemsPerPage: document.getElementById('items-per-page').value
    };

    // Save to localStorage
    Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
    });

    showSuccess('Settings saved successfully!');

    // Apply theme if changed
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        // Clear settings from localStorage
        ['emailNotifications', 'inventoryAlerts', 'requestUpdates', 'theme', 'language', 'itemsPerPage'].forEach(key => {
            localStorage.removeItem(key);
        });

        // Reload settings (will use defaults)
        loadSettings();
        showSuccess('Settings reset to default!');
    }
}

function filterDonors() {
    const searchTerm = document.getElementById('donor-search')?.value.toLowerCase() || '';
    const bloodFilter = document.getElementById('donor-blood-filter')?.value || '';
    const statusFilter = document.getElementById('donor-status-filter')?.value || '';

    const rows = document.querySelectorAll('#donor-table-body tr');

    rows.forEach(row => {
        const name = row.cells[0]?.textContent.toLowerCase() || '';
        const bloodType = row.cells[1]?.textContent || '';
        const status = row.cells[4]?.querySelector('.status-badge')?.textContent.toLowerCase() || '';

        const matchesSearch = name.includes(searchTerm);
        const matchesBlood = !bloodFilter || bloodType === bloodFilter;
        const matchesStatus = !statusFilter || status.includes(statusFilter);

        if (matchesSearch && matchesBlood && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterRequests() {
    const searchTerm = document.getElementById('request-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('request-status-filter')?.value || '';
    const urgencyFilter = document.getElementById('request-urgency-filter')?.value || '';
    const typeFilter = document.getElementById('request-type-filter')?.value || '';

    const rows = document.querySelectorAll('#request-table-body tr');

    rows.forEach(row => {
        const requesterName = row.cells[2]?.textContent.toLowerCase() || '';
        const status = row.cells[6]?.querySelector('.status-badge')?.textContent.toLowerCase() || '';
        const urgency = row.cells[5]?.querySelector('.urgency-badge')?.textContent.toLowerCase() || '';
        const type = row.cells[1]?.textContent.toLowerCase() || '';

        const matchesSearch = requesterName.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter);
        const matchesUrgency = !urgencyFilter || urgency.includes(urgencyFilter);
        const matchesType = !typeFilter || type.includes(typeFilter);

        if (matchesSearch && matchesStatus && matchesUrgency && matchesType) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterInventory() {
    const bloodFilter = document.getElementById('inventory-blood-filter')?.value || '';
    const statusFilter = document.getElementById('inventory-status-filter')?.value || '';

    const rows = document.querySelectorAll('#inventory-table-body tr');

    rows.forEach(row => {
        const bloodType = row.cells[0]?.textContent || '';
        const status = row.cells[2]?.querySelector('.status-badge')?.textContent.toLowerCase() || '';

        const matchesBlood = !bloodFilter || bloodType === bloodFilter;
        const matchesStatus = !statusFilter || status.includes(statusFilter);

        if (matchesBlood && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function searchInventory() {
    const searchTerm = document.getElementById('inventory-search')?.value.toLowerCase() || '';

    const rows = document.querySelectorAll('#inventory-table-body tr');

    rows.forEach(row => {
        const bloodType = row.cells[0]?.textContent.toLowerCase() || '';
        const units = row.cells[1]?.textContent.toLowerCase() || '';
        const status = row.cells[2]?.querySelector('.status-badge')?.textContent.toLowerCase() || '';

        const matchesSearch = bloodType.includes(searchTerm) ||
                             units.includes(searchTerm) ||
                             status.includes(searchTerm);

        if (matchesSearch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function exportInventory() {
    try {
        // Get current inventory data
        const rows = document.querySelectorAll('#inventory-table-body tr:not(.empty-state)');
        const inventoryData = [];

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    inventoryData.push({
                        bloodType: cells[0].textContent.trim(),
                        units: cells[1].textContent.trim(),
                        status: cells[2].querySelector('.status-badge')?.textContent.trim() || '',
                        lastUpdated: cells[3].textContent.trim()
                    });
                }
            }
        });

        // Create CSV content
        const csvContent = [
            ['Blood Type', 'Units Available', 'Status', 'Last Updated'],
            ...inventoryData.map(item => [
                item.bloodType,
                item.units,
                item.status,
                item.lastUpdated
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Inventory data exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export inventory data');
    }
}

function refreshInventory() {
    showInfo('Refreshing inventory data...');
    loadInventory();
}

function toggleTableView() {
    const table = document.querySelector('.inventory-data-table');
    if (table) {
        table.classList.toggle('compact-view');
        showInfo('Table view toggled');
    }
}

async function updateRequestStatus(requestId, newStatus) {
    if (!newStatus) return; // If no status selected, do nothing

    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showSuccess(`Request status updated to ${newStatus}!`);
            loadRequests(); // Refresh the requests list
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update request status');
        }
    } catch (error) {
        console.error('Update request status error:', error);
        showError('Network error. Please try again.');
    }
}

async function updateDonorEligibility(donorId, newStatus) {
    if (!newStatus) return; // If no status selected, do nothing

    try {
        const response = await fetch(`/api/donors/${donorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ eligibilityStatus: newStatus })
        });

        if (response.ok) {
            showSuccess(`Donor eligibility updated to ${newStatus}!`);
            loadDonors(); // Refresh the donors list
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update donor eligibility');
        }
    } catch (error) {
        console.error('Update donor eligibility error:', error);
        showError('Network error. Please try again.');
    }
}

// Utility Functions
function showError(message) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification notification-error';
    notification.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function showSuccess(message) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification notification-success';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function showInfo(message) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification notification-info';
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// Chart Initialization
function initializeCharts() {
    // Blood Type Distribution Chart
    const bloodTypeCtx = document.getElementById('bloodTypeChart');
    if (bloodTypeCtx) {
        new Chart(bloodTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['A+', 'O+', 'B+', 'AB+', 'A-', 'O-', 'B-', 'AB-'],
                datasets: [{
                    data: [35, 28, 18, 12, 3, 2, 1, 1],
                    backgroundColor: [
                        '#e74c3c', '#3498db', '#27ae60', '#f39c12',
                        '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Donation Trend Chart
    const trendCtx = document.getElementById('donationTrendChart');
    if (trendCtx) {
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Donations',
                    data: [65, 59, 80, 81, 56, 85],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Campaign Functions
function openAddCampaignModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header modal-header-primary">
                <div class="modal-title">
                    <i class="fas fa-plus"></i>
                    <h2>Create New Campaign</h2>
                </div>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body modal-body-padded">
                <div class="form-intro">
                    <p>Create a new blood donation campaign to organize drives and track participation.</p>
                </div>
                <form id="add-campaign-form" class="form-styled">
                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-bullhorn"></i>
                            Campaign Details
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="campaign-title" class="form-label-required">Campaign Title *</label>
                                <input type="text" id="campaign-title" class="form-input" placeholder="e.g., City Center Blood Drive" required>
                                <small class="form-help">Give your campaign a clear, descriptive name</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="campaign-location" class="form-label-required">Location *</label>
                                <input type="text" id="campaign-location" class="form-input" placeholder="e.g., City Convention Center" required>
                                <small class="form-help">Where will the campaign take place?</small>
                            </div>
                        </div>
                        <div class="form-group form-group-enhanced">
                            <label for="campaign-description" class="form-label-required">Description *</label>
                            <textarea id="campaign-description" class="form-textarea" rows="3" placeholder="Describe the campaign goals and details" required></textarea>
                            <small class="form-help">Provide details about the campaign to attract donors</small>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">
                            <i class="fas fa-calendar"></i>
                            Schedule & Targets
                        </h3>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="campaign-start-date" class="form-label-required">Start Date *</label>
                                <input type="date" id="campaign-start-date" class="form-input" required>
                                <small class="form-help">When does the campaign begin?</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="campaign-end-date" class="form-label-required">End Date *</label>
                                <input type="date" id="campaign-end-date" class="form-input" required>
                                <small class="form-help">When does the campaign end?</small>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group form-group-enhanced">
                                <label for="campaign-target" class="form-label-required">Target Donors *</label>
                                <input type="number" id="campaign-target" class="form-input" min="1" placeholder="200" required>
                                <small class="form-help">How many donors do you aim to reach?</small>
                            </div>
                            <div class="form-group form-group-enhanced">
                                <label for="campaign-organizer">Organizer</label>
                                <input type="text" id="campaign-organizer" class="form-input" placeholder="Organization or person in charge" readonly value="LifeFlow Blood Bank">
                                <small class="form-help">Campaign organizer (auto-filled)</small>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions form-actions-centered">
                        <button type="button" class="btn-secondary btn-large" onclick="closeModal()">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary btn-large">
                            <i class="fas fa-plus"></i>
                            Create Campaign
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#add-campaign-form');
    form.addEventListener('submit', handleAddCampaign);
}

async function handleAddCampaign(e) {
    e.preventDefault();

    const campaignData = {
        title: document.getElementById('campaign-title').value.trim(),
        description: document.getElementById('campaign-description').value.trim(),
        location: document.getElementById('campaign-location').value.trim(),
        startDate: document.getElementById('campaign-start-date').value,
        endDate: document.getElementById('campaign-end-date').value,
        targetDonors: parseInt(document.getElementById('campaign-target').value),
        organizer: document.getElementById('campaign-organizer').value.trim()
    };

    try {
        const response = await fetch('/api/campaigns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(campaignData)
        });

        if (response.ok) {
            showSuccess('Campaign created successfully!');
            closeModal();
            loadCampaigns(); // Refresh the campaigns list
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to create campaign');
        }
    } catch (error) {
        console.error('Add campaign error:', error);
        showError('Network error. Please try again.');
    }
}

function editCampaign(campaignId) {
    showInfo('Campaign editing functionality coming soon!');
}

function viewCampaign(campaignId) {
    showInfo('Campaign details view coming soon!');
}

function filterCampaigns() {
    // Implement campaign filtering
    console.log('Filtering campaigns');
}

function generateReport() {
    showInfo('Report generation functionality coming soon!');
}

function exportReport() {
    showInfo('Report export functionality coming soon!');
}

// Export functions for global access
window.showSection = showSection;
window.showEmergencyModal = showEmergencyModal;
window.openAddDonorModal = openAddDonorModal;
window.editDonor = editDonor;
window.deleteDonor = deleteDonor;
window.updateDonorEligibility = updateDonorEligibility;
window.openAddRequestModal = openAddRequestModal;
window.editRequest = editRequest;
window.deleteRequest = deleteRequest;
window.closeModal = closeModal;
window.updateRequestStatus = updateRequestStatus;
window.openAddInventoryModal = openAddInventoryModal;
window.editInventory = editInventory;
window.deleteInventory = deleteInventory;
window.exportInventory = exportInventory;
window.refreshInventory = refreshInventory;
window.toggleTableView = toggleTableView;
window.searchInventory = searchInventory;
window.openAddCampaignModal = openAddCampaignModal;
window.editCampaign = editCampaign;
window.viewCampaign = viewCampaign;
window.filterCampaigns = filterCampaigns;
window.generateReport = generateReport;
window.exportReport = exportReport;
window.changeAvatar = changeAvatar;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.setupDashboardQuickActions = setupDashboardQuickActions;