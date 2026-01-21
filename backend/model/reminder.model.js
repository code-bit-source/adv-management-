import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema({
  // Basic Info
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
  
  // Reminder Type
  type: {
    type: String,
    enum: [
      'hearing_reminder',
      'deadline_reminder',
      'task_reminder',
      'document_reminder',
      'payment_reminder',
      'meeting_reminder',
      'custom_reminder'
    ],
    required: [true, "Reminder type is required"],
    index: true
  },
  
  // Related Entity
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Case', 'Task', 'Document', 'Timeline', 'Hearing', 'Note']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  
  // Scheduling
  reminderDate: {
    type: Date,
    required: [true, "Reminder date is required"],
    index: true
  },
  
  eventDate: {
    type: Date
  },
  
  // Recipients
  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'dismissed', 'snoozed'],
      default: 'pending'
    },
    sentAt: Date,
    dismissedAt: Date,
    snoozedUntil: Date
  }],
  
  // Created By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Creator is required"],
    index: true
  },
  
  // Recurrence
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: {
      type: Number,
      default: 1,
      min: 1
    },
    endDate: Date,
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    dayOfMonth: Number // 1-31
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'cancelled', 'failed'],
    default: 'scheduled',
    index: true
  },
  
  // Notification Settings
  notificationChannels: [{
    type: String,
    enum: ['in-app', 'email', 'sms', 'push'],
    default: 'in-app'
  }],
  
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
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================

// For scheduler - get pending reminders to send
reminderSchema.index({ reminderDate: 1, status: 1 });

// User reminders - get user's reminders
reminderSchema.index({ 'recipients.user': 1, status: 1 });

// Created reminders - get reminders created by user
reminderSchema.index({ createdBy: 1, createdAt: -1 });

// By type - filter by reminder type
reminderSchema.index({ type: 1, reminderDate: 1 });

// Related entities - find reminders for specific entity
reminderSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

// Pending reminders - for scheduler
reminderSchema.index({ status: 1, reminderDate: 1 });

// ==================== INSTANCE METHODS ====================

// Send reminder to all recipients
reminderSchema.methods.send = async function() {
  // This will be called by the scheduler
  // Update status to sent
  this.status = 'sent';
  
  // Update all pending recipients to sent
  this.recipients.forEach(recipient => {
    if (recipient.status === 'pending') {
      recipient.status = 'sent';
      recipient.sentAt = new Date();
    }
  });
  
  await this.save();
  return this;
};

// Cancel reminder
reminderSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  await this.save();
  return this;
};

// Snooze reminder for a specific user
reminderSchema.methods.snooze = async function(userId, duration = 60) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  
  if (recipient) {
    recipient.status = 'snoozed';
    recipient.snoozedUntil = new Date(Date.now() + duration * 60 * 1000); // duration in minutes
  }
  
  await this.save();
  return this;
};

// Dismiss reminder for a specific user
reminderSchema.methods.dismiss = async function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  
  if (recipient) {
    recipient.status = 'dismissed';
    recipient.dismissedAt = new Date();
  }
  
  await this.save();
  return this;
};

// Check if user can edit this reminder
reminderSchema.methods.canEdit = function(userId) {
  return this.createdBy.toString() === userId.toString();
};

// Check if user is a recipient
reminderSchema.methods.isRecipient = function(userId) {
  return this.recipients.some(r => r.user.toString() === userId.toString());
};

// ==================== STATIC METHODS ====================

// Get upcoming reminders for a user
reminderSchema.statics.getUpcoming = async function(userId, days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return await this.find({
    'recipients.user': userId,
    status: 'scheduled',
    reminderDate: {
      $gte: now,
      $lte: futureDate
    }
  })
  .sort({ reminderDate: 1 })
  .populate('createdBy', 'name email role')
  .lean();
};

// Get pending reminders that need to be sent
reminderSchema.statics.getPending = async function() {
  const now = new Date();
  
  return await this.find({
    status: 'scheduled',
    reminderDate: { $lte: now }
  })
  .populate('recipients.user', 'name email')
  .populate('createdBy', 'name email');
};

// Get user's reminders with pagination
reminderSchema.statics.getUserReminders = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    type = null
  } = options;
  
  const query = {
    $or: [
      { 'recipients.user': userId },
      { createdBy: userId }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }
  
  const skip = (page - 1) * limit;
  
  const reminders = await this.find(query)
    .sort({ reminderDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name email role')
    .populate('recipients.user', 'name email role')
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    reminders,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Create reminder (helper method)
reminderSchema.statics.createReminder = async function(data) {
  const {
    title,
    message,
    type,
    reminderDate,
    eventDate,
    recipients,
    createdBy,
    relatedEntity,
    isRecurring,
    recurrence,
    priority = 'normal',
    notificationChannels = ['in-app'],
    actionUrl,
    actionText,
    metadata
  } = data;
  
  // Validate required fields
  if (!title || !message || !type || !reminderDate || !createdBy) {
    throw new Error('Missing required fields for reminder');
  }
  
  // Validate reminder date is in the future
  if (new Date(reminderDate) < new Date()) {
    throw new Error('Reminder date must be in the future');
  }
  
  // Validate recipients
  if (!recipients || recipients.length === 0) {
    throw new Error('At least one recipient is required');
  }
  
  const reminder = await this.create({
    title,
    message,
    type,
    reminderDate,
    eventDate,
    recipients: recipients.map(r => ({
      user: typeof r === 'string' ? r : (r.user || r._id),
      status: 'pending'
    })),
    createdBy,
    relatedEntity,
    isRecurring,
    recurrence,
    priority,
    notificationChannels,
    actionUrl,
    actionText,
    metadata
  });
  
  return reminder;
};

// Cancel reminders by entity
reminderSchema.statics.cancelByEntity = async function(entityType, entityId) {
  const result = await this.updateMany(
    {
      'relatedEntity.entityType': entityType,
      'relatedEntity.entityId': entityId,
      status: 'scheduled'
    },
    {
      $set: { status: 'cancelled' }
    }
  );
  
  return result.modifiedCount;
};

// Get reminders by case
reminderSchema.statics.getCaseReminders = async function(caseId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null
  } = options;
  
  const query = {
    'relatedEntity.entityType': 'Case',
    'relatedEntity.entityId': caseId
  };
  
  if (status) {
    query.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const reminders = await this.find(query)
    .sort({ reminderDate: 1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name email role')
    .populate('recipients.user', 'name email role')
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    reminders,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Delete old reminders
reminderSchema.statics.deleteOld = async function(days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await this.deleteMany({
    status: { $in: ['sent', 'cancelled'] },
    createdAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

// ==================== MIDDLEWARE ====================

// Validate reminder date before save
reminderSchema.pre('save', function(next) {
  if (this.isNew && this.reminderDate < new Date()) {
    const error = new Error('Reminder date must be in the future');
    if (typeof next === 'function') {
      return next(error);
    } else {
      throw error;
    }
  }
  if (typeof next === 'function') {
    next();
  }
});

// Validate recurrence settings
reminderSchema.pre('save', function(next) {
  if (this.isRecurring && !this.recurrence.frequency) {
    const error = new Error('Recurrence frequency is required for recurring reminders');
    if (typeof next === 'function') {
      return next(error);
    } else {
      throw error;
    }
  }
  if (typeof next === 'function') {
    next();
  }
});

const Reminder = mongoose.model("Reminder", reminderSchema);

export default Reminder;
