# Endpoint Testing Guide

This document provides a comprehensive guide for testing all endpoints in the Court Case Management API.

## Setup Instructions

### 1. Prerequisites
- Node.js v14+ installed
- MongoDB running (local or cloud)
- Git (for version control)

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file with:
```env
PORT=5000
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/courtcase
JWT_SECRET=your_secret_key_here
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

### 4. Start Server
```bash
npm run dev
```

Server should be running at: `http://localhost:5000`

## API Testing

### Using Postman

#### Import Collection
1. Open Postman
2. Click "Import"
3. Create requests for each endpoint group

#### Environment Variables
Set up Postman environment with:
```json
{
  "base_url": "http://localhost:5000",
  "client_token": "{{auth_token_for_client}}",
  "advocate_token": "{{auth_token_for_advocate}}",
  "admin_token": "{{auth_token_for_admin}}",
  "paralegal_token": "{{auth_token_for_paralegal}}"
}
```

## Endpoint Test Cases

### 1. HEALTH CHECK
**GET** `/`
```bash
curl -X GET http://localhost:5000/
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Court Case Backend API is running",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

---

### 2. AUTHENTICATION ENDPOINTS

#### Signup (Client)
**POST** `/api/auth/signup`
```json
{
  "name": "John Client",
  "email": "client@example.com",
  "password": "SecurePass123!",
  "role": "client"
}
```
**Expected:** 201, user object, JWT token

#### Signup (Advocate)
**POST** `/api/auth/signup`
```json
{
  "name": "Jane Advocate",
  "email": "advocate@example.com",
  "password": "SecurePass123!",
  "role": "advocate"
}
```

#### Login
**POST** `/api/auth/login`
```json
{
  "email": "client@example.com",
  "password": "SecurePass123!"
}
```
**Expected:** 200, user object, JWT token in cookie and response

#### Logout
**POST** `/api/auth/logout`
Headers: `Authorization: Bearer {token}`
**Expected:** 200, logout success message

#### Google OAuth Login
**POST** `/api/auth/google/login`
```json
{
  "googleToken": "google_jwt_token_here",
  "email": "user@gmail.com",
  "name": "Google User",
  "image": "profile_image_url"
}
```

#### Set Password (Google Users)
**POST** `/api/auth/set-password`
Headers: `Authorization: Bearer {token}`
```json
{
  "password": "NewPassword123!"
}
```

---

### 3. PROTECTED ROUTES (Require Authentication)

#### Get Current User
**GET** `/api/protected/me`
Headers: `Authorization: Bearer {token}`
**Expected:** 200, current user profile

#### Admin Dashboard
**GET** `/api/protected/admin-dashboard`
Headers: `Authorization: Bearer {admin_token}`
**Expected:** 200, admin data (403 if not admin)

#### Advocate Cases
**GET** `/api/protected/advocate-cases`
Headers: `Authorization: Bearer {advocate_token}`
**Expected:** 200, list of advocate's cases

#### My Cases (Client)
**GET** `/api/protected/my-cases`
Headers: `Authorization: Bearer {client_token}`
**Expected:** 200, list of client's cases

#### Paralegal Tasks
**GET** `/api/protected/paralegal-tasks`
Headers: `Authorization: Bearer {paralegal_token}`
**Expected:** 200, list of assigned tasks

---

### 4. CASES ENDPOINTS

#### Create Case
**POST** `/api/cases`
Headers: `Authorization: Bearer {advocate_token}`
```json
{
  "title": "Smith vs. Johnson",
  "description": "Civil dispute case",
  "caseNumber": "CASE-2024-001",
  "type": "civil",
  "status": "active",
  "courtName": "District Court",
  "judge": "Judge Smith"
}
```

#### Get All Cases
**GET** `/api/cases`
Query: `?status=active&page=1&limit=10`
Headers: `Authorization: Bearer {token}`

#### Get Case Statistics
**GET** `/api/cases/stats`
Headers: `Authorization: Bearer {token}`

#### Get Single Case
**GET** `/api/cases/:id`
Headers: `Authorization: Bearer {token}`

#### Update Case
**PUT** `/api/cases/:id`
Headers: `Authorization: Bearer {advocate_token}`
```json
{
  "status": "closed",
  "description": "Updated description"
}
```

#### Delete Case
**DELETE** `/api/cases/:id`
Headers: `Authorization: Bearer {admin_token}`

#### Assign Paralegal
**POST** `/api/cases/:caseId/assign-paralegal`
Headers: `Authorization: Bearer {advocate_token}`
```json
{
  "paralegalId": "paralegal_user_id"
}
```

#### Remove Paralegal
**DELETE** `/api/cases/:caseId/paralegals/:paralegalId`
Headers: `Authorization: Bearer {advocate_token}`

---

### 5. NOTES ENDPOINTS

#### Create Note
**POST** `/api/notes`
Headers: `Authorization: Bearer {token}`
```json
{
  "title": "Case Strategy Notes",
  "content": "Initial strategy for the case...",
  "caseId": "case_id_optional",
  "tags": ["strategy", "important"]
}
```

#### Get My Notes
**GET** `/api/notes`
Query: `?page=1&limit=20&search=keyword`
Headers: `Authorization: Bearer {token}`

#### Get All Notes (Admin)
**GET** `/api/notes/all`
Headers: `Authorization: Bearer {admin_token}`

#### Get Note Details
**GET** `/api/notes/:id`
Headers: `Authorization: Bearer {token}`

#### Update Note
**PUT** `/api/notes/:id`
Headers: `Authorization: Bearer {token}`
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["updated", "important"]
}
```

