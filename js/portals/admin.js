// ===== ADMIN PORTAL JAVASCRIPT =====

// ===== GLOBAL VARIABLES =====
let attendanceData = [];
let isLiveAttendanceActive = false;
let attendanceUpdateInterval;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeAdminPortal();
        checkAuthentication();
        
        // Load attendance data immediately
        setTimeout(async () => {
            console.log('🚀 Starting attendance data load...');
            console.log('🌐 Current location:', window.location.href);
            
            try {
                // Check API availability first
                const isAPIAvailable = await isRealAttendanceAvailable();
                
                await loadAttendanceData();
                
                // Only start live updates if API is available
                if (isAPIAvailable) {
                    startLiveAttendanceFeed();
                } else {
                    console.log('⚠️ API not available, live updates disabled');
                }
            } catch (error) {
                console.error('❌ Critical error loading attendance data:', error);
                // Show empty data as fallback
                console.log('🔄 Showing empty attendance data...');
                attendanceData = [];
                clearPlaceholderData();
                updateAttendanceTable();
                console.log('✅ Data initialized successfully');
            }
        }, 100);
    } catch (error) {
        console.error('Error initializing admin portal:', error);
    }
});

// ===== PORTAL INITIALIZATION =====
function initializeAdminPortal() {
    // Set user information
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name || 'Administrator';
    }
    
    // Initialize dashboard
    updateDashboardStats();
    loadRecentActivity();
    
    // Setup event listeners
    setupEventListeners();
}

function checkAuthentication() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../index.html';
        return;
    }
    
    // Update UI with institution info if available
    if (currentUser.institution_name) {
        updateInstitutionUI(currentUser);
    }
}

function getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
}

function updateInstitutionUI(user) {
    // Update the portal header with institution name
    const portalTypeElem = document.querySelector('.portal-type');
    if (portalTypeElem && user.institution_name) {
        portalTypeElem.textContent = `${user.institution_name} - Admin Portal`;
    }
    
    // Update the school info section with institution name
    const schoolInfoElem = document.querySelector('.school-info h2');
    if (schoolInfoElem && user.institution_name) {
        schoolInfoElem.textContent = user.institution_name;
    }
    
    // Update the user name display
    const userNameElem = document.getElementById('userName');
    if (userNameElem && user.name) {
        userNameElem.textContent = user.name;
    }
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
            refreshAttendanceData();
            break;
        case 'students':
            loadStudentData();
            break;
        case 'add-student':
            prepareAddStudentForm();
            break;
        case 'teachers':
            loadTeacherData();
            break;
        case 'dashboard':
            updateDashboardStats();
            loadRecentActivity();
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

function showProfile() {
    // Placeholder for profile functionality
    showNotification('Profile feature coming soon!', 'info');
}

function logout() {
    localStorage.removeItem('currentUser');
    showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1000);
}

// ===== DASHBOARD FUNCTIONS =====
async function updateDashboardStats() {
    try {
        // Show loading state
        document.querySelectorAll('.stat-card .stat-value').forEach(el => {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        
        // Get base URL for API
        const baseURL = getAPIBaseURL();
        
        // Get the auth token from the current user session
        const user = getCurrentUser();
        const token = user ? user.token : null;
        
        // Fetch institution stats
        const response = await fetch(`${baseURL}/institution/stats`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch institution stats');
        }
        
        const result = await response.json();
        const stats = result.data || {
            totalStudents: 0,
            totalTeachers: 0,
            totalClasses: 0,
            attendanceRate: 0,
            newStudentsThisMonth: 0,
            newTeachersThisMonth: 0,
            attendanceRateChange: 0
        };
        
        // Update stat cards with animation
        animateStatCard('totalStudents', stats.totalStudents);
        animateStatCard('totalTeachers', stats.totalTeachers);
        animateStatCard('totalClasses', stats.totalClasses);
        animateStatCard('attendanceRate', stats.attendanceRate + '%');
        
        // Update trend indicators
        updateTrendIndicator('student-trend', stats.newStudentsThisMonth);
        updateTrendIndicator('teacher-trend', stats.newTeachersThisMonth);
        updateTrendIndicator('attendance-trend', stats.attendanceRateChange);
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        // Use zero fallback data - no hardcoded dummy values
        const stats = {
            totalStudents: 0,
            totalTeachers: 0,
            totalClasses: 0,
            attendanceRate: 0
        };
        
        animateStatCard('totalStudents', stats.totalStudents);
        animateStatCard('totalTeachers', stats.totalTeachers);
        animateStatCard('totalClasses', stats.totalClasses);
        animateStatCard('attendanceRate', stats.attendanceRate + '%');
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

function updateTrendIndicator(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (value > 0) {
        element.innerHTML = `+${value} this month`;
        element.classList.add('positive');
        element.classList.remove('negative', 'neutral');
    } else if (value < 0) {
        element.innerHTML = `${value} this month`;
        element.classList.add('negative');
        element.classList.remove('positive', 'neutral');
    } else {
        element.innerHTML = 'No change';
        element.classList.add('neutral');
        element.classList.remove('positive', 'negative');
    }
}

function animateStatCard(elementId, finalValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const isPercentage = String(finalValue).includes('%');
    const numericValue = isPercentage ? parseInt(finalValue) : finalValue;
    
    let currentValue = 0;
    const increment = numericValue / 50;
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
    }, 30);
}

function loadRecentActivity() {
    // TODO: Replace with real activity data from API
    // For now, show empty state instead of dummy data
    const activities = [];
    
    const activityList = document.getElementById('activityList');
    if (activityList) {
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="empty-activity-state">
                    <i class="fas fa-clock" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                    <p style="color: #999; text-align: center;">No recent activity</p>
                </div>
            `;
        } else {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.description}</p>
                        <span class="activity-time">${activity.time}</span>
                    </div>
                </div>
            `).join('');
        }
    }
}

