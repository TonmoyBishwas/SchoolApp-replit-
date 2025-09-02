// ===== PARENT PORTAL JAVASCRIPT =====

// ===== GLOBAL VARIABLES =====
let selectedChild = 'all';
let childrenData = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeParentPortal();
    checkAuthentication();
    loadParentData();
    loadChildrenData();
});

// ===== PORTAL INITIALIZATION =====
function initializeParentPortal() {
    // Set user information
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name || 'Parent';
        document.getElementById('welcomeName').textContent = currentUser.name || 'Parent';
        document.getElementById('parentName').textContent = currentUser.name || 'Sarah Smith';
        document.getElementById('parentId').textContent = currentUser.id || 'PAR001';
    }
    
    // Initialize dashboard stats
    updateDashboardStats();
    
    // Setup event listeners
    setupEventListeners();
}

function checkAuthentication() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'parent') {
        window.location.href = '../index.html';
        return;
    }
}

function getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('userMenuDropdown');
        const userMenu = document.querySelector('.portal-user');
        
        if (dropdown && !userMenu.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // Child selector change event
    const childSelector = document.getElementById('childSelector');
    if (childSelector) {
        childSelector.addEventListener('change', function(e) {
            selectedChild = e.target.value;
            loadDataForChild(selectedChild);
        });
    }
    
    // Handle window resize for responsive sidebar
    window.addEventListener('resize', handleResize);
}

function handleResize() {
    const sidebar = document.querySelector('.portal-sidebar');
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
    }
}

// ===== NAVIGATION FUNCTIONS =====
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active state from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active state to corresponding nav item
    const activeNavItem = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Load section-specific data
    loadSectionData(sectionId);
    
    // Close mobile sidebar if open
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.portal-sidebar');
        sidebar.classList.remove('active');
    }
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'attendance':
            loadChildrenAttendanceData();
            break;
        case 'children':
            loadChildrenData();
            break;
        case 'dashboard':
            updateDashboardStats();
            break;
    }
}

// ===== USER MENU FUNCTIONS =====
function toggleUserMenu() {
    const dropdown = document.getElementById('userMenuDropdown');
    const toggle = document.querySelector('.user-menu-toggle');
    
    dropdown.classList.toggle('active');
    toggle.classList.toggle('active');
}

function logout() {
    localStorage.removeItem('currentUser');
    showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1000);
}

// ===== DASHBOARD FUNCTIONS =====
function updateDashboardStats() {
    // Simulate parent dashboard stats
    const stats = {
        combinedAttendance: 93,
        averageGrade: 'B+',
        pendingAssignments: 4,
        feeStatus: 'Paid'
    };
    
    // Update stat cards with animation
    animateStatCard('combinedAttendance', stats.combinedAttendance + '%');
    document.getElementById('averageGrade').textContent = stats.averageGrade;
    animateStatCard('pendingAssignments', stats.pendingAssignments);
    document.getElementById('feeStatus').textContent = stats.feeStatus;
}

function animateStatCard(elementId, finalValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const isPercentage = String(finalValue).includes('%');
    const numericValue = isPercentage ? parseInt(finalValue) : finalValue;
    
    if (typeof numericValue !== 'number') {
        element.textContent = finalValue;
        return;
    }
    
    let currentValue = 0;
    const increment = numericValue / 30;
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= numericValue) {
            element.textContent = finalValue;
            clearInterval(timer);
        } else {
            element.textContent = isPercentage ? 
                Math.floor(currentValue) + '%' : 
                Math.floor(currentValue);
        }
    }, 50);
}

function refreshUpdates() {
    const refreshBtn = document.querySelector('.widget-refresh');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        setTimeout(() => {
            refreshBtn.innerHTML = '<i class="fas fa-refresh"></i>';
            showNotification('Updates refreshed', 'success');
        }, 1000);
    }
}

// ===== CHILDREN DATA FUNCTIONS =====
function loadChildrenData() {
    // Simulate children data
    childrenData = [
        {
            id: '445',
            name: 'Emma Smith',
            grade: 'Grade 10A',
            department: 'Mathematics & Science',
            dateOfBirth: 'March 15, 2009',
            attendance: 95,
            averageGrade: 'B+',
            classRank: '8th',
            status: 'Present'
        },
        {
            id: '446',
            name: 'James Smith',
            grade: 'Grade 8B',
            department: 'General Studies',
            dateOfBirth: 'July 22, 2011',
            attendance: 92,
            averageGrade: 'A-',
            classRank: '5th',
            status: 'Present'
        }
    ];
    
    // Update children overview if on dashboard
    updateChildrenOverview();
}

