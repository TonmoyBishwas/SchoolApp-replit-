// ===== SUPER ADMIN PORTAL JAVASCRIPT =====

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeSuperAdminPortal();
        checkSuperAdminAuthentication();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize institution management
        initInstitutionManagement();
        
        // Update dashboard statistics
        updateDashboardStats();
    } catch (error) {
        console.error('Error initializing super admin portal:', error);
    }
});

// ===== PORTAL INITIALIZATION =====
function initializeSuperAdminPortal() {
    // Set user information
    const currentUser = getCurrentSuperAdmin();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name || 'Super Administrator';
    }
}

// ===== AUTHENTICATION =====
function checkSuperAdminAuthentication() {
    // This is a placeholder for authentication logic
    // In a real application, this would verify the user's token and redirect to login if invalid
    console.log('Checking super admin authentication...');
    
    // For demo purposes, let's assume the user is authenticated
    const hasValidToken = localStorage.getItem('superAdminToken');
    if (!hasValidToken) {
        console.log('Creating demo super admin session');
        // This is just for demonstration
        localStorage.setItem('superAdminToken', 'demo_token_12345');
        localStorage.setItem('currentSuperAdmin', JSON.stringify({
            id: '1',
            name: 'System Administrator',
            role: 'superadmin',
            email: 'superadmin@cheickmohamed.edu'
        }));
    }
}

function getCurrentSuperAdmin() {
    return JSON.parse(localStorage.getItem('currentSuperAdmin') || '{}');
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // User menu toggle
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
    
    // Add navigation click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });
    
    // User menu toggle
    document.querySelector('.user-menu-toggle').addEventListener('click', toggleUserMenu);
}

// ===== NAVIGATION FUNCTIONS =====
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.portal-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Update sidebar navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item[href="#${sectionId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('userDropdownMenu');
    menu.classList.toggle('show');
}

// ===== AUTH FUNCTIONS =====
function handleLogout() {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('currentSuperAdmin');
    window.location.href = '../index.html';
}

// ===== WINDOW EVENTS =====
// Close dropdown when clicking outside
window.addEventListener('click', function(event) {
    if (!event.target.matches('.user-menu-toggle') && !event.target.matches('.fa-chevron-down')) {
        const dropdown = document.getElementById('userDropdownMenu');
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});

// ===== INSTITUTION MANAGEMENT =====

function formatAddress(address) {
    // If address is undefined or null
    if (!address) return 'No address provided';
    
    // If address is already a string, try to parse it in case it's a JSON string
    if (typeof address === 'string') {
        try {
            // Try to parse as JSON
            const parsedAddress = JSON.parse(address);
            return formatAddress(parsedAddress); // Recursively format the parsed object
        } catch (e) {
            // If it's not valid JSON, just return the string
            return address;
        }
    }
    
    // Handle object format
    if (typeof address === 'object') {
        if (address.street) {
            // Build the formatted address with checks for each part
            const parts = [];
            if (address.street) parts.push(address.street);
            if (address.city) parts.push(address.city);
            if (address.state) {
                if (address.zip) {
                    parts.push(`${address.state} ${address.zip}`);
                } else {
                    parts.push(address.state);
                }
            } else if (address.zip) {
                parts.push(address.zip);
            }
            if (address.country) parts.push(address.country);
            
            return parts.join(', ');
        }
    }
    
    return 'No address provided';
}

function initInstitutionManagement() {
    // Get DOM elements
    const addInstitutionBtn = document.getElementById('add-institution-btn');
    const backToInstitutionsBtn = document.getElementById('back-to-institutions');
    const cancelBtn = document.getElementById('cancel-institution');
    const institutionForm = document.getElementById('institution-form');
    const createFirstInstitutionBtn = document.getElementById('create-first-institution');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    
    // Event listeners
    if(addInstitutionBtn) {
        addInstitutionBtn.addEventListener('click', openInstitutionForm);
    }
    
    if(backToInstitutionsBtn) {
        backToInstitutionsBtn.addEventListener('click', closeInstitutionForm);
    }
    
    if(cancelBtn) {
        cancelBtn.addEventListener('click', closeInstitutionForm);
    }
    
    if(createFirstInstitutionBtn) {
        createFirstInstitutionBtn.addEventListener('click', openInstitutionForm);
    }
    
    if(institutionForm) {
        institutionForm.addEventListener('submit', handleInstitutionSubmit);
    }
    
    // Add institution type change listener
    const institutionTypeSelect = document.getElementById('institution-type');
    if(institutionTypeSelect) {
        institutionTypeSelect.addEventListener('change', function() {
            const customTypeContainer = document.getElementById('custom-type-container');
            const customTypeInput = document.getElementById('custom-institution-type');
            
            if(this.value === 'other') {
                customTypeContainer.style.display = 'block';
                customTypeInput.setAttribute('required', 'required');
            } else {
                customTypeContainer.style.display = 'none';
                customTypeInput.removeAttribute('required');
            }
        });
    }
    
    // Password toggle functionality
    if(togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('admin-password');
            const eyeIcon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.classList.remove('fa-eye');
                eyeIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                eyeIcon.classList.remove('fa-eye-slash');
                eyeIcon.classList.add('fa-eye');
            }
        });
    }
    
    // Load existing institutions
    loadInstitutions();
}