#### Archive Note
**PUT** `/api/notes/:id/archive`
Headers: `Authorization: Bearer {token}`

#### Delete Note
**DELETE** `/api/notes/:id`
Headers: `Authorization: Bearer {token}`

#### Upload Attachment
**POST** `/api/notes/:id/attachments`
Headers: `Authorization: Bearer {token}`
Form-Data:
- file: (binary file)

#### Delete Attachment
**DELETE** `/api/notes/:id/attachments/:attachmentId`
Headers: `Authorization: Bearer {token}`

### Checklist Items

#### Get Checklists
**GET** `/api/notes/:id/checklists`
Headers: `Authorization: Bearer {token}`

#### Add Checklist Item
**POST** `/api/notes/:id/checklists`
Headers: `Authorization: Bearer {token}`
```json
{
  "text": "Review case documents",
  "completed": false
}
```

#### Toggle Checklist Item
**PUT** `/api/notes/:id/checklists/:checklistId/toggle`
Headers: `Authorization: Bearer {token}`

---

### 6. DOCUMENTS ENDPOINTS

#### Upload Document
**POST** `/api/documents/upload`
Headers: `Authorization: Bearer {token}`
Form-Data:
- file: (PDF, DOC, DOCX, etc.)
- title: "Document Title"
- description: "Document description"
- caseId: "case_id_optional"

#### Get Documents
**GET** `/api/documents`
Query: `?caseId=id&page=1&limit=10&type=contract`
Headers: `Authorization: Bearer {token}`

#### Get Document Statistics
**GET** `/api/documents/stats`
Headers: `Authorization: Bearer {token}`

#### Get Document Details
**GET** `/api/documents/:id`
Headers: `Authorization: Bearer {token}`

#### Download Document
**GET** `/api/documents/:id/download`
Headers: `Authorization: Bearer {token}`

