// Redirect script for /admin URL
(function() {
    // Check if URL ends with /admin
    const currentPath = window.location.pathname;
    if (currentPath.endsWith('/admin') || currentPath === '/admin') {
        window.location.href = '/portals/superadmin.html';
    }
})();