function refreshActivity() {
    const refreshBtn = document.querySelector('.widget-refresh');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        setTimeout(() => {
            loadRecentActivity();
            refreshBtn.innerHTML = '<i class="fas fa-refresh"></i>';
            showNotification('Activity feed refreshed', 'success');
        }, 1000);
    }
}

// ===== ATTENDANCE FUNCTIONS =====
async function loadAttendanceData() {
    try {
        console.log('🔄 Starting to load attendance data...');
        
        // Check if API is available
        const isAPIAvailable = await isRealAttendanceAvailable();
        
        if (isAPIAvailable) {
            console.log('📊 Loading real attendance data from API...');
            const rawData = await window.attendanceAPI.fetchAttendanceData(100);
            
            if (rawData && rawData.length > 0) {
                attendanceData = window.attendanceAPI.formatAttendanceData(rawData);
                
                // Clear placeholder data and show real data
                clearPlaceholderData();
                
                // Initialize live feed with recent records
                const recentRecords = attendanceData.slice(0, 5);
                updateLiveAttendanceFeed(recentRecords);
                
                console.log(`✅ Loaded ${attendanceData.length} attendance records`);
            } else {
                console.log('⚠️ No attendance data found');
                attendanceData = [];
            }
        } else {
            console.log('⚠️ API not available, no attendance data will be shown');
            attendanceData = [];
        }
        
        updateAttendanceTable();
        updateAttendanceStats();
        
        // Start real-time updates if not already running
        if (window.attendanceUpdater && !window.attendanceUpdater.isRunning) {
            window.attendanceUpdater.start();
        }
        
        console.log('✅ Attendance data loading completed');
        
    } catch (error) {
        console.error('❌ Error loading attendance data:', error);
        
        // Show empty attendance data
        attendanceData = [];
        updateAttendanceTable();
        console.log('⚠️ No attendance data available');
        
        if (typeof showNotification === 'function') {
            showNotification('Unable to load attendance data', 'warning');
        }
    }
}

function updateAttendanceTable() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;
    
    if (!attendanceData || attendanceData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No attendance records found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = attendanceData.map(record => `
        <tr>
            <td>${record.date}</td>
            <td>${record.time}</td>
            <td>${record.name}</td>
            <td>${record.id}</td>
            <td>${record.dept}</td>
            <td><span class="status active">${record.status || 'Present'}</span></td>
        </tr>
    `).join('');
}