function updateChildrenOverview() {
    // This would update the children cards on the dashboard
    console.log('Updating children overview with:', childrenData);
}

function loadDataForChild(childId) {
    if (childId === 'all') {
        // Load combined data for all children
        loadChildrenAttendanceData();
    } else {
        // Load data for specific child
        const child = childrenData.find(c => c.id === childId);
        if (child) {
            console.log(`Loading data for ${child.name}`);
            loadChildrenAttendanceData(childId);
        }
    }
}

// ===== ATTENDANCE FUNCTIONS =====
function loadChildrenAttendanceData(childId = null) {
    // Generate sample attendance data
    const attendanceRecords = [
        {
            childName: 'Emma Smith',
            childId: '445',
            date: '2025-08-14',
            time: '09:15:22',
            status: 'Present',
            method: 'Face Recognition'
        },
        {
            childName: 'James Smith',
            childId: '446',
            date: '2025-08-14',
            time: '09:22:45',
            status: 'Present',
            method: 'Face Recognition'
        },
        {
            childName: 'Emma Smith',
            childId: '445',
            date: '2025-08-13',
            time: '09:08:15',
            status: 'Present',
            method: 'Face Recognition'
        },
        {
            childName: 'James Smith',
            childId: '446',
            date: '2025-08-13',
            time: '09:18:30',
            status: 'Present',
            method: 'Face Recognition'
        }
    ];
    
    // Filter by child if specified
    const filteredRecords = childId ? 
        attendanceRecords.filter(record => record.childId === childId) : 
        attendanceRecords;
    
    updateAttendanceTable(filteredRecords);
    updateAttendanceStats(filteredRecords);
}

