import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  // Message Content
  content: {
    type: String,
    required: [true, "Message content is required"],
    maxlength: [5000, "Message content cannot exceed 5000 characters"],
    trim: true
  },
  
  messageType: {
    type: String,
    enum: ['text', 'file', 'system'],
    default: 'text'
  },
  
  // Sender & Receiver
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Sender is required"]
  },
  
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Context - Message can be related to a case or connection
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  },
  
  connection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Connection'
  },
  
  // Message Threading
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  threadId: {
    type: String,
    index: true
  },
  
  // Attachments
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: {
    type: Date
  },
  
  isDelivered: {
    type: Boolean,
    default: true // Auto-delivered in our system
  },
  
  deliveredAt: {
    type: Date,
    default: Date.now
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Metadata
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  isImportant: {
    type: Boolean,
    default: false
  },
  
  isStarred: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================

// Case messages - for getting all messages in a case
messageSchema.index({ case: 1, createdAt: -1 });

// Sent messages - for getting user's sent messages
messageSchema.index({ sender: 1, createdAt: -1 });

// Received messages - for getting user's received messages
messageSchema.index({ receiver: 1, createdAt: -1 });

// Connection messages - for getting messages in a connection
messageSchema.index({ connection: 1, createdAt: -1 });

// Message threads - for getting threaded conversations
messageSchema.index({ threadId: 1, createdAt: 1 });

// Unread messages - for getting unread count
messageSchema.index({ isRead: 1, receiver: 1 });

// Compound index for case + sender
messageSchema.index({ case: 1, sender: 1, createdAt: -1 });

// ==================== INSTANCE METHODS ====================

// Mark message as read
messageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Mark message as delivered
messageSchema.methods.markAsDelivered = async function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    await this.save();
  }
  return this;
};

// Soft delete message
messageSchema.methods.softDelete = async function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save();
  return this;
};

// Check if user can view this message
messageSchema.methods.canView = function(userId) {
  // User can view if they are sender or receiver
  if (this.sender.toString() === userId.toString() || 
      this.receiver?.toString() === userId.toString()) {
    return true;
  }
  
  // For case messages, check if user is part of the case (will be checked in controller)
  // For connection messages, check if user is part of the connection (will be checked in controller)
  
  return false;
};

// Check if user can delete this message
messageSchema.methods.canDelete = function(userId) {
  // Only sender can delete their own message
  return this.sender.toString() === userId.toString();
};

// ==================== STATIC METHODS ====================

// Get unread count for a user
messageSchema.statics.getUnreadCount = async function(userId, caseId = null) {
  const query = {
    receiver: userId,
    isRead: false,
    isDeleted: false
  };
  
  if (caseId) {
    query.case = caseId;
  }
  
  return await this.countDocuments(query);
};

// Get case messages with pagination
messageSchema.statics.getCaseMessages = async function(caseId, options = {}) {
  const {
    page = 1,
    limit = 50,
    unread = false
  } = options;
  
  const query = {
    case: caseId,
    isDeleted: false
  };
  
  if (unread) {
    query.isRead = false;
  }
  
  const skip = (page - 1) * limit;
  
  const messages = await this.find(query)
    .populate('sender', 'name email role profilePicture')
    .populate('receiver', 'name email role profilePicture')
    .populate('replyTo', 'content sender createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments(query);
  
  return {
    messages,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Get connection messages with pagination
messageSchema.statics.getConnectionMessages = async function(connectionId, options = {}) {
  const {
    page = 1,
    limit = 50
  } = options;
  
  const query = {
    connection: connectionId,
    isDeleted: false
  };
  
  const skip = (page - 1) * limit;
  
  const messages = await this.find(query)
    .populate('sender', 'name email role profilePicture')
    .populate('receiver', 'name email role profilePicture')
    .populate('replyTo', 'content sender createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments(query);
  
  return {
    messages,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Get conversation between two users
messageSchema.statics.getConversation = async function(user1Id, user2Id, options = {}) {
  const {
    page = 1,
    limit = 50,
    caseId = null
  } = options;
  
  const query = {
    $or: [
      { sender: user1Id, receiver: user2Id },
      { sender: user2Id, receiver: user1Id }
    ],
    isDeleted: false
  };
  
  if (caseId) {
    query.case = caseId;
  }
  
  const skip = (page - 1) * limit;
  
  const messages = await this.find(query)
    .populate('sender', 'name email role profilePicture')
    .populate('receiver', 'name email role profilePicture')
    .populate('case', 'title caseNumber')
    .populate('replyTo', 'content sender createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments(query);
  
  return {
    messages,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Get user's messages (sent + received)
messageSchema.statics.getUserMessages = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    caseId = null,
    connectionId = null,
    unread = false
  } = options;
  
  const query = {
    $or: [
      { sender: userId },
      { receiver: userId }
    ],
    isDeleted: false
  };
  
  if (caseId) {
    query.case = caseId;
  }
  
  if (connectionId) {
    query.connection = connectionId;
  }
  
  if (unread) {
    query.isRead = false;
    query.receiver = userId; // Only unread received messages
  }
  
  const skip = (page - 1) * limit;
  
  const messages = await this.find(query)
    .populate('sender', 'name email role profilePicture')
    .populate('receiver', 'name email role profilePicture')
    .populate('case', 'title caseNumber')
    .populate('connection')
    .populate('replyTo', 'content sender createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments(query);
  
  return {
    messages,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Search messages
messageSchema.statics.searchMessages = async function(userId, searchQuery, options = {}) {
  const {
    page = 1,
    limit = 20,
    caseId = null
  } = options;
  
  const query = {
    $or: [
      { sender: userId },
      { receiver: userId }
    ],
    content: { $regex: searchQuery, $options: 'i' },
    isDeleted: false
  };
  
  if (caseId) {
    query.case = caseId;
  }
  
  const skip = (page - 1) * limit;
  
  const messages = await this.find(query)
    .populate('sender', 'name email role profilePicture')
    .populate('receiver', 'name email role profilePicture')
    .populate('case', 'title caseNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments(query);
  
  return {
    messages,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// ==================== MIDDLEWARE ====================

// Pre-save middleware to generate threadId if replying to a message
messageSchema.pre('save', async function(next) {
  if (this.isNew && this.replyTo) {
    // Get the original message to get its threadId
    const originalMessage = await this.constructor.findById(this.replyTo);
    if (originalMessage) {
      // Use the original message's threadId or create new one
      this.threadId = originalMessage.threadId || originalMessage._id.toString();
    }
  } else if (this.isNew && !this.threadId) {
    // If it's a new message and not a reply, use its own ID as threadId
    this.threadId = this._id.toString();
  }
  
  next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