function openInstitutionForm() {
    // Hide list view and show form view
    document.getElementById('institution-list-view').style.display = 'none';
    document.getElementById('institution-form-view').style.display = 'block';
    
    // Reset form for new institution
    const form = document.getElementById('institution-form');
    form.reset();
    form.dataset.editing = 'false';
    delete form.dataset.institutionId;
    
    // Reset form title and button text
    document.getElementById('institution-form-title').textContent = 'Add New Institution';
    document.querySelector('#save-institution').innerHTML = '<i class="fas fa-save"></i> Save Institution';
    
    // Hide institution code display
    const codeDisplay = document.getElementById('institution-code-display');
    if (codeDisplay) {
        codeDisplay.style.display = 'none';
    }
    
    // Make admin credentials required for new institutions
    document.getElementById('admin-username').setAttribute('required', 'required');
    document.getElementById('admin-password').setAttribute('required', 'required');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function closeInstitutionForm() {
    // Hide form view and show list view
    document.getElementById('institution-form-view').style.display = 'none';
    document.getElementById('institution-list-view').style.display = 'block';
    
    // Reset the form
    document.getElementById('institution-form').reset();
    
    // Hide custom type field
    const customTypeContainer = document.getElementById('custom-type-container');
    if (customTypeContainer) {
        customTypeContainer.style.display = 'none';
    }
}

function handleInstitutionSubmit(event) {
    event.preventDefault();
    
    // Check if we're editing or creating
    const isEditing = document.getElementById('institution-form').dataset.editing === 'true';
    const institutionId = document.getElementById('institution-form').dataset.institutionId;
    
    // Get selected institution type
    const selectedType = document.getElementById('institution-type').value;
    let finalType = selectedType;
    
    // If "other" is selected, use the custom type
    if (selectedType === 'other') {
        const customType = document.getElementById('custom-institution-type').value.trim();
        if (customType) {
            finalType = customType;
        }
    }
    
    // Get form data
    const institutionData = {
        name: document.getElementById('institution-name').value,
        regNumber: document.getElementById('institution-reg-number').value,
        type: finalType,
        address: {
            street: document.getElementById('institution-street').value,
            city: document.getElementById('institution-city').value,
            state: document.getElementById('institution-state').value,
            zip: document.getElementById('institution-zip').value,
            country: document.getElementById('institution-country').value
        },
        email: document.getElementById('institution-email').value,
        website: document.getElementById('institution-website').value,
        phone: document.getElementById('institution-phone').value,
        adminEmail: document.getElementById('institution-admin').value,
        adminUsername: document.getElementById('admin-username').value,
        adminPassword: document.getElementById('admin-password').value,
        adminName: 'Administrator'
    };
    
    // Show loading indicator
    const submitBtn = document.querySelector('#institution-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    if (isEditing) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    } else {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }
    submitBtn.disabled = true;
    
    // Create or update institution via API
    const apiCall = isEditing ? 
        updateInstitutionViaAPI(institutionId, institutionData) : 
        createInstitutionViaAPI(institutionData);
    
    apiCall
        .then(() => {
            // Close form
            closeInstitutionForm();
            
            // Show success message
            const message = isEditing ? 'Institution updated successfully!' : 'Institution added successfully!';
            showNotification(message, 'success');
        })
        .catch(error => {
            console.error('Failed to save institution:', error);
            const message = isEditing ? 'Failed to update institution. Please try again.' : 'Failed to create institution. Please try again.';
            showNotification(message, 'error');
        })
        .finally(() => {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

function generateUniqueId() {
    // Simple ID generation for demo purposes
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function createInstitutionViaAPI(institutionData) {
    // Get base URL (same approach as in the AttendanceAPIClient)
    const baseURL = getAPIBaseURL();
    
    try {
        // Log detailed debug information
        console.log('Creating institution with data:', JSON.stringify(institutionData, null, 2));
        
        // Format the data for the API
        const requestData = {
            name: institutionData.name,
            regNumber: institutionData.regNumber,
            type: institutionData.type,
            address: institutionData.address,
            email: institutionData.email,
            website: institutionData.website,
            phone: institutionData.phone,
            adminUsername: institutionData.adminUsername,
            adminPassword: institutionData.adminPassword,
            adminName: institutionData.adminName || 'Administrator',
            adminEmail: institutionData.adminEmail
        };
        
        console.log('API URL:', `${baseURL}/institutions`);
        
        // Make API call - no token required for development
        const response = await fetch(`${baseURL}/institutions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status);
        
        const responseBody = await response.text();
        console.log('Response body:', responseBody);
        
        if (!response.ok) {
            let errorMessage = 'Failed to create institution';
            try {
                const errorData = JSON.parse(responseBody);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                console.error('Failed to parse error response:', e);
            }
            throw new Error(errorMessage);
        }
        
        const result = JSON.parse(responseBody);
        console.log('Institution created successfully:', result);
        
        // Save to localStorage as fallback
        saveInstitutionToLocalStorage(institutionData);
        
        // Refresh the institution list and update dashboard
        loadInstitutions();
        updateDashboardStats();
        
        return result;
    } catch (error) {
        console.error('Error creating institution:', error);
        throw error;
    }
}

function saveInstitutionToLocalStorage(institutionData) {
    // For fallback and development purposes, save to localStorage
    try {
        let institutions = JSON.parse(localStorage.getItem('institutions') || '[]');
        
        // Add a unique ID and creation timestamp
        const institutionWithId = {
            ...institutionData,
            id: generateUniqueId(),
            createdAt: new Date().toISOString()
        };
        
        institutions.push(institutionWithId);
        localStorage.setItem('institutions', JSON.stringify(institutions));
        console.log('Institution saved to localStorage as fallback');
    } catch (error) {
        console.error('Failed to save institution to localStorage:', error);
    }
}

function getAPIBaseURL() {
    // Check if we're on Replit
    if (window.location.hostname.includes('.repl.co') || 
        window.location.hostname.includes('.replit.dev')) {
        return `${window.location.protocol}//${window.location.host}/api`;
    }
    // Local development
    return 'http://localhost:3000/api';
}

async function loadInstitutions() {
    const institutionCards = document.querySelector('.institution-cards');
    const emptyState = document.getElementById('no-institutions-message');
    
    if(!institutionCards) return;
    
    // Show loading indicator
    institutionCards.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading institutions...</div>';
    
    try {
        // Get base URL
        const baseURL = getAPIBaseURL();
        
        // Make API call to fetch institutions
        const response = await fetch(`${baseURL}/institutions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch institutions');
        }
        
        const result = await response.json();
        console.log('Institutions loaded from API:', result);
        const institutions = result.data || [];
        
        // Clear previous content including the loading indicator
        institutionCards.innerHTML = '';
        
        // Add back the empty state message if it existed
        if(emptyState) {
            institutionCards.appendChild(emptyState);
        }
        
        // Show/hide empty state
        if(institutions.length === 0) {
            if(emptyState) emptyState.style.display = 'block';
        } else {
            if(emptyState) emptyState.style.display = 'none';
            
            // Render institution cards
            institutions.forEach(institution => {
                const card = createInstitutionCard(institution);
                institutionCards.appendChild(card);
            });
        }
        
        // Update dashboard stats after loading institutions
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading institutions:', error);
        institutionCards.innerHTML = '<div class="error-message">Failed to load institutions. Please try again.</div>';
        
        // Show retry button
        const retryBtn = document.createElement('button');
        retryBtn.textContent = 'Retry';
        retryBtn.className = 'btn-secondary';
        retryBtn.onclick = loadInstitutions;
        institutionCards.appendChild(retryBtn);
            }
        } catch (e) {
            console.error('Error loading fallback institutions:', e);
        }
    }
}

function createInstitutionCard(institution) {
    const card = document.createElement('div');
    card.className = 'institution-card';
    // Get the institution type label
    const typeLabels = {
        nursery: "Nursery School",
        primary_school: "Primary School",
        junior_secondary: "Junior Secondary School",
        senior_secondary: "Senior Secondary School",
        college_of_education: "College of Education",
        polytechnic: "Polytechnic",
        university: "University",
        technical_college: "Technical College",
        vocational_center: "Vocational Center",
        other: "Other Institution"
    };
    
    // If the type is not in our predefined labels, it must be a custom type
    const typeLabel = institution.type ? (typeLabels[institution.type] || institution.type) : "";
    
    card.innerHTML = `
        <h3>${institution.name}</h3>
        <div class="institution-type-eiin">
            ${typeLabel ? `<span class="institution-type">${typeLabel}</span>` : ''}
            ${institution.regNumber ? `<span class="institution-eiin">Reg #: ${institution.regNumber}</span>` : ''}
        </div>
        <div class="institution-meta">
            <p><i class="fas fa-envelope"></i> ${institution.email}</p>
            ${institution.website ? `<p><i class="fas fa-globe"></i> ${institution.website}</p>` : ''}
            ${institution.phone ? `<p><i class="fas fa-phone"></i> ${institution.phone}</p>` : ''}
            ${institution.address ? `<p><i class="fas fa-map-marker-alt"></i> ${formatAddress(institution.address)}</p>` : ''}
            ${institution.adminCredentials?.username ? `<p><i class="fas fa-user-shield"></i> Admin: ${institution.adminCredentials.username}</p>` : ''}
            ${institution.institution_code ? `<p><i class="fas fa-code"></i> Code: ${institution.institution_code}</p>` : ''}
        </div>
        <div class="institution-actions">
            <button class="edit-btn" data-id="${institution.id}"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" data-id="${institution.id}"><i class="fas fa-trash"></i></button>
        </div>
    `;
    
    // Add event listeners
    card.querySelector('.edit-btn').addEventListener('click', () => editInstitution(institution.id));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteInstitution(institution.id));
    
    return card;
}

async function editInstitution(id) {
    try {
        // Fetch institution data from API
        const baseURL = getAPIBaseURL();
        const response = await fetch(`${baseURL}/institutions/${id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch institution data');
        }
        
        const result = await response.json();
        const institution = result.data;
        
        if (!institution) {
            showNotification('Institution not found', 'error');
            return;
        }
    
    // Populate the form
    document.getElementById('institution-name').value = institution.name;
    document.getElementById('institution-reg-number').value = institution.regNumber || '';
    
    // Check if the institution type is a predefined one or custom
    const institutionTypeSelect = document.getElementById('institution-type');
    const customTypeContainer = document.getElementById('custom-type-container');
    const customTypeInput = document.getElementById('custom-institution-type');
    
    const predefinedTypes = [
        'nursery', 'primary_school', 'junior_secondary', 'senior_secondary',
        'college_of_education', 'polytechnic', 'university', 
        'technical_college', 'vocational_center', ''
    ];
    
    if (predefinedTypes.includes(institution.type)) {
        institutionTypeSelect.value = institution.type || '';
        customTypeContainer.style.display = 'none';
        customTypeInput.removeAttribute('required');
    } else {
        // This is a custom type
        institutionTypeSelect.value = 'other';
        customTypeContainer.style.display = 'block';
        customTypeInput.setAttribute('required', 'required');
        customTypeInput.value = institution.type || '';
    }
    
    // Handle address fields
    if (institution.address) {
        if (typeof institution.address === 'object') {
            // New format with detailed address
            document.getElementById('institution-street').value = institution.address.street || '';
            document.getElementById('institution-city').value = institution.address.city || '';
            document.getElementById('institution-state').value = institution.address.state || '';
            document.getElementById('institution-zip').value = institution.address.zip || '';
            document.getElementById('institution-country').value = institution.address.country || '';
        } else {
            // Legacy format (single string)
            document.getElementById('institution-street').value = institution.address;
            document.getElementById('institution-city').value = '';
            document.getElementById('institution-state').value = '';
            document.getElementById('institution-zip').value = '';
            document.getElementById('institution-country').value = '';
        }
    }
    
    document.getElementById('institution-email').value = institution.email;
    document.getElementById('institution-website').value = institution.website || '';
    document.getElementById('institution-phone').value = institution.phone || '';
    document.getElementById('institution-admin').value = institution.adminEmail;
    
    // Set admin credentials - make these optional for editing
    document.getElementById('admin-username').value = institution.adminCredentials?.username || '';
    document.getElementById('admin-password').value = ''; // Don't populate password for security
    
    // Show institution code if available
    const codeDisplay = document.getElementById('institution-code-display');
    const codeValue = document.getElementById('display-institution-code');
    if (institution.institution_code && codeDisplay && codeValue) {
        codeValue.textContent = institution.institution_code;
        codeDisplay.style.display = 'block';
    }
    
    // Set form to edit mode
    const form = document.getElementById('institution-form');
    form.dataset.editing = 'true';
    form.dataset.institutionId = id;
    
    // Update form title and button text
    document.getElementById('institution-form-title').textContent = 'Edit Institution';
    document.querySelector('#save-institution').innerHTML = '<i class="fas fa-save"></i> Update Institution';
    
    // Make admin credentials optional for editing
    document.getElementById('admin-username').removeAttribute('required');
    document.getElementById('admin-password').removeAttribute('required');
    
    // Open the form
    openInstitutionForm();
    
    } catch (error) {
        console.error('Error loading institution for editing:', error);
        showNotification('Failed to load institution data', 'error');
    }
    
    // Handle admin credentials
    if (institution.adminCredentials) {
        document.getElementById('admin-username').value = institution.adminCredentials.username || '';
        document.getElementById('admin-password').value = institution.adminCredentials.password || '';
    } else {
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
    }
    
    // Update form submission handler
    const form = document.getElementById('institution-form');
    const oldHandler = form.onsubmit;
    form.onsubmit = function(event) {
        event.preventDefault();
        
        // Get the old institution type for comparison
        const oldType = institution.type;
        
        // Update institution
        institution.name = document.getElementById('institution-name').value;
        institution.regNumber = document.getElementById('institution-reg-number').value;
        
        // Handle institution type (predefined or custom)
        const selectedType = document.getElementById('institution-type').value;
        if (selectedType === 'other') {
            const customType = document.getElementById('custom-institution-type').value.trim();
            institution.type = customType || 'other';
        } else {
            institution.type = selectedType;
        }
        
        institution.address = {
            street: document.getElementById('institution-street').value,
            city: document.getElementById('institution-city').value,
            state: document.getElementById('institution-state').value,
            zip: document.getElementById('institution-zip').value,
            country: document.getElementById('institution-country').value
        };
        institution.email = document.getElementById('institution-email').value;
        institution.website = document.getElementById('institution-website').value;
        institution.phone = document.getElementById('institution-phone').value;
        institution.adminEmail = document.getElementById('institution-admin').value;
        institution.adminCredentials = {
            username: document.getElementById('admin-username').value,
            password: document.getElementById('admin-password').value
        };
        
        // Save back to storage
        localStorage.setItem('institutions', JSON.stringify(institutions));
        
        // Reset form handler
        form.onsubmit = oldHandler;
        
        // Close form and refresh
        closeInstitutionForm();
        loadInstitutions();
        
        // Update dashboard if institution type changed (which affects teacher/student counts)
        if (oldType !== institution.type) {
            updateDashboardStats();
        }
        
        showNotification('Institution updated successfully!', 'success');
    };
    
    // Open the form
    document.getElementById('institution-form-title').textContent = 'Edit Institution';
    openInstitutionForm();
}

async function deleteInstitution(id) {
    if (!confirm('Are you sure you want to delete this institution? This action cannot be undone and will remove all associated data.')) {
        return;
    }
    
    try {
        const baseURL = getAPIBaseURL();
        const response = await fetch(`${baseURL}/institutions/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete institution');
        }
        
        // Show success message
        showNotification('Institution deleted successfully', 'success');
        
        // Refresh the institution list and update dashboard
        loadInstitutions();
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error deleting institution:', error);
        showNotification('Failed to delete institution. Please try again.', 'error');
    }
}

async function deleteInstitution(id) {
    if(!confirm('Are you sure you want to delete this institution? This action cannot be undone.')) return;
    
    try {
        // Show loading indicator
        showNotification('Deleting institution...', 'info');
        
        // Get base URL
        const baseURL = getAPIBaseURL();
        
        // Make API call to delete institution
        const response = await fetch(`${baseURL}/institutions/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete institution');
        }
        
        const result = await response.json();
        
        // Refresh the list and update dashboard
        loadInstitutions();
        updateDashboardStats();
        showNotification('Institution deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting institution:', error);
        showNotification('Failed to delete institution: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="close-notification">&times;</button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.close-notification').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    });
}

// ===== DASHBOARD FUNCTIONS =====
async function updateDashboardStats() {
    try {
        const baseURL = getAPIBaseURL();
        const response = await fetch(`${baseURL}/superadmin/stats`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch superadmin statistics');
        }
        
        const result = await response.json();
        const stats = result.data;
        
        // Update the dashboard statistics with real data
        document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = stats.totalInstitutions || 0;
        document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = stats.totalTeachers || 0;
        document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = stats.totalStudents || 0;
        document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = stats.systemAdmins || 0;
        
        // Add animation effect to the numbers
        document.querySelectorAll('.stat-number').forEach(el => {
            el.classList.add('animate-pulse');
            setTimeout(() => {
                el.classList.remove('animate-pulse');
            }, 1000);
        });
        
        console.log('Dashboard stats updated:', stats);
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        
        // Fallback to localStorage data
        const institutions = JSON.parse(localStorage.getItem('institutions') || '[]');
        document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = institutions.length;
        document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = '0';
        document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = '0';
        document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = '1';
    }
}