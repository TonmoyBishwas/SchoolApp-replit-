// ===== STUDENT PORTAL JAVASCRIPT =====

// ===== GLOBAL VARIABLES =====
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let attendanceData = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeStudentPortal();
    checkAuthentication();
    loadStudentData();
    generateAttendanceCalendar();
});

// ===== PORTAL INITIALIZATION =====
function initializeStudentPortal() {
    // Set user information
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name || 'Student';
        document.getElementById('welcomeName').textContent = currentUser.name || 'Student';
        document.getElementById('studentName').textContent = currentUser.name || 'Tonmoy Ahmed';
        document.getElementById('studentId').textContent = currentUser.id || '444';
    }
    
    // Initialize dashboard stats
    updateDashboardStats();
    
    // Setup event listeners
    setupEventListeners();
}

function checkAuthentication() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'student') {
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
            loadMyAttendanceData();
            break;
        case 'grades':
            loadGradesData();
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
    // Simulate student stats
    const stats = {
        attendancePercentage: 94,
        averageGrade: 'B+',
        pendingAssignments: 3,
        unreadMessages: 2
    };
    
    // Update stat cards with animation
    animateStatCard('attendancePercentage', stats.attendancePercentage + '%');
    document.getElementById('averageGrade').textContent = stats.averageGrade;
    animateStatCard('pendingAssignments', stats.pendingAssignments);
    animateStatCard('unreadMessages', stats.unreadMessages);
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

// ===== ATTENDANCE FUNCTIONS =====
function loadMyAttendanceData() {
    // Simulate attendance data for the current month
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    // Generate sample attendance data
    generateSampleAttendanceData();
    
    // Load recent attendance records
    loadRecentAttendanceRecords();
}

function generateSampleAttendanceData() {
    // Clear existing data
    attendanceData = {};
    
    // Generate data for current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            attendanceData[day] = 'weekend';
        } else if (day <= new Date().getDate() && currentMonth === new Date().getMonth()) {
            // For past days in current month, randomly assign attendance (mostly present)
            attendanceData[day] = Math.random() > 0.1 ? 'present' : 'absent';
        } else {
            // Future days
            attendanceData[day] = 'future';
        }
    }
    
    // Ensure today is marked as present (from face recognition)
    const today = new Date().getDate();
    if (currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()) {
        attendanceData[today] = 'present';
    }
}

function loadRecentAttendanceRecords() {
    // This would normally fetch from the API
    const recentRecords = [
        {
            date: '2025-08-14',
            time: '10:07:56',
            status: 'Present',
            method: 'Face Recognition'
        },
        {
            date: '2025-08-13',
            time: '09:45:22',
            status: 'Present',
            method: 'Face Recognition'
        },
        {
            date: '2025-08-12',
            time: '10:15:33',
            status: 'Present',
            method: 'Face Recognition'
        }
    ];
    
    const tableBody = document.getElementById('recentAttendanceBody');
    if (tableBody) {
        tableBody.innerHTML = recentRecords.map(record => `
            <tr>
                <td>${record.date}</td>
                <td>${record.time}</td>
                <td><span class="status active">${record.status}</span></td>
                <td><span class="method-badge face-recognition">${record.method}</span></td>
            </tr>
        `).join('');
    }
}

// ===== CALENDAR FUNCTIONS =====
function generateAttendanceCalendar() {
    const calendar = document.getElementById('attendanceCalendar');
    if (!calendar) return;
    
    // Update month display
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthDisplay = document.getElementById('currentMonth');
    if (monthDisplay) {
        monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const headerElement = document.createElement('div');
        headerElement.className = 'calendar-day-header';
        headerElement.textContent = day;
        calendar.appendChild(headerElement);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Add attendance status class
        const status = attendanceData[day] || 'future';
        dayElement.classList.add(status);
        
        // Highlight today
        const today = new Date();
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        calendar.appendChild(dayElement);
    }
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateSampleAttendanceData();
    generateAttendanceCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateSampleAttendanceData();
    generateAttendanceCalendar();
}