function updateAttendanceTable(records) {
    const tableBody = document.querySelector('#attendance .data-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = records.map(record => `
        <tr>
            <td>${record.childName}</td>
            <td>${record.date}</td>
            <td>${record.time}</td>
            <td><span class="status present">${record.status}</span></td>
            <td><span class="method-badge face-recognition">${record.method}</span></td>
        </tr>
    `).join('');
}

function updateAttendanceStats(records) {
    // Calculate attendance statistics
    const totalDays = 23; // Days in current month so far
    const presentDays = records.filter(r => r.status === 'Present').length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    // Update attendance overview
    const attendanceOverview = document.querySelector('#attendance .attendance-stats');
    if (attendanceOverview) {
        attendanceOverview.innerHTML = `
            <div class="attendance-stat">
                <h3>This Month</h3>
                <div class="stat-value">${presentDays}/${totalDays}</div>
                <div class="stat-percentage">${attendanceRate}%</div>
            </div>
            <div class="attendance-stat">
                <h3>This Week</h3>
                <div class="stat-value">9/10</div>
                <div class="stat-percentage">90%</div>
            </div>
            <div class="attendance-stat">
                <h3>Today</h3>
                <div class="stat-value present-status">Present</div>
                <div class="stat-percentage">Both Children</div>
            </div>
        `;
    }
}

// ===== PARENT DATA FUNCTIONS =====
function loadParentData() {
    // Set default parent contact information
    const parentInfo = {
        email: 'sarah.smith@email.com',
        phone: '+224 XXX XXX XXX'
    };
    
    const emailElement = document.getElementById('parentEmail');
    const phoneElement = document.getElementById('parentPhone');
    
    if (emailElement) emailElement.textContent = parentInfo.email;
    if (phoneElement) phoneElement.textContent = parentInfo.phone;
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getIconForType(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        z-index: 2000;
        background: ${getColorForType(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getIconForType(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getColorForType(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

// ===== CSS STYLES FOR PARENT PORTAL =====
const parentPortalStyles = document.createElement('style');
parentPortalStyles.textContent = `
    /* Parent Info Card */
    .parent-info-card {
        background: var(--content-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        padding: var(--space-lg);
        margin-bottom: var(--space-xl);
        box-shadow: var(--shadow-sm);
    }
    
    .parent-avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, var(--academic-gold), #f59e0b);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 2rem;
        flex-shrink: 0;
    }
    
    .parent-details {
        flex: 1;
    }
    
    .parent-details h2 {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-sm) 0;
    }
    
    .parent-details p {
        margin: var(--space-xs) 0;
        color: var(--text-muted);
        font-size: 0.875rem;
    }
    
    .children-summary {
        text-align: center;
    }
    
    .summary-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-sm) var(--space-md);
        background: rgba(245, 158, 11, 0.1);
        color: var(--academic-gold);
        border-radius: var(--radius-md);
        font-weight: var(--font-weight-semibold);
        font-size: 0.875rem;
        border: 1px solid rgba(245, 158, 11, 0.2);
    }
    
    /* Children Overview */
    .children-overview {
        margin-bottom: var(--space-xl);
    }
    
    .children-overview h2 {
        font-size: 1.25rem;
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        margin-bottom: var(--space-md);
    }
    
    .children-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: var(--space-lg);
    }
    
    .child-card {
        background: var(--content-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        padding: var(--space-lg);
        transition: all var(--transition-fast);
    }
    
    .child-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--success-color);
    }
    
    .child-avatar {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, var(--success-color), #059669);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 1.5rem;
        flex-shrink: 0;
    }
    
    .child-info {
        flex: 1;
    }
    
    .child-info h3 {
        font-size: 1.125rem;
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-xs) 0;
    }
    
    .child-info p {
        color: var(--text-muted);
        margin: var(--space-xs) 0;
        font-size: 0.875rem;
    }
    
    .child-status {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        min-width: 150px;
    }
    
    .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
    }
    
    .status-item .label {
        color: var(--text-muted);
        font-weight: var(--font-weight-medium);
    }
    
    .status-item .value {
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
    }
    
    .status-item .value.success {
        color: var(--success-color);
    }
    
    /* Children Detailed View */
    .children-detailed {
        display: flex;
        flex-direction: column;
        gap: var(--space-xl);
    }
    
    .child-detail-card {
        background: var(--content-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        padding: var(--space-xl);
        box-shadow: var(--shadow-sm);
    }
    
    .child-header {
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
    }
    
    .child-photo {
        width: 100px;
        height: 100px;
        background: linear-gradient(135deg, var(--success-color), #059669);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 2.5rem;
        flex-shrink: 0;
    }
    
    .child-basic-info {
        flex: 1;
    }
    
    .child-basic-info h2 {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-md) 0;
    }
    
    .child-basic-info p {
        margin: var(--space-xs) 0;
        color: var(--text-muted);
        font-size: 0.875rem;
    }
    
    .child-performance {
        display: flex;
        gap: var(--space-lg);
        align-items: center;
    }
    
    .performance-metric {
        text-align: center;
        min-width: 80px;
    }
    
    .metric-value {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold);
        color: var(--navy-blue);
        margin-bottom: var(--space-xs);
    }
    
    .metric-label {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-transform: uppercase;
        font-weight: var(--font-weight-medium);
    }
    
    /* Updates List */
    .updates-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    
    .update-item {
        display: flex;
        gap: var(--space-sm);
        padding: var(--space-sm) 0;
        border-bottom: 1px solid var(--border-color);
    }
    
    .update-item:last-child {
        border-bottom: none;
    }
    
    .update-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 0.75rem;
        flex-shrink: 0;
    }
    
    .update-icon.success {
        background: var(--success-color);
    }
    
    .update-icon.info {
        background: var(--info-color);
    }
    
    .update-icon.warning {
        background: var(--warning-color);
    }
    
    .update-content p {
        margin: 0 0 var(--space-xs) 0;
        font-size: 0.875rem;
        color: var(--dark-gray);
    }
    
    .update-time {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    
    /* Child Selector */
    .child-selector {
        padding: var(--space-xs) var(--space-sm);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        background: var(--white);
        color: var(--dark-gray);
    }
    
    /* Additional stat card styles */
    .stat-icon.fees {
        background: linear-gradient(135deg, var(--academic-gold), #d97706);
    }
    
    .present-status {
        color: var(--success-color) !important;
        font-weight: var(--font-weight-bold);
    }
    
    .method-badge.face-recognition {
        background: rgba(59, 130, 246, 0.1);
        color: var(--info-color);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
    }
    
    .status.present {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success-color);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
        .info-header {
            flex-direction: column;
            text-align: center;
            gap: var(--space-md);
        }
        
        .children-grid {
            grid-template-columns: 1fr;
        }
        
        .child-header {
            flex-direction: column;
            text-align: center;
            gap: var(--space-md);
        }
        
        .child-performance {
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .child-status {
            min-width: unset;
            width: 100%;
        }
    }
    
    @media (max-width: 480px) {
        .child-detail-card {
            padding: var(--space-lg);
        }
        
        .child-photo {
            width: 80px;
            height: 80px;
            font-size: 2rem;
        }
        
        .performance-metric {
            min-width: 60px;
        }
        
        .metric-value {
            font-size: 1.25rem;
        }
    }
`;

document.head.appendChild(parentPortalStyles);