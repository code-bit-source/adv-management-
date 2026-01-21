import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, "Title is required"],
    maxlength: [200, "Title cannot exceed 200 characters"],
    trim: true
  },
  
  description: {
    type: String,
    required: [true, "Description is required"],
    maxlength: [2000, "Description cannot exceed 2000 characters"],
    trim: true
  },
  
  // Case Reference
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: [true, "Case is required"],
    index: true
  },
  
  // Assignment
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Assigner is required"],
    index: true
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Assignee is required"],
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending',
    index: true
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // Deadlines
  dueDate: {
    type: Date,
    required: [true, "Due date is required"],
    index: true
  },
  
  startDate: {
    type: Date
  },
  
  completedDate: {
    type: Date
  },
  
  // Progress
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Task Type
  type: {
    type: String,
    enum: [
      'research',
      'document_preparation',
      'filing',
      'client_communication',
      'court_appearance',
      'evidence_collection',
      'other'
    ],
    default: 'other'
  },
  
  // Comments/Notes
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"]
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Attachments
  attachments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Checklist
  checklist: [{
    item: {
      type: String,
      required: true,
      maxlength: [200, "Checklist item cannot exceed 200 characters"]
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  
  // Metadata
  estimatedHours: {
    type: Number,
    min: 0
  },
  
  actualHours: {
    type: Number,
    min: 0
  },
  
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// ==================== INDEXES ====================

// Paralegal tasks - get tasks assigned to paralegal
taskSchema.index({ assignedTo: 1, status: 1 });

// Advocate tasks - get tasks created by advocate
taskSchema.index({ assignedBy: 1, createdAt: -1 });

// Case tasks - get tasks for a case
taskSchema.index({ case: 1, status: 1 });

// Pending tasks by deadline - for overdue detection
taskSchema.index({ status: 1, dueDate: 1 });

// By priority - for filtering
taskSchema.index({ priority: 1, status: 1 });

// Upcoming deadlines
taskSchema.index({ dueDate: 1, status: 1 });

// ==================== INSTANCE METHODS ====================

// Update task status
taskSchema.methods.updateStatus = async function(status) {
  this.status = status;
  
  if (status === 'completed') {
    this.completedDate = new Date();
    this.progress = 100;
  } else if (status === 'in_progress' && !this.startDate) {
    this.startDate = new Date();
  }
  
  await this.save();
  return this;
};

// Add comment
taskSchema.methods.addComment = async function(userId, comment) {
  this.comments.push({
    user: userId,
    comment,
    createdAt: new Date()
  });
  
  await this.save();
  return this;
};

// Update progress
taskSchema.methods.updateProgress = async function(progress) {
  this.progress = Math.min(100, Math.max(0, progress));
  
  // Auto-update status based on progress
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedDate = new Date();
  } else if (this.progress > 0 && this.status === 'pending') {
    this.status = 'in_progress';
    if (!this.startDate) {
      this.startDate = new Date();
    }
  }
  
  await this.save();
  return this;
};

// Mark as complete
taskSchema.methods.complete = async function() {
  this.status = 'completed';
  this.completedDate = new Date();
  this.progress = 100;
  
  await this.save();
  return this;
};

// Check if user can edit this task
taskSchema.methods.canEdit = function(userId) {
  return this.assignedBy.toString() === userId.toString();
};

// Check if user can view this task
taskSchema.methods.canView = function(userId) {
  return (
    this.assignedBy.toString() === userId.toString() ||
    this.assignedTo.toString() === userId.toString()
  );
};

// Check if user can update status/progress
taskSchema.methods.canUpdateStatus = function(userId) {
  return (
    this.assignedTo.toString() === userId.toString() ||
    this.assignedBy.toString() === userId.toString()
  );
};

// Check if task is overdue
taskSchema.methods.isOverdue = function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
};

// ==================== STATIC METHODS ====================

// Get paralegal's tasks
taskSchema.statics.getParalegalTasks = async function(paralegalId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    priority = null
  } = options;
  
  const query = {
    assignedTo: paralegalId
  };
  
  if (status) {
    query.status = status;
  }
  
  if (priority) {
    query.priority = priority;
  }
  
  const skip = (page - 1) * limit;
  
  const tasks = await this.find(query)
    .sort({ dueDate: 1, priority: -1 })
    .skip(skip)
    .limit(limit)
    .populate('assignedBy', 'name email role')
    .populate('case', 'caseNumber title')
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    tasks,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Get advocate's tasks
taskSchema.statics.getAdvocateTasks = async function(advocateId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    priority = null
  } = options;
  
  const query = {
    assignedBy: advocateId
  };
  
  if (status) {
    query.status = status;
  }
  
  if (priority) {
    query.priority = priority;
  }
  
  const skip = (page - 1) * limit;
  
  const tasks = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('assignedTo', 'name email role')
    .populate('case', 'caseNumber title')
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    tasks,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Get case tasks
taskSchema.statics.getCaseTasks = async function(caseId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null
  } = options;
  
  const query = {
    case: caseId
  };
  
  if (status) {
    query.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const tasks = await this.find(query)
    .sort({ dueDate: 1 })
    .skip(skip)
    .limit(limit)
    .populate('assignedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    tasks,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Get overdue tasks
taskSchema.statics.getOverdueTasks = async function(userId = null, role = null) {
  const query = {
    status: { $in: ['pending', 'in_progress', 'on_hold'] },
    dueDate: { $lt: new Date() }
  };
  
  if (userId && role === 'paralegal') {
    query.assignedTo = userId;
  } else if (userId && role === 'advocate') {
    query.assignedBy = userId;
  }
  
  return await this.find(query)
    .sort({ dueDate: 1 })
    .populate('assignedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('case', 'caseNumber title')
    .lean();
};

// Get task statistics
taskSchema.statics.getTaskStats = async function(userId, role) {
  const query = role === 'paralegal' 
    ? { assignedTo: userId }
    : { assignedBy: userId };
  
  const total = await this.countDocuments(query);
  const pending = await this.countDocuments({ ...query, status: 'pending' });
  const inProgress = await this.countDocuments({ ...query, status: 'in_progress' });
  const completed = await this.countDocuments({ ...query, status: 'completed' });
  const overdue = await this.countDocuments({
    ...query,
    status: { $in: ['pending', 'in_progress'] },
    dueDate: { $lt: new Date() }
  });
  
  return {
    total,
    pending,
    inProgress,
    completed,
    overdue,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
  };
};

// ==================== MIDDLEWARE ====================

// Validate due date before save
taskSchema.pre('save', function(next) {
  if (this.isNew && this.dueDate < new Date()) {
    const error = new Error('Due date must be in the future');
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

const Task = mongoose.model("Task", taskSchema);

export default Task;
