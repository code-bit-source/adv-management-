import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  // Related entities
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Case",
    required: true,
    index: true
  },
  
  // User who performed the action
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Activity type
  type: {
    type: String,
    required: true,
    enum: [
      // Case activities
      'case_created',
      'case_updated',
      'case_status_changed',
      'case_closed',
      'case_archived',
      'case_deleted',
      
      // User assignments
      'client_assigned',
      'advocate_assigned',
      'paralegal_assigned',
      'paralegal_removed',
      
      // Timeline activities
      'timeline_event_added',
      'timeline_event_updated',
      'timeline_event_deleted',
      'milestone_marked',
      
      // Hearing activities
      'hearing_scheduled',
      'hearing_updated',
      'hearing_completed',
      'hearing_postponed',
      'hearing_cancelled',
      
      // Document activities
      'document_uploaded',
      'document_updated',
      'document_deleted',
      'document_downloaded',
      'document_shared',
      
      // Message activities
      'message_sent',
      'message_deleted',
      
      // Note activities
      'note_created',
      'note_updated',
      'note_deleted',
      'note_converted_to_case',
      
      // Other activities
      'comment_added',
      'status_updated',
      'priority_changed',
      'reminder_created',
      'notification_sent'
    ],
    index: true
  },
  
  // Activity description
  description: {
    type: String,
    required: true
  },
  
  // Detailed action information
  action: {
    type: String,
    required: true
  },
  
  // Related entity references
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Timeline', 'Document', 'Message', 'Note', 'User', 'Hearing', 'Comment', null]
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  
  // Changes made (for update activities)
  changes: {
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  
  // Additional metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // IP address and user agent (for security audit)
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  // Visibility
  isVisible: {
    type: Boolean,
    default: true
  },
  
  // Importance level
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }]
  
}, {
  timestamps: true
});

// Indexes for performance
activitySchema.index({ case: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ case: 1, type: 1 });
activitySchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });
activitySchema.index({ importance: 1, createdAt: -1 });

// Virtual for formatted timestamp
activitySchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to check if user can view this activity
activitySchema.methods.canView = function(userId, userRole) {
  // Admin can view all activities
  if (userRole === 'admin') {
    return true;
  }
  
  // If activity is not visible, only admin can see
  if (!this.isVisible) {
    return false;
  }
  
  // User who performed the action can always view
  if (this.user.toString() === userId) {
    return true;
  }
  
  // For other users, they need case access (checked at controller level)
  return 'check_case_access';
};

// Static method to log activity
activitySchema.statics.logActivity = async function(data) {
  try {
    const activity = await this.create({
      case: data.caseId,
      user: data.userId,
      type: data.type,
      description: data.description,
      action: data.action,
      relatedEntity: data.relatedEntity || {},
      changes: data.changes || {},
      metadata: data.metadata || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      importance: data.importance || 'medium',
      tags: data.tags || []
    });
    
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

// Static method to get case timeline
activitySchema.statics.getCaseTimeline = async function(caseId, options = {}) {
  const {
    page = 1,
    limit = 50,
    type,
    importance,
    startDate,
    endDate,
    userId
  } = options;
  
  const query = { case: caseId, isVisible: true };
  
  // Filter by type
  if (type) {
    query.type = type;
  }
  
  // Filter by importance
  if (importance) {
    query.importance = importance;
  }
  
  // Filter by user
  if (userId) {
    query.user = userId;
  }
  
  // Filter by date range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const skip = (page - 1) * limit;
  
  const activities = await this.find(query)
    .populate('user', 'name email role profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments(query);
  
  return {
    activities,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Static method to get activity statistics
activitySchema.statics.getActivityStats = async function(caseId) {
  const stats = {
    total: await this.countDocuments({ case: caseId }),
    byType: {},
    byUser: {},
    byImportance: {},
    recentActivity: null,
    mostActiveUser: null
  };
  
  // Activity by type
  const typeStats = await this.aggregate([
    { $match: { case: new mongoose.Types.ObjectId(caseId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  typeStats.forEach(stat => {
    stats.byType[stat._id] = stat.count;
  });
  
  // Activity by user
  const userStats = await this.aggregate([
    { $match: { case: new mongoose.Types.ObjectId(caseId) } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  for (const stat of userStats) {
    const user = await mongoose.model('User').findById(stat._id, 'name email');
    if (user) {
      stats.byUser[user.name] = stat.count;
    }
  }
  
  // Activity by importance
  const importanceStats = await this.aggregate([
    { $match: { case: new mongoose.Types.ObjectId(caseId) } },
    { $group: { _id: '$importance', count: { $sum: 1 } } }
  ]);
  
  importanceStats.forEach(stat => {
    stats.byImportance[stat._id] = stat.count;
  });
  
  // Recent activity
  const recent = await this.findOne({ case: caseId })
    .sort({ createdAt: -1 })
    .populate('user', 'name email');
  
  if (recent) {
    stats.recentActivity = {
      type: recent.type,
      description: recent.description,
      user: recent.user?.name,
      date: recent.createdAt
    };
  }
  
  // Most active user
  if (userStats.length > 0) {
    const mostActive = await mongoose.model('User').findById(userStats[0]._id, 'name email');
    if (mostActive) {
      stats.mostActiveUser = {
        name: mostActive.name,
        email: mostActive.email,
        activityCount: userStats[0].count
      };
    }
  }
  
  return stats;
};

// Static method to get user activity
activitySchema.statics.getUserActivity = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    caseId,
    type,
    startDate,
    endDate
  } = options;
  
  const query = { user: userId };
  
  if (caseId) query.case = caseId;
  if (type) query.type = type;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const skip = (page - 1) * limit;
  
  const activities = await this.find(query)
    .populate('case', 'title caseNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments(query);
  
  return {
    activities,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

const Activity = mongoose.model("Activity", activitySchema);
export default Activity;
