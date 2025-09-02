# Frontend Portal System Architecture

## Main Website (`index.html`)
- Landing page with school information and portal access
- Role-based login modal with demo credentials
- Responsive navigation with mobile hamburger menu
- Sections: Hero, About, Portals, Contact
- Live Attendance link in navigation

## Portal System Structure

### Portal Files
- `portals/admin.html` - Administrative dashboard
- `portals/teacher.html` - Teacher management interface
- `portals/student.html` - Student academic dashboard
- `portals/parent.html` - Parent monitoring interface
- `portals/superadmin.html` - Multi-institution management

### JavaScript Architecture

#### Main Website (`js/main.js`)
- Global authentication state management
- Demo credentials for all roles
- Portal routing and login functionality
- Mobile menu handling and smooth scrolling
- Modal management for login/logout

#### Portal-Specific Scripts (`js/portals/`)
- `admin.js` - Admin portal functionality with attendance management
- `teacher.js` - Teacher portal for class and student management
- `student.js` - Student portal for academic resources
- `parent.js` - Parent portal for child monitoring
- `superadmin.js` - Super admin multi-institution management

#### API Client (`js/api-client.js`)
- `AttendanceAPIClient` class for real-time data
- Environment detection (Replit vs localhost)
- JWT token management
- Institution-based API calls

#### Specialized Components
- `js/attendance-live.js` - Live attendance page functionality
- `js/admin-redirect.js` - Automatic admin portal routing

## Authentication Flow
1. User selects portal type from main page
2. Login modal opens with role-specific context
3. Credentials validated against demo or API
4. JWT token stored in localStorage
5. User redirected to appropriate portal
6. Portal loads with user-specific data

## Portal Features by Role

### Admin Portal
- Real-time attendance monitoring
- Student management with photo uploads
- Institution management
- Live attendance feed with auto-refresh
- Comprehensive dashboard with statistics

### Teacher Portal  
- Class management
- Student attendance tracking
- Grade submission
- Communication tools

### Student Portal
- Academic dashboard
- Attendance history
- Grade viewing
- School announcements

### Parent Portal
- Child progress monitoring
- Teacher communication
- Fee management
- School events

### Super Admin Portal
- Multi-institution management
- System-wide statistics
- Institution creation and management

## CSS Architecture

### Main Stylesheets
- `css/main.css` - Base styles and components
- `css/responsive.css` - Mobile responsiveness
- `css/attendance-live.css` - Live attendance page styles

### Portal Styles
- `css/portals/portal.css` - Portal-specific layouts and components
- `css/portals/form-section.css` - Form styling
- `css/portals/modal-fix.css` - Modal and popup fixes

## Key Frontend Features
- Responsive design for all devices
- Real-time data updates
- Modal-based interactions
- File upload with drag-and-drop
- Live attendance monitoring
- Institution-based data organization
- Role-based UI components
- Demo mode with sample credentials

## Data Flow
1. API client handles all backend communication
2. JWT tokens manage authentication state
3. Institution ID filters data appropriately
4. Real-time updates via polling intervals
5. Local storage maintains session state