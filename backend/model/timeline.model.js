import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema({
  // Case reference
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Case",
    required: [true, "Case reference is required"],
    index: true
  },

  // Event details
  eventType: {
    type: String,
    enum: [
      'case_created',
      'case_filed',
      'hearing_scheduled',
      'hearing_completed',
      'hearing_postponed',
      'document_submitted',
      'document_received',
      'evidence_submitted',
      'witness_examined',
      'argument_presented',
      'judgment_reserved',
      'judgment_delivered',
      'status_changed',
      'paralegal_assigned',
      'paralegal_removed',
      'case_closed',
      'case_archived',
      'milestone',
      'deadline',
      'note',
      'other'
    ],
    required: [true, "Event type is required"],
    index: true
  },

  title: {
    type: String,
    required: [true, "Event title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },

  description: {
    type: String,
    trim: true,
    maxlength: [2000, "Description cannot exceed 2000 characters"]
  },

  // Event date and time
  eventDate: {
    type: Date,
    required: [true, "Event date is required"],
    index: true
  },

  eventTime: {
    type: String, // Format: "HH:MM" (24-hour)
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: "Invalid time format. Use HH:MM (24-hour format)"
    }
  },

  // Location details (for hearings, meetings, etc.)
  location: {
    courtName: String,
    courtRoom: String,
    address: String,
    city: String,
    state: String,
    pincode: String
  },

  // Hearing specific details
  hearingDetails: {
    hearingType: {
      type: String,
      enum: ['first_hearing', 'regular_hearing', 'final_hearing', 'evidence', 'argument', 'judgment', 'other']
    },
    judgeAssigned: String,
    expectedDuration: Number, // in minutes
    actualDuration: Number, // in minutes
    outcome: String,
    nextHearingDate: Date,
    isCompleted: {
      type: Boolean,
      default: false
    },
    isPostponed: {
      type: Boolean,
      default: false
    },
    postponementReason: String
  },

  // Milestone/Important event
  isMilestone: {
    type: Boolean,
    default: false,
    index: true
  },

  milestoneType: {
    type: String,
    enum: ['case_filed', 'first_hearing', 'evidence_complete', 'argument_complete', 'judgment', 'case_won', 'case_lost', 'other']
  },

  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'postponed', 'cancelled'],
    default: 'scheduled',
    index: true
  },

  // Reminder settings
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    reminderDate: Date,
    reminderTime: String,
    notifyClient: {
      type: Boolean,
      default: true
    },
    notifyParalegals: {
      type: Boolean,
      default: true
    },
    reminderSent: {
      type: Boolean,
      default: false
    }
  },

  // Attachments/Documents
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Notes
  notes: {
    type: String,
    maxlength: [5000, "Notes cannot exceed 5000 characters"]
  },

  // Participants (for hearings/meetings)
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    role: String, // 'advocate', 'client', 'paralegal', 'witness', 'expert', 'other'
    attended: {
      type: Boolean,
      default: false
    }
  }],

  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // Visibility
  isVisible: {
    type: Boolean,
    default: true
  },

  // Metadata
  metadata: {
    type: Map,
    of: String
  }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
timelineSchema.index({ case: 1, eventDate: -1 });
timelineSchema.index({ case: 1, eventType: 1 });
timelineSchema.index({ case: 1, isMilestone: 1 });
timelineSchema.index({ case: 1, status: 1 });
timelineSchema.index({ 'reminder.reminderDate': 1, 'reminder.enabled': 1 });

// Virtual: Is upcoming event
timelineSchema.virtual('isUpcoming').get(function() {
  return this.eventDate > new Date() && this.status === 'scheduled';
});

// Virtual: Is past event
timelineSchema.virtual('isPast').get(function() {
  return this.eventDate < new Date();
});

