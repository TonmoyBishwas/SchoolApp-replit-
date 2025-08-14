// ===== MAIN JAVASCRIPT FOR CHEICK MOHAMED SCHOOL WEBSITE =====

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let isLoggedIn = false;

// Demo credentials for different roles
const demoCredentials = {
    admin: { username: 'admin123', password: 'admin123', name: 'Administrator', id: 'ADM001' },
    teacher: { username: 'teacher001', password: 'teacher123', name: 'John Doe', id: 'TCH001' },
    student: { username: 'student444', password: 'student123', name: 'Tonmoy Ahmed', id: '444' },
    parent: { username: 'parent001', password: 'parent123', name: 'Sarah Smith', id: 'PAR001' }
};

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', function() {
    initializeWebsite();
    setupEventListeners();
    setupScrollAnimations();
});

// ===== WEBSITE INITIALIZATION =====
function initializeWebsite() {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isLoggedIn = true;
        updateLoginButton();
    }

    // Add smooth scrolling polyfill for older browsers
    if (!CSS.supports('scroll-behavior', 'smooth')) {
        loadSmoothScrollPolyfill();
    }

    // Initialize animations
    animateOnScroll();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Mobile menu toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', toggleMobileMenu);
    }

    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeLoginModal();
            }
        });
    }

    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeLoginModal();
        }
    });

    // Auto-update footer year
    updateFooterYear();
}

// ===== MOBILE MENU FUNCTIONS =====
function toggleMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
}

function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== SCROLL FUNCTIONS =====
function scrollToPortals() {
    const portalsSection = document.getElementById('portals');
    if (portalsSection) {
        portalsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToAbout() {
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===== ANIMATION FUNCTIONS =====
function setupScrollAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.portal-card, .feature-item, .contact-item');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

function animateOnScroll() {
    // Add CSS for scroll animations
    const style = document.createElement('style');
    style.textContent = `
        .portal-card, .feature-item, .contact-item {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease-out;
        }
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// ===== LOGIN MODAL FUNCTIONS =====
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        clearLoginForm();
    }
}

function clearLoginForm() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.reset();
    }
}

function loginAs(role) {
    const modal = document.getElementById('loginModal');
    const roleSelect = document.getElementById('role');
    const loginTitle = document.getElementById('loginTitle');
    
    if (roleSelect) {
        roleSelect.value = role;
    }
    
    if (loginTitle) {
        const roleNames = {
            admin: 'Administrator',
            teacher: 'Teacher',
            student: 'Student',
            parent: 'Parent'
        };
        loginTitle.textContent = `${roleNames[role]} Portal Login`;
    }
    
    openLoginModal();
}

// ===== AUTHENTICATION FUNCTIONS =====
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    
    // Validate inputs
    if (!username || !password || !role) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Check credentials
    const credentials = demoCredentials[role];
    if (credentials && credentials.username === username && credentials.password === password) {
        // Successful login
        currentUser = {
            role: role,
            username: username,
            name: credentials.name,
            id: credentials.id,
            loginTime: new Date().toISOString()
        };
        
        isLoggedIn = true;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showNotification(`Welcome ${credentials.name}!`, 'success');
        closeLoginModal();
        updateLoginButton();
        
        // Redirect to appropriate portal
        setTimeout(() => {
            redirectToPortal(role);
        }, 1500);
        
    } else {
        showNotification('Invalid credentials. Please check username, password, and role.', 'error');
    }
}

function logout() {
    currentUser = null;
    isLoggedIn = false;
    localStorage.removeItem('currentUser');
    updateLoginButton();
    showNotification('Logged out successfully', 'info');
    
    // Redirect to home page if on portal page
    if (window.location.pathname.includes('portal')) {
        window.location.href = 'index.html';
    }
}

function updateLoginButton() {
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        if (isLoggedIn && currentUser) {
            loginBtn.innerHTML = `
                <i class="fas fa-user"></i> 
                ${currentUser.name} 
                <i class="fas fa-chevron-down"></i>
            `;
            loginBtn.onclick = toggleUserMenu;
        } else {
            loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Login`;
            loginBtn.onclick = openLoginModal;
        }
    }
}

function toggleUserMenu() {
    // Create user dropdown menu
    let userMenu = document.querySelector('.user-menu');
    
    if (userMenu) {
        userMenu.remove();
        return;
    }
    
    userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
        <div class="user-menu-content">
            <div class="user-info">
                <strong>${currentUser.name}</strong>
                <small>${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</small>
            </div>
            <hr>
            <a href="#" onclick="redirectToPortal('${currentUser.role}')">
                <i class="fas fa-tachometer-alt"></i> Dashboard
            </a>
            <a href="#" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </a>
        </div>
    `;
    
    // Style the menu
    userMenu.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 200px;
        margin-top: 10px;
    `;
    
    const menuContent = userMenu.querySelector('.user-menu-content');
    menuContent.style.cssText = `
        padding: 15px;
    `;
    
    document.querySelector('.nav-logo').style.position = 'relative';
    document.querySelector('.nav-logo').appendChild(userMenu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!userMenu.contains(e.target) && !document.querySelector('.login-btn').contains(e.target)) {
                userMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function redirectToPortal(role) {
    const portalUrls = {
        admin: 'portals/admin.html',
        teacher: 'portals/teacher.html',
        student: 'portals/student.html',
        parent: 'portals/parent.html'
    };
    
    if (portalUrls[role]) {
        window.location.href = portalUrls[role];
    }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
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
        top: 100px;
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

// ===== UTILITY FUNCTIONS =====
function updateFooterYear() {
    const yearElements = document.querySelectorAll('.current-year');
    const currentYear = new Date().getFullYear();
    yearElements.forEach(el => {
        el.textContent = currentYear;
    });
}

function loadSmoothScrollPolyfill() {
    // Simple smooth scroll polyfill for older browsers
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/iamdustan/smoothscroll@v1.4.10/src/smoothscroll.js';
    document.head.appendChild(script);
}

// ===== PERFORMANCE OPTIMIZATIONS =====
// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimize scroll performance
window.addEventListener('scroll', debounce(() => {
    // Add any scroll-based animations or effects here
}, 16)); // ~60fps

// ===== ACCESSIBILITY ENHANCEMENTS =====
document.addEventListener('keydown', function(e) {
    // Tab navigation for modal
    if (e.key === 'Tab') {
        const modal = document.getElementById('loginModal');
        if (modal && modal.style.display === 'block') {
            const focusableElements = modal.querySelectorAll('input, button, select');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
});

// ===== CSS ANIMATIONS =====
// Add required CSS for animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
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
    
    .user-menu a {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        color: #374151;
        text-decoration: none;
        transition: color 0.2s;
    }
    
    .user-menu a:hover {
        color: #1e40af;
    }
    
    .user-menu hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 10px 0;
    }
    
    .user-info {
        margin-bottom: 10px;
    }
    
    .user-info strong {
        display: block;
        color: #1f2937;
    }
    
    .user-info small {
        color: #6b7280;
        text-transform: uppercase;
        font-size: 0.75rem;
    }
`;
document.head.appendChild(animationStyles);

// ===== EXPORT FOR PORTAL PAGES =====
window.SchoolWebsite = {
    currentUser,
    isLoggedIn,
    logout,
    showNotification,
    redirectToPortal
};