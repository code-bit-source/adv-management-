# Court Case Management Backend - Project Analysis Report

## Project Overview
- **Name**: Court Case Management System
- **Type**: Node.js Express Backend
- **Database**: MongoDB
- **Port**: 5000
- **Authentication**: JWT + Google OAuth

## Project Structure

### Core Files
- `index.js` - Main server entry point
- `package.json` - Dependencies and scripts
- `.env` - Environment configuration

### Directories

#### 1. **config/** - Configuration Files
- `db.js` - MongoDB connection setup
- `token.js` - JWT token configuration
- `multer.config.js` - File upload configuration

#### 2. **routes/** - API Route Definitions
- `auth.route.js` - Authentication routes (signup, login, logout, Google OAuth)
- `protected.route.js` - Protected routes (role-based access)
- `case.route.js` - Case management CRUD operations
- `note.route.js` - Notes with checklists and attachments
- `connection.route.js` - Professional connections/network
- `document.route.js` - Document management and versioning
- `message.route.js` - Messaging between users
- `notification.route.js` - Notification system
- `reminder.route.js` - Reminders and task scheduling
- `task.route.js` - Task management
- `timeline.route.js` - Case timeline and hearings
- `activity.route.js` - Activity tracking

#### 3. **controller/** - Business Logic
- One controller file per route for handling requests
- Implements CRUD operations and business logic

#### 4. **model/** - Database Models (Mongoose Schemas)
- User, Case, Note, Document, Message models
- Notification, Reminder, Task, Timeline, Activity models
- Connection models for professional networking

#### 5. **middleware/** - Middleware Functions
- `auth.middleware.js` - JWT verification and role-based authorization
- `upload.middleware.js` - File upload handling with multer

#### 6. **services/** - Business Services
- `reminderScheduler.js` - Automated reminder service (node-cron)

#### 7. **uploads/** - File Storage
- `documents/` - Uploaded documents
- `notes/` - Note attachments

## API Endpoints Summary