async function updateAttendanceStats() {
    try {
        const stats = await window.attendanceAPI.fetchAttendanceStats();
        
        // Update attendance overview stats
        const attendanceOverview = document.querySelector('.attendance-overview .attendance-stats');
        if (attendanceOverview) {
            attendanceOverview.innerHTML = `
                <div class="attendance-stat">
                    <h3>Today's Attendance</h3>
                    <div class="stat-value">${stats.todayAttendance}/${stats.totalStudents}</div>
                    <div class="stat-percentage">${stats.todayAttendanceRate}%</div>
                </div>
                <div class="attendance-stat">
                    <h3>This Week</h3>
                    <div class="stat-value">${stats.weekAttendance}/2,615</div>
                    <div class="stat-percentage">88.5%</div>
                </div>
                <div class="attendance-stat">
                    <h3>This Month</h3>
                    <div class="stat-value">${stats.monthAttendance}/11,437</div>
                    <div class="stat-percentage">86.4%</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating attendance stats:', error);
    }
}

async function refreshAttendanceData() {
    const refreshBtn = document.querySelector('[onclick="refreshAttendanceData()"]');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        
        try {
            // Force refresh attendance data from API
            await loadAttendanceData();
            refreshBtn.innerHTML = originalText;
            showNotification('Attendance data refreshed', 'success');
        } catch (error) {
            refreshBtn.innerHTML = originalText;
            showNotification('Error refreshing attendance data', 'error');
            console.error('Error refreshing attendance:', error);
        }
    }
}

function exportAttendance() {
    // Create CSV content
    const headers = ['Date', 'Time', 'Student Name', 'ID', 'Department', 'Status'];
    const csvContent = [
        headers.join(','),
        ...attendanceData.map(record => 
            `${record.date},${record.time},${record.name},${record.id},${record.dept},Present`
        )
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Attendance data exported successfully', 'success');
}

// ===== LIVE ATTENDANCE FEED =====
async function startLiveAttendanceFeed() {
    // Check if API is available before starting
    const isAPIAvailable = await isRealAttendanceAvailable();
    
    if (!isAPIAvailable) {
        console.log('⚠️ API not available, live attendance feed disabled');
        return;
    }
    
    isLiveAttendanceActive = true;
    
    // Start polling for new attendance data every 5 seconds
    attendanceUpdateInterval = setInterval(() => {
        if (isLiveAttendanceActive) {
            checkForNewAttendance();
        }
    }, 5000);
    
    console.log('✅ Live attendance feed started');
}

function stopLiveAttendanceFeed() {
    isLiveAttendanceActive = false;
    if (attendanceUpdateInterval) {
        clearInterval(attendanceUpdateInterval);
    }
}

async function checkForNewAttendance() {
    try {
        // Fetch fresh attendance data from API
        const isAPIAvailable = await isRealAttendanceAvailable();
        
        if (!isAPIAvailable) {
            // If API is not available, don't try to fetch new data
            return;
        }
        
        const freshData = await window.attendanceAPI.fetchAttendanceData(10); // Get last 10 records
        
        // Verify we actually got data back
        if (!freshData || freshData.length === 0) {
            return;
        }
        
        const formattedData = window.attendanceAPI.formatAttendanceData(freshData);
        
        // Check if we have new records compared to current data
        const newRecords = formattedData.filter(record => {
            // Additional validation to ensure we have proper data
            if (!record.id && !record.student_id) {
                return false;
            }
            
            return !attendanceData.some(existing => 
                existing.date === record.date && 
                existing.time === record.time && 
                existing.id === record.id
            );
        });
        
        if (newRecords.length > 0) {
            console.log(`Found ${newRecords.length} new attendance records`);
            
            // Add new records to the beginning of our data
            attendanceData = [...newRecords, ...attendanceData].slice(0, 100);
            
            // Update the attendance table
            updateAttendanceTable();
            
            // Only update live feed if we have valid records with names and IDs
            const validRecords = newRecords.filter(r => (r.name || r.student_name) && (r.id || r.student_id));
            if (validRecords.length > 0) {
                updateLiveAttendanceFeed(validRecords);
            }
            
            // Update dashboard stats
            updateAttendanceStats();
        }
    } catch (error) {
        console.error('Error checking for new attendance:', error);
    }
}


function clearPlaceholderData() {
    const attendanceFeed = document.getElementById('attendanceFeed');
    if (attendanceFeed) {
        // Remove all existing items including placeholders
        attendanceFeed.innerHTML = '';
    }
}

function updateLiveAttendanceFeed(newRecords) {
    const attendanceFeed = document.getElementById('attendanceFeed');
    if (!attendanceFeed) return;
    
    // Remove placeholder if it exists
    const placeholder = attendanceFeed.querySelector('.feed-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    // Check if we have records to display
    if (!newRecords || newRecords.length === 0) {
        attendanceFeed.innerHTML = '<div class="feed-placeholder">No attendance records available</div>';
        return;
    }
    
    // Add new records to the feed
    newRecords.forEach((record, index) => {
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        
        // Calculate time difference for "time ago" display
        const timeDisplay = getTimeDisplay(record.date, record.time);
        
        feedItem.innerHTML = `
            <div class="student-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="feed-content">
                <p><strong>${record.name}</strong> (ID: ${record.id})</p>
                <span class="feed-time">${timeDisplay}</span>
                <span class="feed-status present">Present</span>
            </div>
        `;
        
        // Add with animation for new records only (first few)
        if (index < 3) {
            feedItem.style.opacity = '0';
            feedItem.style.transform = 'translateY(-20px)';
            attendanceFeed.insertBefore(feedItem, attendanceFeed.firstChild);
            
            // Animate in
            setTimeout(() => {
                feedItem.style.transition = 'all 0.3s ease-out';
                feedItem.style.opacity = '1';
                feedItem.style.transform = 'translateY(0)';
            }, 100 * index);
        } else {
            attendanceFeed.appendChild(feedItem);
        }
    });
    
    // Keep only last 5 items in feed
    const feedItems = attendanceFeed.querySelectorAll('.feed-item');
    if (feedItems.length > 5) {
        for (let i = 5; i < feedItems.length; i++) {
            feedItems[i].remove();
        }
    }
}

function getTimeDisplay(date, time) {
    try {
        const recordDateTime = new Date(`${date}T${time}`);
        const now = new Date();
        const diffMinutes = Math.floor((now - recordDateTime) / (1000 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hr ago`;
        return 'Earlier today';
    } catch (error) {
        return 'Recently';
    }
}

// ===== STUDENT MANAGEMENT =====
async function loadStudentData() {
    try {
        console.log('Loading student data...');
        
        // Get authentication token and user information
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const token = user.token;
        
        if (!token) {
            console.log('No authentication token found');
            updateStudentsTable([]);
            updateStudentStats(0);
            return;
        }
        
        // Fetch students from API - the backend already filters by institution_id for admin users
        const response = await fetch(`${window.attendanceAPI.baseURL}/students`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                console.log(`Loaded ${result.data.length} students from API`);
                updateStudentsTable(result.data);
                updateStudentStats(result.data.length);
            } else {
                console.log('API returned success but no data');
                updateStudentsTable([]);
                updateStudentStats(0);
            }
        } else {
            console.log(`API request failed with status ${response.status}`);
            updateStudentsTable([]);
            updateStudentStats(0);
        }
    } catch (error) {
        console.error('Error loading student data:', error);
        updateStudentsTable([]);
        updateStudentStats(0);
    }
}