#### Update Document
**PUT** `/api/documents/:id`
Headers: `Authorization: Bearer {token}`
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["important", "contract"]
}
```

#### Delete Document
**DELETE** `/api/documents/:id`
Headers: `Authorization: Bearer {token}`

#### Update Permissions
**PUT** `/api/documents/:id/permissions`
Headers: `Authorization: Bearer {token}`
```json
{
  "sharedWith": ["user_id_1", "user_id_2"],
  "permission": "view"
}
```

---

### 7. MESSAGES ENDPOINTS

#### Send Message
**POST** `/api/messages`
Headers: `Authorization: Bearer {token}`
```json
{
  "recipientId": "user_id",
  "content": "Message content here",
  "caseId": "case_id_optional",
  "attachments": []
}
```

#### Get All Messages
**GET** `/api/messages`
Query: `?page=1&limit=20&unread=false`
Headers: `Authorization: Bearer {token}`

#### Get Unread Count
**GET** `/api/messages/unread-count`
Headers: `Authorization: Bearer {token}`

#### Search Messages
**GET** `/api/messages/search`
Query: `?query=keyword&type=all`
Headers: `Authorization: Bearer {token}`

#### Get Conversation
**GET** `/api/messages/:conversationId`
Headers: `Authorization: Bearer {token}`

#### Mark As Read
**PUT** `/api/messages/:id/read`
Headers: `Authorization: Bearer {token}`

#### Mark All As Read
**PUT** `/api/messages/read-all`
Headers: `Authorization: Bearer {token}`

#### Delete Message
**DELETE** `/api/messages/:id`
Headers: `Authorization: Bearer {token}`

---

### 8. TASKS ENDPOINTS

#### Create Task
**POST** `/api/tasks`
Headers: `Authorization: Bearer {advocate_token}`
```json
{
  "title": "Review Documents",
  "description": "Review all case documents",
  "caseId": "case_id",
  "assignedTo": "user_id",
  "priority": "high",
  "dueDate": "2024-02-15T23:59:59Z",
  "status": "pending"
}
```

#### Get Tasks
**GET** `/api/tasks`
Query: `?status=pending&priority=high&page=1&limit=20`
Headers: `Authorization: Bearer {token}`

#### Get Task Statistics
**GET** `/api/tasks/stats`
Headers: `Authorization: Bearer {token}`

#### Get Overdue Tasks
**GET** `/api/tasks/overdue`
Headers: `Authorization: Bearer {token}`

#### Get Case Tasks
**GET** `/api/tasks/cases/:caseId`
Headers: `Authorization: Bearer {token}`

#### Get Single Task
**GET** `/api/tasks/:id`
Headers: `Authorization: Bearer {token}`

#### Update Task
**PUT** `/api/tasks/:id`
Headers: `Authorization: Bearer {token}`
```json
{
  "title": "Updated Title",
  "priority": "medium",
  "dueDate": "2024-02-20T23:59:59Z"
}
```

#### Update Task Status
**PUT** `/api/tasks/:id/status`
Headers: `Authorization: Bearer {token}`
```json
{
  "status": "completed"
}
```

#### Update Task Progress
**PUT** `/api/tasks/:id/progress`
Headers: `Authorization: Bearer {token}`
```json
{
  "progress": 75
}
```

#### Add Comment
**POST** `/api/tasks/:id/comments`
Headers: `Authorization: Bearer {token}`
```json
{
  "comment": "Task comment here"
}
```

#### Add Attachment
**POST** `/api/tasks/:id/attachments`
Headers: `Authorization: Bearer {token}`
Form-Data:
- file: (binary file)

#### Delete Task
**DELETE** `/api/tasks/:id`
Headers: `Authorization: Bearer {token}`

---

### 9. NOTIFICATIONS ENDPOINTS

#### Get Notifications
**GET** `/api/notifications`
Query: `?page=1&limit=10&unread=false&type=case`
Headers: `Authorization: Bearer {token}`

#### Get Unread Count
**GET** `/api/notifications/unread-count`
Headers: `Authorization: Bearer {token}`

#### Get By Type
**GET** `/api/notifications/type/:type`
Query: `?page=1&limit=10`
Headers: `Authorization: Bearer {token}`

#### Get By Priority
**GET** `/api/notifications/priority/:priority`
Query: `?page=1&limit=10`
Headers: `Authorization: Bearer {token}`

#### Mark All As Read
**PUT** `/api/notifications/read-all`
Headers: `Authorization: Bearer {token}`

#### Mark Single As Read
**PUT** `/api/notifications/:id/read`
Headers: `Authorization: Bearer {token}`

#### Delete Notification
**DELETE** `/api/notifications/:id`
Headers: `Authorization: Bearer {token}`

#### Delete All Read
**DELETE** `/api/notifications/read`
Headers: `Authorization: Bearer {token}`

---

### 10. REMINDERS ENDPOINTS

#### Create Reminder
**POST** `/api/reminders`
Headers: `Authorization: Bearer {token}`
```json
{
  "title": "Court Hearing",
  "description": "Hearing reminder",
  "reminderDate": "2024-02-15T09:00:00Z",
  "priority": "high",
  "caseId": "case_id_optional",
  "type": "court_hearing"
}
```

#### Get All Reminders
**GET** `/api/reminders`
Query: `?page=1&limit=10&status=pending`
Headers: `Authorization: Bearer {token}`

#### Get Upcoming Reminders
**GET** `/api/reminders/upcoming`
Headers: `Authorization: Bearer {token}`

#### Get Overdue Reminders
**GET** `/api/reminders/overdue`
Headers: `Authorization: Bearer {token}`

#### Get Reminder Statistics
**GET** `/api/reminders/stats`
Headers: `Authorization: Bearer {token}`

#### Get Single Reminder
**GET** `/api/reminders/:id`
Headers: `Authorization: Bearer {token}`

#### Update Reminder
**PUT** `/api/reminders/:id`
Headers: `Authorization: Bearer {token}`
```json
{
  "title": "Updated Reminder",
  "reminderDate": "2024-02-16T10:00:00Z"
}
```

#### Mark as Complete
**PUT** `/api/reminders/:id/complete`
Headers: `Authorization: Bearer {token}`

#### Delete Reminder
**DELETE** `/api/reminders/:id`
Headers: `Authorization: Bearer {token}`

---

### 11. CONNECTIONS ENDPOINTS

#### Search Advocates
**GET** `/api/connections/search/advocates`
Query: `?search=name&page=1&limit=10`
Headers: `Authorization: Bearer {client_token}`

#### Search Paralegals
**GET** `/api/connections/search/paralegals`
Query: `?search=name&page=1&limit=10`
Headers: `Authorization: Bearer {advocate_token}`

#### Send Request
**POST** `/api/connections/request`
Headers: `Authorization: Bearer {token}`
```json
{
  "recipientId": "user_id",
  "message": "Connection request message"
}
```

#### Get Received Requests
**GET** `/api/connections/requests/received`
Query: `?status=pending&page=1&limit=10`
Headers: `Authorization: Bearer {token}`

#### Get Sent Requests
**GET** `/api/connections/requests/sent`
Query: `?status=pending&page=1&limit=10`
Headers: `Authorization: Bearer {token}`

#### Accept Request
**PUT** `/api/connections/requests/:id/accept`
Headers: `Authorization: Bearer {token}`

#### Reject Request
**PUT** `/api/connections/requests/:id/reject`
Headers: `Authorization: Bearer {token}`

#### Get Connections
**GET** `/api/connections`
Query: `?page=1&limit=10&role=advocate`
Headers: `Authorization: Bearer {token}`

#### Get Connection Stats
**GET** `/api/connections/stats`
Headers: `Authorization: Bearer {token}`

#### Get Connection Details
**GET** `/api/connections/:id`
Headers: `Authorization: Bearer {token}`

#### Remove Connection
**DELETE** `/api/connections/:id`
Headers: `Authorization: Bearer {token}`

---

### 12. ACTIVITY ENDPOINTS

#### Get Case Activities
**GET** `/api/activities/cases/:caseId/activities`
Query: `?page=1&limit=20`
Headers: `Authorization: Bearer {token}`

#### Get Case Timeline
**GET** `/api/activities/cases/:caseId/timeline`
Headers: `Authorization: Bearer {token}`

#### Get Activity Statistics
**GET** `/api/activities/stats`
Headers: `Authorization: Bearer {token}`

#### Get User Activity
**GET** `/api/activities/users/:userId`
Headers: `Authorization: Bearer {token}`

---

### 13. TIMELINE/HEARINGS ENDPOINTS

#### Get Case Hearings
**GET** `/api/hearings/:caseId`
Headers: `Authorization: Bearer {token}`

#### Create Hearing
**POST** `/api/hearings`
Headers: `Authorization: Bearer {advocate_token}`
```json
{
  "caseId": "case_id",
  "hearingDate": "2024-03-15T10:00:00Z",
  "hearingType": "preliminary",
  "location": "Courtroom A",
  "judge": "Judge Smith"
}
```

---

## Testing Checklist

### Authentication Tests
- [ ] Signup with all roles
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout functionality
- [ ] JWT token validation
- [ ] Expired token handling
- [ ] Google OAuth flow

### Authorization Tests
- [ ] Admin can access admin routes
- [ ] Advocate can access advocate routes
- [ ] Client can access client routes
- [ ] Paralegal can access paralegal routes
- [ ] Unauthorized access is blocked

### CRUD Operation Tests
For each resource (Case, Note, Document, Message, Task, etc.):
- [ ] Create operation
- [ ] Read operation
- [ ] Update operation
- [ ] Delete operation
- [ ] List with pagination
- [ ] List with filters
- [ ] List with search

### Error Handling Tests
- [ ] 404 for non-existent resources
- [ ] 400 for invalid input
- [ ] 401 for missing auth
- [ ] 403 for unauthorized access
- [ ] 500 for server errors
- [ ] Proper error messages

### Data Validation Tests
- [ ] Email validation
- [ ] Password strength validation
- [ ] Required field validation
- [ ] Data type validation
- [ ] File upload validation
- [ ] Date validation

### Performance Tests
- [ ] Large list pagination
- [ ] Large file upload
- [ ] Concurrent requests
- [ ] Response time monitoring

---

## Quick Test Script

```bash
#!/bin/bash

API_URL="http://localhost:5000"

# Health check
echo "Testing health check..."
curl $API_URL/

echo "\nSignup test..."
curl -X POST $API_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "password":"Password123!",
    "role":"client"
  }'

echo "\nAll tests completed!"
```

---

## Troubleshooting

### Server Not Running
```bash
npm run dev
```

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URL in .env
- Verify MongoDB port (default: 27017)

### Port Already in Use
```bash
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows
```

### CORS Error
- Check origin in index.js CORS configuration
- Add your frontend URL to allowed origins

### Authentication Issues
- Verify JWT_SECRET is set in .env
- Check token format in Authorization header
- Ensure token is not expired
