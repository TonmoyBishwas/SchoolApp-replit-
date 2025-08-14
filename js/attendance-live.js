// ===== LIVE ATTENDANCE PAGE JAVASCRIPT =====

// Global variables
let attendanceData = [];
let autoRefreshInterval;
let isAutoRefreshEnabled = true;
let lastUpdateTime = null;

// API Configuration
const API_CONFIG = {
    baseURL: getAPIBaseURL(),
    endpoints: {
        attendance: '/attendance/public'
    },
    refreshInterval: 10000 // 10 seconds
};

// Get API base URL based on current environment
function getAPIBaseURL() {
    if (window.location.hostname.includes('.replit.dev') || 
        window.location.hostname.includes('.repl.co')) {
        return `${window.location.protocol}//${window.location.host}/api`;
    }
    return 'http://localhost:3000/api';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Live Attendance Page Initialized');
    console.log('🌐 API Base URL:', API_CONFIG.baseURL);
    
    // Load initial data
    loadAttendanceData();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
});

// ===== DATA FETCHING =====

async function loadAttendanceData() {
    try {
        showLoadingState();
        console.log('📡 Fetching attendance data...');
        
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.attendance}?limit=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ API Response:', result);
        
        if (result.success && result.data && Array.isArray(result.data)) {
            attendanceData = result.data;
            lastUpdateTime = new Date();
            
            console.log(`✅ Loaded ${attendanceData.length} attendance records`);
            displayAttendanceData();
            updateStatistics();
            hideLoadingState();
        } else {
            throw new Error('Invalid API response format');
        }
        
    } catch (error) {
        console.error('❌ Error loading attendance data:', error);
        showErrorState(error.message);
    }
}

// ===== DATA DISPLAY =====

function displayAttendanceData() {
    const recordsContainer = document.getElementById('attendanceRecords');
    const emptyState = document.getElementById('emptyState');
    
    if (!attendanceData || attendanceData.length === 0) {
        recordsContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    // Sort by date and time (newest first)
    const sortedData = [...attendanceData].sort((a, b) => {
        const dateTimeA = new Date(`${a.date} ${a.time}`);
        const dateTimeB = new Date(`${b.date} ${b.time}`);
        return dateTimeB - dateTimeA;
    });
    
    recordsContainer.innerHTML = '';
    recordsContainer.style.display = 'grid';
    emptyState.style.display = 'none';
    
    sortedData.forEach((record, index) => {
        const recordElement = createAttendanceRecord(record, index);
        recordsContainer.appendChild(recordElement);
    });
    
    // Add animation delay for visual effect
    const records = recordsContainer.querySelectorAll('.attendance-record');
    records.forEach((record, index) => {
        record.style.animationDelay = `${index * 50}ms`;
    });
}

function createAttendanceRecord(record, index) {
    const recordDiv = document.createElement('div');
    recordDiv.className = 'attendance-record';
    
    // Determine record age for styling
    const recordTime = new Date(`${record.date} ${record.time}`);
    const now = new Date();
    const hoursDiff = (now - recordTime) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) {
        recordDiv.classList.add('new');
    } else if (hoursDiff < 24) {
        recordDiv.classList.add('recent');
    } else {
        recordDiv.classList.add('older');
    }
    
    // Generate student initials for avatar
    const initials = record.student_name 
        ? record.student_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'ST';
    
    // Format time for display
    const timeFormatted = formatTime(record.time);
    const dateFormatted = formatDate(record.date);
    const relativeTime = getRelativeTime(recordTime);
    
    recordDiv.innerHTML = `
        <div class="record-header">
            <div class="student-info">
                <div class="student-avatar" style="background: ${getGradientForStudent(record.student_id)}">
                    ${initials}
                </div>
                <div class="student-details">
                    <h4>${record.student_name || 'Unknown Student'}</h4>
                    <div class="student-id">ID: ${record.student_id}</div>
                </div>
            </div>
            <div class="record-meta">
                <div class="record-time">${timeFormatted}</div>
                <div class="record-date">${dateFormatted}</div>
            </div>
        </div>
        <div class="record-details">
            <div class="department-badge">${record.department || 'N/A'}</div>
            <div class="attendance-status">
                <i class="fas fa-check-circle"></i>
                <span>Present • ${relativeTime}</span>
            </div>
        </div>
    `;
    
    return recordDiv;
}

