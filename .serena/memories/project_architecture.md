# Cheick Mohamed School Management System - Project Architecture

## Project Overview
This is a comprehensive school management system for Cheick Mohamed School and College in Guinea. It's a full-stack web application that provides role-based portals for administrators, teachers, students, and parents.

## Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: SQLite3 
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Authentication**: JWT tokens with bcryptjs for password hashing
- **File Handling**: Multer for CSV and photo uploads
- **Deployment**: Configured for Replit deployment

## Project Structure

### Root Level
- `start.js`: Entry point for Replit deployment
- `index.html`: Main landing page with portal access
- `package.json`: Node.js dependencies and scripts
- `.replit`: Replit deployment configuration
- `project_details.txt`: Feature specifications and requirements

### Backend (`/backend/`)
- `server.js`: Main Express server with all API endpoints
- `attendance_sync.py`: Python script for face recognition CSV synchronization
- `database/school.db`: SQLite database file
- `uploads/`: File storage for photos and documents

### Frontend Structure
- `css/`: Stylesheets for main site and portals
- `js/`: JavaScript files for functionality
- `portals/`: Role-based portal HTML pages
- `images/`: Static assets

### Key Directories
- `demo_data/`: Sample CSV files for testing
- `uploads/`: Institution-based file organization
- `node_modules/`: NPM dependencies

## Database Schema
Core entities:
- **institutions**: School/institution management
- **users**: Authentication and user management
- **students**: Student information and photos
- **teachers**: Teacher profiles and assignments
- **attendance**: Real-time attendance tracking
- **classes**: Class and department organization

## Portal System
Role-based access with dedicated portals:
- **Admin Portal**: Full system management
- **Teacher Portal**: Class and student management
- **Student Portal**: Academic dashboard and resources
- **Parent Portal**: Child progress monitoring
- **Super Admin Portal**: Multi-institution management

## Authentication Flow
- JWT-based authentication
- Role-based access control
- Demo credentials available for testing
- Automatic portal routing based on user role

## Key Features
- Multi-institution support
- Real-time attendance tracking
- Face recognition CSV integration
- Photo upload and management
- Responsive design
- Live attendance monitoring page

## Environment Support
- Replit deployment ready
- Local development support
- Automatic environment detection
- Environment-specific database paths