// ===== EXPORT FUNCTIONS =====
function exportAttendance() {
    const currentUser = getCurrentUser();
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Create CSV content
    const headers = ['Date', 'Status', 'Method'];
    const csvData = [];
    
    // Add attendance data for current month
    for (let day = 1; day <= new Date(currentYear, currentMonth + 1, 0).getDate(); day++) {
        const status = attendanceData[day];
        if (status && status !== 'future' && status !== 'weekend') {
            const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            csvData.push([date, status === 'present' ? 'Present' : 'Absent', 'Face Recognition']);
        }
    }
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${currentUser.name || 'student'}_${monthNames[currentMonth]}_${currentYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Attendance data exported successfully', 'success');
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

// ===== PLACEHOLDER FUNCTIONS =====
function loadGradesData() {
    console.log('Loading grades data...');
}

// ===== CSS STYLES FOR STUDENT PORTAL =====
const studentPortalStyles = document.createElement('style');
studentPortalStyles.textContent = `
    /* Student Info Card */
    .student-info-card {
        background: var(--content-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        padding: var(--space-lg);
        margin-bottom: var(--space-xl);
        box-shadow: var(--shadow-sm);
    }
    
    .info-header {
        display: flex;
        align-items: center;
        gap: var(--space-lg);
    }
    
    .student-avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, var(--success-color), #059669);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 2rem;
        flex-shrink: 0;
    }
    
    .student-details {
        flex: 1;
    }
    
    .student-details h2 {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-sm) 0;
    }
    
    .student-details p {
        margin: var(--space-xs) 0;
        color: var(--text-muted);
        font-size: 0.875rem;
    }
    
    .attendance-status {
        text-align: center;
    }
    
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-sm) var(--space-md);
        border-radius: var(--radius-md);
        font-weight: var(--font-weight-semibold);
        font-size: 0.875rem;
    }
    
    .status-badge.present {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success-color);
        border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    /* Attendance Calendar */
    .attendance-calendar {
        background: var(--content-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        padding: var(--space-lg);
        margin-bottom: var(--space-lg);
    }
    
    .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-lg);
    }
    
    .calendar-header button {
        background: var(--royal-blue);
        color: var(--white);
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.25rem;
        transition: background-color var(--transition-fast);
    }
    
    .calendar-header button:hover {
        background: var(--navy-blue);
    }
    
    .calendar-header h3 {
        font-size: 1.25rem;
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        margin: 0;
    }
    
    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        margin-bottom: var(--space-md);
    }
    
    .calendar-day-header {
        padding: var(--space-sm);
        text-align: center;
        font-weight: var(--font-weight-semibold);
        color: var(--text-muted);
        font-size: 0.75rem;
        text-transform: uppercase;
    }
    
    .calendar-day {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        position: relative;
    }
    
    .calendar-day.empty {
        visibility: hidden;
    }
    
    .calendar-day.present {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success-color);
        border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    .calendar-day.absent {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
        border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .calendar-day.weekend {
        background: var(--light-gray);
        color: var(--text-muted);
    }
    
    .calendar-day.future {
        background: var(--light-gray);
        color: var(--text-muted);
    }
    
    .calendar-day.today {
        box-shadow: 0 0 0 2px var(--royal-blue);
        font-weight: var(--font-weight-bold);
    }
    
    .calendar-legend {
        display: flex;
        justify-content: center;
        gap: var(--space-lg);
        flex-wrap: wrap;
    }
    
    .legend-item {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        font-size: 0.875rem;
        color: var(--text-muted);
    }
    
    .legend-color {
        width: 16px;
        height: 16px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-color);
    }
    
    .legend-color.present {
        background: rgba(16, 185, 129, 0.5);
    }
    
    .legend-color.absent {
        background: rgba(239, 68, 68, 0.5);
    }
    
    .legend-color.weekend {
        background: var(--light-gray);
    }
    
    /* Recent Attendance */
    .recent-attendance {
        margin-top: var(--space-lg);
    }
    
    .recent-attendance h3 {
        font-size: 1.125rem;
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        margin-bottom: var(--space-md);
    }
    
    .method-badge {
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
    }
    
    .method-badge.face-recognition {
        background: rgba(59, 130, 246, 0.1);
        color: var(--info-color);
    }
    
    /* Events List */
    .events-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    
    .event-item {
        display: flex;
        gap: var(--space-md);
        padding: var(--space-sm) 0;
        border-bottom: 1px solid var(--border-color);
    }
    
    .event-item:last-child {
        border-bottom: none;
    }
    
    .event-date {
        text-align: center;
        min-width: 60px;
    }
    
    .date-day {
        font-size: 1.25rem;
        font-weight: var(--font-weight-bold);
        color: var(--royal-blue);
        line-height: 1;
    }
    
    .date-month {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-transform: uppercase;
    }
    
    .event-details h4 {
        font-size: 0.875rem;
        font-weight: var(--font-weight-semibold);
        color: var(--navy-blue);
        margin: 0 0 var(--space-xs) 0;
    }
    
    .event-details p {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin: 0 0 var(--space-xs) 0;
    }
    
    .event-time {
        font-size: 0.75rem;
        color: var(--royal-blue);
        font-weight: var(--font-weight-medium);
    }
    
    /* Additional stat card styles */
    .stat-icon.grades {
        background: linear-gradient(135deg, var(--warning-color), #d97706);
    }
    
    .stat-icon.assignments {
        background: linear-gradient(135deg, var(--info-color), #2563eb);
    }
    
    .stat-icon.messages {
        background: linear-gradient(135deg, var(--primary-red), #dc2626);
    }
    
    .present-status {
        color: var(--success-color) !important;
        font-weight: var(--font-weight-bold);
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
        .info-header {
            flex-direction: column;
            text-align: center;
            gap: var(--space-md);
        }
        
        .calendar-legend {
            gap: var(--space-md);
        }
        
        .legend-item {
            font-size: 0.75rem;
        }
        
        .dashboard-widgets {
            grid-template-columns: 1fr;
        }
    }
    
    @media (max-width: 480px) {
        .calendar-day {
            font-size: 0.75rem;
        }
        
        .calendar-header h3 {
            font-size: 1rem;
        }
        
        .student-details h2 {
            font-size: 1.25rem;
        }
    }
`;

document.head.appendChild(studentPortalStyles);