// ===== STATISTICS =====

function updateStatistics() {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceData.filter(record => record.date === today);
    
    // Update today's count
    document.getElementById('todayCount').textContent = todayRecords.length;
    document.getElementById('todayTime').textContent = `Updated ${formatTime(new Date().toTimeString())}`;
    
    // Update total count
    document.getElementById('totalCount').textContent = attendanceData.length;
    
    // Update last update time
    if (lastUpdateTime) {
        document.getElementById('lastUpdate').textContent = formatTime(lastUpdateTime.toTimeString());
        document.getElementById('lastUpdateTime').textContent = getRelativeTime(lastUpdateTime);
    }
}

// ===== AUTO REFRESH =====

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    if (isAutoRefreshEnabled) {
        autoRefreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing attendance data...');
            loadAttendanceData();
        }, API_CONFIG.refreshInterval);
        
        updateAutoRefreshButton();
    }
}

function toggleAutoRefresh() {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    
    if (isAutoRefreshEnabled) {
        startAutoRefresh();
        console.log('✅ Auto-refresh enabled');
    } else {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        console.log('⏸️ Auto-refresh disabled');
    }
    
    updateAutoRefreshButton();
}

function updateAutoRefreshButton() {
    const button = document.getElementById('autoRefreshToggle');
    if (isAutoRefreshEnabled) {
        button.innerHTML = '<i class="fas fa-pause"></i> Auto Refresh: ON';
        button.classList.remove('disabled');
    } else {
        button.innerHTML = '<i class="fas fa-play"></i> Auto Refresh: OFF';
        button.classList.add('disabled');
    }
}

// ===== MANUAL REFRESH =====

async function refreshAttendance() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const originalHTML = refreshBtn.innerHTML;
    
    // Show spinning icon
    refreshBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    try {
        await loadAttendanceData();
        
        // Show success feedback
        refreshBtn.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
        setTimeout(() => {
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        setTimeout(() => {
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
        }, 2000);
    }
}

// ===== STATE MANAGEMENT =====

function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('attendanceRecords').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loadingState').style.display = 'none';
}

function showErrorState(message) {
    hideLoadingState();
    const emptyState = document.getElementById('emptyState');
    emptyState.innerHTML = `
        <div class="empty-icon">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Error Loading Data</h3>
        <p>${message}</p>
        <button onclick="loadAttendanceData()" style="margin-top: 16px; padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
            <i class="fas fa-retry"></i> Retry
        </button>
    `;
    emptyState.style.display = 'block';
    document.getElementById('attendanceRecords').style.display = 'none';
}

// ===== UTILITY FUNCTIONS =====

function formatTime(timeString) {
    try {
        const time = new Date(`2000-01-01 ${timeString}`);
        return time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    } catch {
        return timeString;
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function getGradientForStudent(studentId) {
    const gradients = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)',
        'linear-gradient(135deg, #a8edea, #fed6e3)',
        'linear-gradient(135deg, #ffecd2, #fcb69f)',
        'linear-gradient(135deg, #ff8a80, #ea6100)'
    ];
    
    const id = parseInt(studentId) || 0;
    return gradients[id % gradients.length];
}

// ===== KEYBOARD SHORTCUTS =====

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // R key to refresh
        if (e.key === 'r' || e.key === 'R') {
            if (!e.ctrlKey && !e.altKey) {
                e.preventDefault();
                refreshAttendance();
            }
        }
        
        // Space key to toggle auto-refresh
        if (e.key === ' ' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            toggleAutoRefresh();
        }
        
        // Escape key to go back
        if (e.key === 'Escape') {
            window.location.href = 'index.html';
        }
    });
}

// ===== CLEANUP =====

window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});

// ===== EXPOSE FUNCTIONS FOR TESTING =====
window.attendanceLive = {
    loadAttendanceData,
    refreshAttendance,
    toggleAutoRefresh,
    API_CONFIG
};