### Authentication (/api/auth)
- `POST /signup` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /google/login` - Google OAuth login
- `POST /google/signup` - Google OAuth signup
- `POST /set-password` - Set password for Google users

### Protected Routes (/api/protected)
- `GET /me` - Get current user profile
- `GET /admin-dashboard` - Admin-only dashboard
- `GET /advocate-cases` - Advocate cases
- `GET /my-cases` - Client's cases
- `GET /paralegal-tasks` - Paralegal tasks
- `GET /legal-documents` - Legal documents
- `GET /notifications` - User notifications

### Cases (/api/cases)
- `POST /` - Create case
- `GET /` - Get cases
- `GET /stats` - Case statistics
- `GET /:id` - Get case details
- `PUT /:id` - Update case
- `DELETE /:id` - Delete case (admin only)
- `POST /:id/assign-paralegal` - Assign paralegal
- `DELETE /:id/paralegals/:paralegalId` - Remove paralegal

### Notes (/api/notes)
- `POST /` - Create note
- `GET /` - Get my notes
- `GET /all` - Get all notes (admin only)
- `GET /:id` - Get note details
- `PUT /:id` - Update note
- `DELETE /:id` - Delete note
- `PUT /:id/archive` - Archive note
- Checklist endpoints for note items
- Attachment endpoints for note files

### Documents (/api/documents)
- `POST /upload` - Upload document
- `GET /` - Get documents
- `GET /stats` - Document statistics
- `GET /:id` - Get document details
- `GET /:id/download` - Download document
- `PUT /:id` - Update document
- `DELETE /:id` - Delete document
- `PUT /:id/restore` - Restore deleted document
- `PUT /:id/permissions` - Update access permissions

### Connections (/api/connections)
- `GET /search/advocates` - Search advocates
- `GET /search/paralegals` - Search paralegals
- `POST /request` - Send connection request
- `GET /requests/received` - Received requests
- `GET /requests/sent` - Sent requests
- `PUT /requests/:id/accept` - Accept request
- `PUT /requests/:id/reject` - Reject request
- `GET /` - Get my connections
- `GET /stats` - Connection statistics

### Messages (/api/messages)
- `POST /` - Send message
- `GET /` - Get all messages
- `GET /unread-count` - Get unread count
- `GET /search` - Search messages
- `GET /:conversationId` - Get conversation
- `GET /:id` - Get message details
- `PUT /:id/read` - Mark as read
- `PUT /read-all` - Mark all as read
- `DELETE /:id` - Delete message

### Tasks (/api/tasks)
- `POST /` - Create task (advocate/admin only)
- `GET /` - Get tasks
- `GET /stats` - Task statistics
- `GET /overdue` - Get overdue tasks
- `GET /cases/:caseId` - Get case tasks
- `GET /:id` - Get task details
- `PUT /:id` - Update task
- `PUT /:id/status` - Update status
- `PUT /:id/progress` - Update progress
- `POST /:id/comments` - Add comment
- `POST /:id/attachments` - Add attachment
- `DELETE /:id` - Delete task

### Notifications (/api/notifications)
- `GET /` - Get notifications
- `GET /unread-count` - Get unread count
- `GET /type/:type` - Filter by type
- `GET /priority/:priority` - Filter by priority
- `PUT /read-all` - Mark all as read
- `DELETE /read` - Delete all read
- `GET /:id` - Get notification details
- `PUT /:id/read` - Mark as read
- `DELETE /:id` - Delete notification
- `DELETE /old` - Delete old notifications (admin)

### Reminders (/api/reminders)
- `POST /` - Create reminder
- `GET /` - Get reminders
- `GET /upcoming` - Get upcoming reminders
- `GET /overdue` - Get overdue reminders
- `GET /stats` - Reminder statistics
- `GET /:id` - Get reminder details
- `PUT /:id` - Update reminder
- `DELETE /:id` - Delete reminder
- `PUT /:id/complete` - Mark as complete

### Timeline (/api/timeline or /api/hearings)
- Timeline tracking for cases
- Hearing management
- Case event tracking

### Activities (/api/activities)
- Case activity tracking
- User activity logging
- Activity statistics and filtering

## User Roles

1. **Admin** - Full system access
2. **Advocate** - Lawyer/Attorney with case management capabilities
3. **Client** - Client with limited access to their cases
4. **Paralegal** - Legal assistant assisting advocates

## Dependencies

### Core Frameworks
- express@5.2.1 - Web framework
- mongoose@9.1.2 - MongoDB ODM
- mongodb@3.7 - MongoDB driver

### Authentication
- jsonwebtoken@9.0.3 - JWT tokens
- bcryptjs@3.0.3 - Password hashing
- google-auth-library@10.5.0 - Google OAuth
- @react-oauth/google@0.13.4 - Google OAuth (frontend)

### File Handling
- multer@2.0.2 - File uploads
- form-data@4.0.5 - Form data handling

### Utilities
- dotenv@17.2.3 - Environment variables
- cors@2.8.5 - CORS middleware
- cookie-parser@1.4.7 - Cookie parsing
- node-cron@4.2.1 - Task scheduling

### Development
- nodemon@3.1.11 - Auto-reload server

## Security Features

1. **JWT Authentication** - Token-based authentication
2. **Password Hashing** - bcrypt for password security
3. **Role-Based Access Control** - Middleware for authorization
4. **HTTP-Only Cookies** - Secure token storage
5. **CORS Configuration** - Origin validation
6. **Input Validation** - Route-level validation

## Key Services

### Reminder Scheduler
- Automated reminder notifications using node-cron
- Scheduled task execution
- Overdue task tracking

### Database Connection
- MongoDB Atlas or local MongoDB
- Mongoose schemas for data modeling
- Connection error handling

## Environment Variables Required

```
PORT=5000
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/courtcase
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Testing Status

### Health Check
- ✅ Server running on port 5000
- ✅ MongoDB connected
- ✅ Reminder scheduler active
- ⚠️ API endpoints need testing

### Testing Requirements
1. Test all authentication endpoints
2. Test protected routes with different roles
3. Test CRUD operations for all resources
4. Test file upload functionality
5. Test message and notification systems
6. Test task scheduling and reminders
7. Test access control and authorization
8. Test error handling and validation

## Issues to Address

1. **Port Accessibility** - Server shows as running but may have connectivity issues
2. **Route Testing** - Need to verify all 90+ endpoints are functional
3. **Error Handling** - Test error responses and edge cases
4. **Data Validation** - Verify input validation on all endpoints
5. **Authorization** - Test role-based access control

## Recommendations

1. Implement Postman collection for endpoint testing
2. Add unit tests for controllers and models
3. Add integration tests for full workflows
4. Implement API documentation with Swagger/OpenAPI
5. Add rate limiting and input sanitization
6. Implement comprehensive error logging
7. Add request validation middleware
8. Implement caching strategies
9. Add API versioning
10. Document all API responses and error codes
