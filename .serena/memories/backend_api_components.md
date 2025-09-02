# Backend API Components and Endpoints

## Server Configuration (`backend/server.js`)
- **Port**: 3000 (configurable via environment)
- **JWT Secret**: Environment-based with fallback
- **Database**: SQLite with automatic initialization
- **File Uploads**: Multer with institution-based organization

## API Endpoints

### Institution Management
- `POST /api/institutions` - Create new institution
- `GET /api/institutions` - List all institutions  
- `GET /api/institutions/:id` - Get specific institution
- `DELETE /api/institutions/:id` - Delete institution

### Authentication
- `POST /api/auth/login` - User login with JWT token generation

### Attendance System
- `GET /api/attendance` - Get attendance records (authenticated)
- `GET /api/attendance/public` - Public attendance feed for live view
- `POST /api/attendance/upload` - Upload attendance CSV file
- `POST /api/attendance/realtime` - Receive real-time attendance from face recognition
- `GET /api/attendance/stats` - Attendance statistics

### Student Management
- `GET /api/students` - List students with pagination and search
- `GET /api/students/:id/photos` - Get student photos
- `POST /api/students` - Create new student with photo upload
- `DELETE /api/students/:id` - Delete student

### Educational Resources
- `GET /api/teachers` - List teachers
- `GET /api/classes` - List classes
- `GET /api/institution/stats` - Institution-wide statistics

### Static Routes
- `GET /` - Main website homepage
- `GET /admin` - Admin portal redirect
- `GET /portals/:portal` - Portal routing
- `GET /:routePath` - Dynamic route handling

## Database Schema

### Core Tables
- **institutions**: Multi-institution support with folder organization
- **users**: Authentication with role-based access (admin, teacher, student, parent, superadmin)
- **students**: Complete student profiles with photo support
- **teachers**: Teacher information and assignments
- **attendance**: Real-time attendance tracking with timestamps
- **classes**: Class and department organization

### Key Features
- Institution-based data isolation
- Photo storage with organized directory structure
- Automatic database initialization
- Foreign key relationships for data integrity

## File Upload System
- **CSV Uploads**: Attendance data processing
- **Photo Uploads**: Student photos organized by institution and student name
- **Security**: File type validation and size limits
- **Storage**: Organized directory structure per institution

## Face Recognition Integration
- **Python Script**: `attendance_sync.py` monitors CSV files
- **Real-time Sync**: Automatic posting to API endpoints
- **Environment Detection**: Works in both Replit and local environments
- **Error Handling**: Comprehensive logging and error recovery

## Authentication & Security
- JWT token-based authentication
- Password hashing with bcryptjs
- Role-based access control
- Institution-based data isolation
- Demo credentials for testing

## Environment Configuration
- Automatic Replit detection
- Environment-specific database paths
- Flexible API URL configuration
- Production-ready deployment settings