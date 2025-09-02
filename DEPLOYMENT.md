# Multi-Institution School Management System - Deployment Guide

## 🚀 Deployment Instructions for Replit (school-app.replit.com)

### Prerequisites
- Replit account with sufficient resources
- Google Cloud Console project for Drive API
- Domain access (school-app.replit.com)

### Step 1: Environment Configuration

Create the following secrets in Replit:

#### Required Environment Variables:
```bash
# Basic Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Institution Configuration  
DEFAULT_INSTITUTION_CODE=MAIN

# Google Drive API (Optional but Recommended)
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your key...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
```

### Step 2: Google Drive API Setup (Optional)

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Google Drive API

2. **Create Service Account**:
   - Navigate to IAM & Admin > Service Accounts
   - Create new service account
   - Download JSON key file
   - Extract values for environment variables above

3. **Configure Drive Permissions**:
   - Share target Google Drive folder with service account email
   - Ensure service account has "Editor" permissions

### Step 3: Database Initialization

The SQLite database will be automatically created on first run with:
- All required tables (institutions, users, classes, calendar_events, announcements, parents)
- Proper foreign key relationships
- Institution-specific data isolation

### Step 4: Initial Superadmin Setup

1. **First Run**: Start the application
2. **Create Superadmin**: Use the registration endpoint or direct database insertion
3. **Login**: Access superadmin portal at `/portals/superadmin.html`

### Step 5: Institution Setup

1. **Access Superadmin Portal**: https://school-app.replit.com/portals/superadmin.html
2. **Create First Institution**:
   - Fill institution details
   - System generates unique institution code
   - Admin account created automatically
3. **Configure Google Drive** (if enabled):
   - Initialize Drive folders for institution
   - Folder structure: `Drive/SchoolApp_Photos/[Institution]/[Teachers|Students]/[Name]`

### Step 6: Face Recognition Setup

1. **Navigate to**: `auto_attend_app/` directory
2. **Install Dependencies**:
   ```bash
   cd auto_attend_app
   pip install -r requirements.txt
   ```
3. **Configure Institution**:
   ```bash
   export INSTITUTION_CODE=ABC123  # Use actual institution code
   ```
4. **Run Multi-Institution App**:
   ```bash
   python multi_institution_app.py
   ```

### Step 7: Attendance Sync Setup

1. **Configure Sync Script**:
   ```bash
   export INSTITUTION_CODE=ABC123
   export API_BASE_URL=https://school-app.replit.com/api
   ```
2. **Run Sync Service**:
   ```bash
   python attendance_sync.py
   ```

## 🔧 Configuration Files

### package.json
```json
{
  "name": "school-management-system",
  "version": "2.0.0",
  "homepage": "https://school-app.replit.com",
  "scripts": {
    "start": "node start.js",
    "server": "node backend/server.js"
  }
}
```

### .replit
```toml
run = "npm start"
modules = ["nodejs-18"]

[deployment]
deploymentTarget = "cloudrun"
publicDir = "/"
```

## 🔍 Testing Deployment

### Automated Tests
```bash
cd tests/
python test_multi_institution.py
```

### Manual Testing Checklist
- [ ] Superadmin portal accessible
- [ ] Institution creation works
- [ ] Institution codes generate correctly
- [ ] Admin portal works per institution
- [ ] Google Drive integration (if configured)
- [ ] Face recognition app starts
- [ ] Attendance sync works
- [ ] Calendar events creation
- [ ] Class management functions

## 📊 Monitoring & Maintenance

### Log Files
- Application logs: `/app.log`
- Face recognition logs: `auto_attend_app/app.log`
- Attendance sync logs: `auto_attend_app/attendance_sync.log`

### Database Backup
```bash
# Regular backup of SQLite database
cp school_management.db backup/school_management_$(date +%Y%m%d_%H%M%S).db
```

### Performance Monitoring
- Monitor institution count growth
- Check database size
- Monitor Google Drive API quotas
- Face recognition processing performance

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check file permissions
   - Ensure directory exists
   - Verify SQLite installation

2. **Google Drive API Errors**:
   - Verify service account credentials
   - Check API quotas
   - Confirm folder permissions

3. **Face Recognition Issues**:
   - Check Python dependencies
   - Verify OpenCV installation
   - Ensure institution code is set

4. **Attendance Sync Problems**:
   - Check CSV file permissions
   - Verify API endpoint accessibility
   - Confirm institution code mapping

### Support Contacts
- System Administrator: [admin@school-app.replit.com]
- Technical Support: [support@school-app.replit.com]

## 📈 Scaling Considerations

### Resource Requirements
- **CPU**: 2+ cores recommended for face recognition
- **RAM**: 4GB+ for multiple institutions
- **Storage**: Plan for database and image storage growth
- **Network**: Reliable connection for Google Drive sync

### Growth Planning
- Monitor institution count
- Plan database migration strategy for large datasets
- Consider CDN for static assets
- Implement database clustering if needed

## 🔐 Security Best Practices

### Authentication
- Regular JWT secret rotation
- Strong password policies
- Account lockout mechanisms
- Session timeout configuration

### Data Protection
- Regular database backups
- Encrypted sensitive data
- Access logging and monitoring
- GDPR compliance measures

### Network Security
- HTTPS enforcement
- CORS configuration
- Rate limiting
- Input validation and sanitization

---

## 📞 Need Help?

For technical assistance with deployment:
1. Check the troubleshooting section
2. Review application logs
3. Test with provided test suite
4. Contact technical support

**🎉 Your multi-institution school management system is ready for production!**