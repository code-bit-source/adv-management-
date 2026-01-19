import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  // Recipient
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "User is required"],
    index: true
  },
  
  // Notification Content
  type: {
    type: String,
    enum: [
      'message_received',
      'message_read',
      'case_created',
      'case_updated',
      'case_closed',
      'hearing_scheduled',
      'hearing_reminder',
      'hearing_completed',
      'document_uploaded',
      'document_shared',
      'task_assigned',
      'task_completed',
      'task_overdue',
      'connection_request',
      'connection_accepted',
      'connection_rejected',
      'deadline_approaching',
      'paralegal_assigned',
      'case_status_changed',
      'system_announcement',
      'custom'
    ],
    required: [true, "Notification type is required"],
    index: true
  },
  
  title: {
    type: String,
    required: [true, "Title is required"],
    maxlength: [200, "Title cannot exceed 200 characters"],
    trim: true
  },
  
  message: {
    type: String,
    required: [true, "Message is required"],
    maxlength: [500, "Message cannot exceed 500 characters"],
    trim: true
  },
  
  // Related Entities
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Case', 'Message', 'Document', 'Task', 'Connection', 'Timeline', 'User', 'Note']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  
  // Action
  actionUrl: {
    type: String,
    trim: true
  },
  
  actionText: {
    type: String,
    default: 'View',
    maxlength: [50, "Action text cannot exceed 50 characters"]
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: {
    type: Date
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // Metadata for UI
  icon: {
    type: String,
    default: 'bell'
  },
  
  color: {
    type: String,
    default: 'blue'
  },
  
  // Delivery Channels (for future use)
  deliveryChannels: [{
    channel: {
      type: String,
      enum: ['in-app', 'email', 'sms', 'push'],
      default: 'in-app'
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    error: String
  }],
  
  // Expiry
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================

// User notifications - for getting user's notifications
notificationSchema.index({ user: 1, createdAt: -1 });

// Unread notifications - for getting unread count
notificationSchema.index({ user: 1, isRead: 1 });

// By type - for filtering by notification type
notificationSchema.index({ type: 1, createdAt: -1 });

// User + type - for getting user's notifications of specific type
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });

// Related entities - for finding notifications related to specific entity
notificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

// Priority - for filtering by priority
notificationSchema.index({ user: 1, priority: 1, isRead: 1 });

// ==================== INSTANCE METHODS ====================

// Mark notification as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Check if user can view this notification
notificationSchema.methods.canView = function(userId) {
  return this.user.toString() === userId.toString();
};

// Check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// ==================== STATIC METHODS ====================

// Get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId, type = null) {
  const query = {
    user: userId,
    isRead: false
  };
  
  if (type) {
    query.type = type;
  }
  
  return await this.countDocuments(query);
};

// Get user's notifications with pagination
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unread = false,
    type = null,
    priority = null
  } = options;
  
  const query = {
    user: userId
  };
  
  if (unread) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (priority) {
    query.priority = priority;
  }
  
  const skip = (page - 1) * limit;
  
  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    unreadCount: await this.getUnreadCount(userId)
  };
};

// Mark all notifications as read
notificationSchema.statics.markAllAsRead = async function(userId, type = null) {
  const query = {
    user: userId,
    isRead: false
  };
  
  if (type) {
    query.type = type;
  }
  
  const result = await this.updateMany(
    query,
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
  
  return result.modifiedCount;
};

// Delete old notifications
notificationSchema.statics.deleteOld = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
  
  return result.deletedCount;
};

// Delete expired notifications
notificationSchema.statics.deleteExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  return result.deletedCount;
};