// Virtual: Days until event
timelineSchema.virtual('daysUntilEvent').get(function() {
  if (this.eventDate < new Date()) return 0;
  const diffTime = this.eventDate - new Date();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual: Full event date time
timelineSchema.virtual('fullDateTime').get(function() {
  if (!this.eventTime) return this.eventDate;
  const [hours, minutes] = this.eventTime.split(':');
  const dateTime = new Date(this.eventDate);
  dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return dateTime;
});

// Method: Mark as completed
timelineSchema.methods.markAsCompleted = function(outcome) {
  this.status = 'completed';
  if (this.hearingDetails) {
    this.hearingDetails.isCompleted = true;
    if (outcome) {
      this.hearingDetails.outcome = outcome;
    }
  }
  return this.save();
};

// Method: Mark as postponed
timelineSchema.methods.markAsPostponed = function(reason, newDate) {
  this.status = 'postponed';
  if (this.hearingDetails) {
    this.hearingDetails.isPostponed = true;
    this.hearingDetails.postponementReason = reason;
    if (newDate) {
      this.hearingDetails.nextHearingDate = newDate;
    }
  }
  return this.save();
};

// Method: Mark as cancelled
timelineSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Method: Enable reminder
timelineSchema.methods.setReminder = function(reminderDate, notifyClient = true, notifyParalegals = true) {
  this.reminder = {
    enabled: true,
    reminderDate: reminderDate,
    notifyClient: notifyClient,
    notifyParalegals: notifyParalegals,
    reminderSent: false
  };
  return this.save();
};

// Static: Get upcoming events for a case
timelineSchema.statics.getUpcomingEvents = function(caseId, limit = 10) {
  return this.find({
    case: caseId,
    eventDate: { $gte: new Date() },
    status: 'scheduled',
    isVisible: true
  })
  .sort({ eventDate: 1 })
  .limit(limit)
  .populate('createdBy', 'name email role')
  .populate('participants.user', 'name email role');
};

// Static: Get past events for a case
timelineSchema.statics.getPastEvents = function(caseId, limit = 20) {
  return this.find({
    case: caseId,
    eventDate: { $lt: new Date() },
    isVisible: true
  })
  .sort({ eventDate: -1 })
  .limit(limit)
  .populate('createdBy', 'name email role')
  .populate('participants.user', 'name email role');
};

// Static: Get milestones for a case
timelineSchema.statics.getMilestones = function(caseId) {
  return this.find({
    case: caseId,
    isMilestone: true,
    isVisible: true
  })
  .sort({ eventDate: -1 })
  .populate('createdBy', 'name email role');
};

// Static: Get hearings for a case
timelineSchema.statics.getHearings = function(caseId, status = null) {
  const query = {
    case: caseId,
    eventType: { $in: ['hearing_scheduled', 'hearing_completed', 'hearing_postponed'] },
    isVisible: true
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
  .sort({ eventDate: -1 })
  .populate('createdBy', 'name email role')
  .populate('participants.user', 'name email role');
};

// Static: Get next hearing for a case
timelineSchema.statics.getNextHearing = function(caseId) {
  return this.findOne({
    case: caseId,
    eventType: { $in: ['hearing_scheduled'] },
    eventDate: { $gte: new Date() },
    status: 'scheduled',
    isVisible: true
  })
  .sort({ eventDate: 1 })
  .populate('createdBy', 'name email role');
};

// Static: Get events requiring reminders
timelineSchema.statics.getEventsForReminder = function() {
  const now = new Date();
  return this.find({
    'reminder.enabled': true,
    'reminder.reminderSent': false,
    'reminder.reminderDate': { $lte: now },
    status: 'scheduled',
    isVisible: true
  })
  .populate('case')
  .populate('createdBy', 'name email role');
};

// Pre-save middleware: Set reminder date if not set
timelineSchema.pre('save', function() {
  // If reminder is enabled but no reminder date, set it to 1 day before event
  if (this.reminder && this.reminder.enabled && !this.reminder.reminderDate) {
    const reminderDate = new Date(this.eventDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(9, 0, 0, 0); // 9 AM
    this.reminder.reminderDate = reminderDate;
  }
});

const Timeline = mongoose.model("Timeline", timelineSchema);
export default Timeline;
