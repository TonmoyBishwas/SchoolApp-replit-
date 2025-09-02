// ===== TEACHER PORTAL JAVASCRIPT =====

// ===== GLOBAL VARIABLES =====
let selectedClass = '10A';
let attendanceData = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeTeacherPortal();
    checkAuthentication();
    loadTeacherData();
    loadClassData();
});

// ===== PORTAL INITIALIZATION =====
function initializeTeacherPortal() {
    // Set user information
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name || 'Teacher';
        document.getElementById('welcomeName').textContent = currentUser.name || 'Teacher';
        document.getElementById('teacherName').textContent = currentUser.name || 'John Doe';
        document.getElementById('teacherId').textContent = currentUser.id || 'TCH001';
    }
    
    // Initialize dashboard stats
    updateDashboardStats();
    
    // Set today's date
    setTodayDate();
    
    // Setup event listeners
    setupEventListeners();
}

function checkAuthentication() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'teacher') {
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
    
    // Class selector change event
    const classSelector = document.getElementById('attendanceClassSelector');
    if (classSelector) {
        classSelector.addEventListener('change', function(e) {
            selectedClass = e.target.value;
            loadAttendanceForClass(selectedClass);
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
            loadAttendanceData();
            break;
        case 'my-classes':
            loadClassData();
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
    // Simulate teacher stats
    const stats = {
        totalClasses: 6,
        totalStudents: 145,
        attendanceRate: 92,
        pendingGrading: 8
    };
    
    // Update stat cards with animation
    animateStatCard('totalClasses', stats.totalClasses);
    animateStatCard('totalStudents', stats.totalStudents);
    animateStatCard('attendanceRate', stats.attendanceRate + '%');
    animateStatCard('pendingGrading', stats.pendingGrading);
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

function setTodayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString('en-US', options);
    
    const dateElement = document.getElementById('todayDate');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

function refreshActivity() {
    const refreshBtn = document.querySelector('.widget-refresh');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        setTimeout(() => {
            refreshBtn.innerHTML = '<i class="fas fa-refresh"></i>';
            showNotification('Activity feed refreshed', 'success');
        }, 1000);
    }
}

// ===== CLASS MANAGEMENT FUNCTIONS =====
function loadClassData() {
    // Simulate class data loading
    console.log('Loading class data...');
}

function viewClassDetails(classId) {
    showNotification(`Viewing details for Class ${classId}`, 'info');
}

function takeAttendance(classId) {
    selectedClass = classId;
    showSection('attendance');
    showNotification(`Taking attendance for Class ${classId}`, 'info');
}

// ===== ATTENDANCE FUNCTIONS =====
function loadAttendanceData() {
    // Generate sample attendance data
    attendanceData = [
        {
            studentName: 'Tonmoy Ahmed',
            studentId: '444',
            status: 'Present',
            time: '10:07:56',
            method: 'Face Recognition'
        },
        {
            studentName: 'Sarah Johnson',
            studentId: '445',
            status: 'Present',
            time: '09:15:32',
            method: 'Face Recognition'
        },
        {
            studentName: 'Ahmed Hassan',
            studentId: '446',
            status: 'Absent',
            time: '-',
            method: '-'
        }
    ];
    
    updateAttendanceTable();
    updateAttendanceSummary();
}

function loadAttendanceForClass(classId) {
    // Load attendance data for specific class
    console.log(`Loading attendance for class: ${classId}`);
    loadAttendanceData(); // For now, load same data
}

function updateAttendanceTable() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = attendanceData.map(record => `
        <tr>
            <td>${record.studentName}</td>
            <td>${record.studentId}</td>
            <td><span class="status ${record.status.toLowerCase()}">${record.status}</span></td>
            <td>${record.time}</td>
            <td>${record.method !== '-' ? `<span class="method-badge face-recognition">${record.method}</span>` : '-'}</td>
            <td>
                <button class="btn-icon" onclick="editAttendance('${record.studentId}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateAttendanceSummary() {
    const present = attendanceData.filter(record => record.status === 'Present').length;
    const absent = attendanceData.filter(record => record.status === 'Absent').length;
    const late = attendanceData.filter(record => record.status === 'Late').length;
    const total = attendanceData.length;
    
    // Update summary display
    const summaryElements = {
        total: total,
        present: present,
        absent: absent,
        late: late,
        percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
    };
    
    // Find and update summary elements if they exist
    const attendanceOverview = document.querySelector('.attendance-summary');
    if (attendanceOverview) {
        attendanceOverview.innerHTML = `
            <div class="summary-stat">
                <h3>Today's Attendance</h3>
                <div class="stat-value">${present}/${total}</div>
                <div class="stat-percentage">${summaryElements.percentage}%</div>
            </div>
            <div class="summary-stat">
                <h3>Present</h3>
                <div class="stat-value present">${present}</div>
            </div>
            <div class="summary-stat">
                <h3>Absent</h3>
                <div class="stat-value absent">${absent}</div>
            </div>
            <div class="summary-stat">
                <h3>Late</h3>
                <div class="stat-value late">${late}</div>
            </div>
        `;
    }
}

function submitAttendance() {
    showNotification('Attendance submitted successfully!', 'success');
    
    // Simulate API call
    setTimeout(() => {
        updateDashboardStats();
    }, 1000);
}

function editAttendance(studentId) {
    const student = attendanceData.find(record => record.studentId === studentId);
    if (student) {
        const newStatus = prompt(`Change attendance status for ${student.studentName}:`, student.status);
        if (newStatus && ['Present', 'Absent', 'Late'].includes(newStatus)) {
            student.status = newStatus;
            student.time = newStatus === 'Present' ? new Date().toTimeString().slice(0, 8) : '-';
            student.method = newStatus === 'Present' ? 'Manual Entry' : '-';
            
            updateAttendanceTable();
            updateAttendanceSummary();
            showNotification(`Attendance updated for ${student.studentName}`, 'success');
        }
    }
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

// ===== CSS STYLES FOR TEACHER PORTAL =====
const teacherPortalStyles = document.createElement('style');
teacherPortalStyles.textContent = `
    /* Teacher Info Card */
    .teacher-info-card {
        background: var(--content-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        padding: var(--space-lg);
        margin-bottom: var(--space-xl);
        box-shadow: var(--shadow-sm);
    }
    
    .teacher-avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, var(--royal-blue), #2563eb);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 2rem;
        flex-shrink: 0;
    }
    
    .teacher-details {
        flex: 1;
    }
    
    .teacher-details h2 {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-sm) 0;
    }
    
    .teacher-details p {
        margin: var(--space-xs) 0;
        color: var(--text-muted);
        font-size: 0.875rem;
    }
    
    .today-schedule {
        text-align: center;
    }
    
    .schedule-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-sm) var(--space-md);
        background: rgba(59, 130, 246, 0.1);
        color: var(--royal-blue);
        border-radius: var(--radius-md);
        font-weight: var(--font-weight-semibold);
        font-size: 0.875rem;
        border: 1px solid rgba(59, 130, 246, 0.2);
    }
    
    .date-badge {
        background: var(--light-gray);
        color: var(--text-muted);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
    }
    
    /* Schedule List */
    .schedule-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    
    .schedule-item {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md);
        background: var(--light-gray);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
    }
    
    .schedule-item:hover {
        background: rgba(59, 130, 246, 0.05);
        border-left: 4px solid var(--royal-blue);
    }
    
    .schedule-time {
        text-align: center;
        min-width: 80px;
    }
    
    .time-start {
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        font-size: 0.875rem;
    }
    
    .time-end {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    
    .schedule-details {
        flex: 1;
    }
    
    .schedule-details h4 {
        font-size: 0.875rem;
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-xs) 0;
    }
    
    .schedule-details p {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin: 0;
    }
    
    .schedule-status {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
    }
    
    .schedule-status.current {
        background: var(--success-color);
        color: var(--white);
    }
    
    .schedule-status.upcoming {
        background: var(--warning-color);
        color: var(--white);
    }
    
    /* Class Cards */
    .classes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: var(--space-lg);
    }
    
    .class-card {
        background: var(--content-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        padding: var(--space-lg);
        transition: all var(--transition-fast);
    }
    
    .class-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--royal-blue);
    }
    
    .class-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--space-md);
    }
    
    .class-info h3 {
        font-size: 1.125rem;
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-xs) 0;
    }
    
    .class-info p {
        color: var(--text-muted);
        margin: 0;
        font-size: 0.875rem;
    }
    
    .student-count {
        background: rgba(59, 130, 246, 0.1);
        color: var(--royal-blue);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
    }
    
    .class-details {
        margin-bottom: var(--space-md);
    }
    
    .detail-item {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        margin-bottom: var(--space-xs);
        font-size: 0.875rem;
        color: var(--text-muted);
    }
    
    .detail-item i {
        width: 16px;
        color: var(--royal-blue);
    }
    
    .class-actions {
        display: flex;
        gap: var(--space-sm);
    }
    
    .btn-sm {
        padding: var(--space-xs) var(--space-sm);
        border: none;
        border-radius: var(--radius-md);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        background: var(--royal-blue);
        color: var(--white);
    }
    
    .btn-sm:hover {
        background: var(--navy-blue);
        transform: translateY(-1px);
    }
    
    .btn-sm.secondary {
        background: var(--light-gray);
        color: var(--dark-gray);
        border: 1px solid var(--border-color);
    }
    
    .btn-sm.secondary:hover {
        background: var(--border-color);
    }
    
    /* Attendance Summary */
    .attendance-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--space-lg);
    }
    
    .summary-stat {
        text-align: center;
    }
    
    .summary-stat h3 {
        font-size: 0.875rem;
        font-weight: var(--font-weight-medium);
        color: var(--text-muted);
        margin: 0 0 var(--space-sm) 0;
        text-transform: uppercase;
    }
    
    .summary-stat .stat-value {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold);
        margin-bottom: var(--space-xs);
    }
    
    .summary-stat .stat-value.present {
        color: var(--success-color);
    }
    
    .summary-stat .stat-value.absent {
        color: var(--danger-color);
    }
    
    .summary-stat .stat-value.late {
        color: var(--warning-color);
    }
    
    .summary-stat .stat-percentage {
        font-size: 1.125rem;
        font-weight: var(--font-weight-semibold);
        color: var(--success-color);
    }
    
    /* Class Selector */
    .class-selector {
        padding: var(--space-xs) var(--space-sm);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        background: var(--white);
        color: var(--dark-gray);
    }
    
    /* Status badges */
    .status.present {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success-color);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
    }
    
    .status.absent {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
    }
    
    .status.late {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning-color);
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
        
        .classes-grid {
            grid-template-columns: 1fr;
        }
        
        .schedule-item {
            flex-direction: column;
            text-align: center;
            gap: var(--space-sm);
        }
        
        .class-actions {
            justify-content: center;
        }
    }
`;

document.head.appendChild(teacherPortalStyles);