// Create notification (helper method)
notificationSchema.statics.createNotification = async function(data) {
  const {
    userId,
    type,
    title,
    message,
    relatedEntity,
    actionUrl,
    actionText,
    priority = 'normal',
    icon,
    color,
    expiresAt
  } = data;
  
  // Validate required fields
  if (!userId || !type || !title || !message) {
    throw new Error('Missing required fields for notification');
  }
  
  // Set default icon and color based on type
  const defaults = getNotificationDefaults(type);
  
  const notification = await this.create({
    user: userId,
    type,
    title,
    message,
    relatedEntity,
    actionUrl,
    actionText: actionText || defaults.actionText,
    priority,
    icon: icon || defaults.icon,
    color: color || defaults.color,
    expiresAt,
    deliveryChannels: [{
      channel: 'in-app',
      status: 'sent',
      sentAt: new Date()
    }]
  });
  
  return notification;
};

// Get notifications by type
notificationSchema.statics.getByType = async function(userId, type, options = {}) {
  const {
    page = 1,
    limit = 20
  } = options;
  
  const query = {
    user: userId,
    type
  };
  
  const skip = (page - 1) * limit;
  
  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Get notifications by priority
notificationSchema.statics.getByPriority = async function(userId, priority, options = {}) {
  const {
    page = 1,
    limit = 20,
    unread = false
  } = options;
  
  const query = {
    user: userId,
    priority
  };
  
  if (unread) {
    query.isRead = false;
  }
  
  const skip = (page - 1) * limit;
  
  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// ==================== HELPER FUNCTIONS ====================

function getNotificationDefaults(type) {
  const defaults = {
    message_received: {
      icon: 'message',
      color: 'blue',
      actionText: 'View Message'
    },
    message_read: {
      icon: 'check',
      color: 'green',
      actionText: 'View'
    },
    case_created: {
      icon: 'briefcase',
      color: 'green',
      actionText: 'View Case'
    },
    case_updated: {
      icon: 'edit',
      color: 'blue',
      actionText: 'View Case'
    },
    case_closed: {
      icon: 'check-circle',
      color: 'green',
      actionText: 'View Case'
    },
    hearing_scheduled: {
      icon: 'calendar',
      color: 'orange',
      actionText: 'View Hearing'
    },
    hearing_reminder: {
      icon: 'bell',
      color: 'red',
      actionText: 'View Hearing'
    },
    hearing_completed: {
      icon: 'check',
      color: 'green',
      actionText: 'View Details'
    },
    document_uploaded: {
      icon: 'file',
      color: 'blue',
      actionText: 'View Document'
    },
    document_shared: {
      icon: 'share',
      color: 'blue',
      actionText: 'View Document'
    },
    task_assigned: {
      icon: 'clipboard',
      color: 'purple',
      actionText: 'View Task'
    },
    task_completed: {
      icon: 'check-circle',
      color: 'green',
      actionText: 'View Task'
    },
    task_overdue: {
      icon: 'alert',
      color: 'red',
      actionText: 'View Task'
    },
    connection_request: {
      icon: 'user-plus',
      color: 'blue',
      actionText: 'View Request'
    },
    connection_accepted: {
      icon: 'user-check',
      color: 'green',
      actionText: 'View Connection'
    },
    connection_rejected: {
      icon: 'user-x',
      color: 'red',
      actionText: 'View'
    },
    deadline_approaching: {
      icon: 'clock',
      color: 'orange',
      actionText: 'View Details'
    },
    paralegal_assigned: {
      icon: 'user-plus',
      color: 'blue',
      actionText: 'View Case'
    },
    case_status_changed: {
      icon: 'refresh',
      color: 'blue',
      actionText: 'View Case'
    },
    system_announcement: {
      icon: 'megaphone',
      color: 'purple',
      actionText: 'Read More'
    },
    custom: {
      icon: 'bell',
      color: 'gray',
      actionText: 'View'
    }
  };
  
  return defaults[type] || defaults.custom;
}

// ==================== MIDDLEWARE ====================

// Auto-delete expired notifications before find
notificationSchema.pre(/^find/, function(next) {
  // Exclude expired notifications from queries
  this.where({ $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] });
  next();
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