function updateStudentsTable(students) {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) {
        console.error('Students table body not found');
        return;
    }
    
    if (students.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No students found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = students.map(student => `
        <tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.class || student.department || 'N/A'}</td>
            <td>${student.department}</td>
            <td><span class="status ${student.status === 'active' ? 'active' : 'inactive'}">${student.status === 'active' ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-icon" title="View" onclick="viewStudent('${student.id}')"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Edit" onclick="editStudent('${student.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" title="Delete" onclick="deleteStudent('${student.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function updateStudentStats(count) {
    const totalStudentsElement = document.getElementById('totalStudents');
    if (totalStudentsElement) {
        // Animate the count
        animateStatCard('totalStudents', count);
    }
}

function viewStudent(studentId) {
    showNotification(`View student ${studentId} - Feature coming soon!`, 'info');
}

function editStudent(studentId) {
    showNotification(`Edit student ${studentId} - Feature coming soon!`, 'info');
}

async function deleteStudent(studentId) {
    if (confirm(`Are you sure you want to delete student ${studentId}?`)) {
        try {
            // Get token from currentUser in localStorage
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.token) {
                showNotification('Authentication error. Please log in again.', 'error');
                return;
            }
            const token = currentUser.token;
            
            // Show loading notification
            showNotification(`Deleting student ${studentId}...`, 'info');
            
            // Make API request to delete student
            const response = await fetch(`${window.attendanceAPI.baseURL}/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to delete student: ${response.status}`);
                } catch (e) {
                    throw new Error(`Failed to delete student: ${response.status} ${response.statusText}`);
                }
            }
            
            // Show success notification
            showNotification(`Student ${studentId} deleted successfully`, 'success');
            
            // Reload student data to reflect the change
            loadStudentData();
            
        } catch (error) {
            console.error('Error deleting student:', error);
            showNotification(`Error deleting student: ${error.message}`, 'error');
        }
    }
}

function prepareAddStudentForm() {
    // Clear the form
    document.getElementById('addStudentForm').reset();
    
    // Generate a unique student ID suggestion
    const randomId = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('studentId').value = randomId;
    
    // Generate a username suggestion from the ID
    document.getElementById('studentUsername').value = `student${randomId}`;
    
    // Clear any previous photo previews
    for (let i = 1; i <= 5; i++) {
        const previewElement = document.getElementById(`photoPreview${i}`);
        if (previewElement) {
            previewElement.innerHTML = '';
            previewElement.style.backgroundImage = '';
        }
    }
    
    // Setup form submission
    setupAddStudentForm();
}

// Function to preview student photos when selected
function previewStudentPhoto(input, photoIndex) {
    const previewElement = document.getElementById(`photoPreview${photoIndex}`);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Create image element
            previewElement.innerHTML = `
                <img src="${e.target.result}" alt="Student Photo ${photoIndex}">
                <div class="remove-photo" onclick="removeStudentPhoto(${photoIndex})">
                    <i class="fas fa-times"></i>
                </div>
            `;
        }
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Function to remove a selected photo
function removeStudentPhoto(photoIndex) {
    const inputElement = document.getElementById(`studentPhoto${photoIndex}`);
    const previewElement = document.getElementById(`photoPreview${photoIndex}`);
    
    // Clear the file input
    inputElement.value = '';
    
    // Clear the preview
    previewElement.innerHTML = '';
}

// Function no longer needed - removed
// Navigation is now handled by showSection('students')

function setupAddStudentForm() {
    const form = document.getElementById('addStudentForm');
    
    // Remove any existing event listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new event listener
    newForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Disable submit button and show loading state
        const submitBtn = newForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        try {
            await addNewStudent(newForm);
            showSection('students'); // Go back to students section
            showNotification('Student added successfully', 'success');
            
            // Reload student data
            loadStudentData();
        } catch (error) {
            console.error('Error adding student:', error);
            showNotification('Error adding student: ' + error.message, 'error');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

async function addNewStudent(form) {
    // Get student data
    const studentName = form.studentName.value.trim();
    const studentId = form.studentId.value.trim();
    
    // Check for student photos
    let hasPhotos = false;
    for (let i = 1; i <= 5; i++) {
        const photoInput = document.getElementById(`studentPhoto${i}`);
        if (photoInput.files && photoInput.files[0]) {
            hasPhotos = true;
            break;
        }
    }
    
    // Create a FormData object to handle file uploads
    const formData = new FormData();
    
    // Add student details to FormData
    formData.append('id', studentId);
    formData.append('name', studentName);
    formData.append('department', form.studentDept.value.trim());
    formData.append('class', form.studentClass.value.trim());
    formData.append('status', form.studentStatus.value);
    formData.append('email', form.studentEmail.value.trim());
    formData.append('phone', form.studentPhone.value.trim());
    formData.append('username', form.studentUsername.value.trim());
    formData.append('password', form.studentPassword.value.trim());
    
    // Add photos to FormData if available
    for (let i = 1; i <= 5; i++) {
        const photoInput = document.getElementById(`studentPhoto${i}`);
        if (photoInput.files && photoInput.files[0]) {
            formData.append('photos', photoInput.files[0]);
        }
    }
    
    // Get current user's token
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const token = currentUser.token;
    
    // Add institution ID if available
    if (currentUser.institution_id) {
        formData.append('institution_id', currentUser.institution_id);
    }
    
    if (!token) {
        throw new Error('You must be logged in to add students');
    }
    
    // First attempt to create the student with basic info
    let response;
    
    if (hasPhotos) {
        // Send API request with photos
        response = await fetch(`${window.attendanceAPI.baseURL}/students`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type when sending FormData with files
            },
            body: formData
        });
    } else {
        // If no photos, use the regular endpoint with JSON
        const studentData = {
            id: studentId,
            name: studentName,
            department: form.studentDept.value.trim(),
            class: form.studentClass.value.trim(),
            status: form.studentStatus.value,
            email: form.studentEmail.value.trim(),
            phone: form.studentPhone.value.trim(),
            username: form.studentUsername.value.trim(),
            password: form.studentPassword.value.trim()
        };
        
        response = await fetch(`${window.attendanceAPI.baseURL}/students`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });
    }
    
    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add student');
        } catch (e) {
            // If response is not valid JSON
            throw new Error(`Failed to add student: ${response.status} ${response.statusText}`);
        }
    }
    
    try {
        return await response.json();
    } catch (e) {
        throw new Error('Invalid response from server');
    }
}

// ===== TEACHER MANAGEMENT =====
function loadTeacherData() {
    // Placeholder for teacher data loading
    console.log('Loading teacher data...');
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

// ===== MOBILE SIDEBAR TOGGLE =====
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.portal-sidebar');
    sidebar.classList.toggle('active');
}

// ===== CLEANUP =====
window.addEventListener('beforeunload', function() {
    stopLiveAttendanceFeed();
});

// ===== CSS ANIMATIONS =====
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    }
`;
document.head.appendChild(notificationStyles);