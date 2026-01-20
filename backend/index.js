import express from "express";
import connectDb from "./config/db.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoute from "./routes/auth.route.js";
import protectedRoute from "./routes/protected.route.js";
import noteRoute from "./routes/note.route.js";
import connectionRoute from "./routes/connection.route.js";
import caseRoute from "./routes/case.route.js";
import timelineRoute from "./routes/timeline.route.js";
import documentRoute from "./routes/document.route.js";
import activityRoute from "./routes/activity.route.js";
import messageRoute from "./routes/message.route.js";
import notificationRoute from "./routes/notification.route.js";
import reminderRoute from "./routes/reminder.route.js";
import taskRoute from "./routes/task.route.js";
import { startReminderScheduler } from "./services/reminderScheduler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));

// Routes
app.use("/api/auth", authRoute);
app.use("/api/protected", protectedRoute);
app.use("/api/notes", noteRoute);
app.use("/api/connections", connectionRoute);
app.use("/api/cases", caseRoute);
app.use("/api", timelineRoute); // Timeline routes include /timeline and /hearings paths
app.use("/api/documents", documentRoute);
app.use("/api/activities", activityRoute);
app.use("/api/messages", messageRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/reminders", reminderRoute);
app.use("/api/tasks", taskRoute);

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Court Case Backend API is running",
    version: "1.0.0",
    endpoints: {
      auth: {
        signup: "POST /api/auth/signup",
        login: "POST /api/auth/login",
        logout: "POST /api/auth/logout",
        googleAuth: "POST /api/auth/google"
      },
      protected: {
        profile: "GET /api/protected/me",
        adminDashboard: "GET /api/protected/admin-dashboard",
        advocateCases: "GET /api/protected/advocate-cases",
        clientCases: "GET /api/protected/my-cases",
        paralegalTasks: "GET /api/protected/paralegal-tasks",
        legalDocuments: "GET /api/protected/legal-documents",
        notifications: "GET /api/protected/notifications"
      },
      notes: {
        createNote: "POST /api/notes",
        getMyNotes: "GET /api/notes",
        getAllNotes: "GET /api/notes/all (Admin only)",
        getNoteById: "GET /api/notes/:id",
        updateNote: "PUT /api/notes/:id",
        deleteNote: "DELETE /api/notes/:id",
        archiveNote: "PUT /api/notes/:id/archive",
        uploadAttachment: "POST /api/notes/:id/attachments",
        deleteAttachment: "DELETE /api/notes/:id/attachments/:attachmentId",
        downloadAttachment: "GET /api/notes/:id/attachments/:attachmentId/download"
      },
      checklists: {
        getChecklists: "GET /api/notes/:id/checklists",
        addChecklistItem: "POST /api/notes/:id/checklists",
        updateChecklistItem: "PUT /api/notes/:id/checklists/:checklistId",
        toggleChecklistItem: "PUT /api/notes/:id/checklists/:checklistId/toggle",
        deleteChecklistItem: "DELETE /api/notes/:id/checklists/:checklistId"
      },
      connections: {
        searchAdvocates: "GET /api/connections/search/advocates",
        searchParalegals: "GET /api/connections/search/paralegals",
        sendRequest: "POST /api/connections/request",
        getReceivedRequests: "GET /api/connections/requests/received",
        getSentRequests: "GET /api/connections/requests/sent",
        acceptRequest: "PUT /api/connections/requests/:id/accept",
        rejectRequest: "PUT /api/connections/requests/:id/reject",
        getMyConnections: "GET /api/connections",
        getConnectionDetails: "GET /api/connections/:id",
        removeConnection: "DELETE /api/connections/:id",
        getStats: "GET /api/connections/stats"
      },
      cases: {
        createCase: "POST /api/cases",
        getCases: "GET /api/cases",
        getCaseById: "GET /api/cases/:id",
        updateCase: "PUT /api/cases/:id",
        deleteCase: "DELETE /api/cases/:id (Admin only)",
        assignParalegal: "POST /api/cases/:id/assign-paralegal",
        removeParalegal: "DELETE /api/cases/:id/paralegals/:paralegalId",
        closeCase: "PUT /api/cases/:id/close",
        archiveCase: "PUT /api/cases/:id/archive",
        getCaseStats: "GET /api/cases/stats"
      },
      timeline: {
        addEvent: "POST /api/cases/:caseId/timeline",
        getTimeline: "GET /api/cases/:caseId/timeline",
        getUpcomingEvents: "GET /api/cases/:caseId/timeline/upcoming",
        getMilestones: "GET /api/cases/:caseId/milestones",
        getEventById: "GET /api/timeline/:eventId",
        updateEvent: "PUT /api/timeline/:eventId",
        deleteEvent: "DELETE /api/timeline/:eventId",
        markAsMilestone: "PUT /api/timeline/:eventId/milestone"
      },
      hearings: {
        addHearing: "POST /api/cases/:caseId/hearings",
        getHearings: "GET /api/cases/:caseId/hearings",
        completeHearing: "PUT /api/hearings/:eventId/complete",
        postponeHearing: "PUT /api/hearings/:eventId/postpone"
      },
      documents: {
        uploadDocument: "POST /api/documents/upload",
        getDocuments: "GET /api/documents",
        getDocumentById: "GET /api/documents/:id",
        downloadDocument: "GET /api/documents/:id/download",
        updateDocument: "PUT /api/documents/:id",
        updatePermissions: "PUT /api/documents/:id/permissions",
        deleteDocument: "DELETE /api/documents/:id",
        restoreDocument: "PUT /api/documents/:id/restore (Admin only)",
        getStats: "GET /api/documents/stats"
      },
      activities: {
        getCaseActivities: "GET /api/activities/cases/:caseId/activities",
        getCaseTimeline: "GET /api/activities/cases/:caseId/timeline",
        getActivityStats: "GET /api/activities/cases/:caseId/stats",
        getMyActivity: "GET /api/activities/my-activity",
        getRecentActivities: "GET /api/activities/recent",
        getActivitiesByType: "GET /api/activities/type/:type",
        getActivityById: "GET /api/activities/:id",
        deleteActivity: "DELETE /api/activities/:id (Admin only)"
      },
      
      messages: {
        sendMessage: "POST /api/messages",
        getMessages: "GET /api/messages",
        getUnreadCount: "GET /api/messages/unread-count",
        searchMessages: "GET /api/messages/search",
        getConversation: "GET /api/messages/conversation/:userId",
        markAllAsRead: "PUT /api/messages/read-all",
        getMessageById: "GET /api/messages/:id",
        markAsRead: "PUT /api/messages/:id/read",
        deleteMessage: "DELETE /api/messages/:id",
        uploadAttachment: "POST /api/messages/:id/attachments",
        getCaseMessages: "GET /api/messages/cases/:caseId/messages",
        getConnectionMessages: "GET /api/messages/connections/:connectionId/messages"
      },
      notifications: {
        getNotifications: "GET /api/notifications",
        getUnreadCount: "GET /api/notifications/unread-count",
        getByType: "GET /api/notifications/type/:type",
        getByPriority: "GET /api/notifications/priority/:priority",
        markAllAsRead: "PUT /api/notifications/read-all",
        deleteAllRead: "DELETE /api/notifications/read",
        cleanupOld: "DELETE /api/notifications/cleanup/old (Admin only)",
        cleanupExpired: "DELETE /api/notifications/cleanup/expired (Admin only)",
        getNotificationById: "GET /api/notifications/:id",
        markAsRead: "PUT /api/notifications/:id/read",
        deleteNotification: "DELETE /api/notifications/:id"
      },
      reminders: {
        createReminder: "POST /api/reminders",
        getReminders: "GET /api/reminders",
        getUpcoming: "GET /api/reminders/upcoming",
        cleanup: "DELETE /api/reminders/cleanup (Admin only)",
        getCaseReminders: "GET /api/reminders/cases/:caseId",
        getReminderById: "GET /api/reminders/:id",
        updateReminder: "PUT /api/reminders/:id",
        cancelReminder: "DELETE /api/reminders/:id",
        snoozeReminder: "PUT /api/reminders/:id/snooze",
        dismissReminder: "PUT /api/reminders/:id/dismiss"
      },
      tasks: {
        createTask: "POST /api/tasks (Advocate only)",
        getTasks: "GET /api/tasks",
        getStats: "GET /api/tasks/stats",
        getOverdue: "GET /api/tasks/overdue",
        getCaseTasks: "GET /api/tasks/cases/:caseId",
        getTaskById: "GET /api/tasks/:id",
        updateTask: "PUT /api/tasks/:id",
        deleteTask: "DELETE /api/tasks/:id",
        updateStatus: "PUT /api/tasks/:id/status",
        updateProgress: "PUT /api/tasks/:id/progress",
        addComment: "POST /api/tasks/:id/comments",
        addAttachment: "POST /api/tasks/:id/attachments"
      }
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

// Start Server
app.listen(port, () => {
  connectDb();
  console.log(`✅ Server is running on: http://localhost:${port}`);
  
  // Start reminder scheduler
  startReminderScheduler();
});
