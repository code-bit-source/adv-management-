import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  // Document Information
  name: {
    type: String,
    required: [true, "Document name is required"],
    trim: true,
    maxlength: [200, "Document name cannot exceed 200 characters"]
  },

  description: {
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"]
  },

  // File Information
  fileName: {
    type: String,
    required: [true, "File name is required"]
  },

  originalName: {
    type: String,
    required: true
  },

  filePath: {
    type: String,
    required: [true, "File path is required"]
  },

  fileUrl: {
    type: String,
    required: true
  },

  fileType: {
    type: String,
    required: true,
    enum: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  },

  fileSize: {
    type: Number,
    required: true,
    max: [10485760, "File size cannot exceed 10MB"] // 10MB in bytes
  },

  // Document Category
  category: {
    type: String,
    enum: [
      'evidence',
      'contract',
      'agreement',
      'court_order',
      'petition',
      'affidavit',
      'notice',
      'correspondence',
      'identity_proof',
      'property_document',
      'financial_document',
      'medical_record',
      'police_report',
      'witness_statement',
      'legal_opinion',
      'case_law',
      'other'
    ],
    required: true
  },

  subCategory: {
    type: String,
    trim: true
  },

  // Related Entities
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Case",
    index: true
  },

  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Note"
  },

  timelineEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Timeline"
  },

  // Upload Information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  uploadedAt: {
    type: Date,
    default: Date.now
  },

  // Version Control
  version: {
    type: Number,
    default: 1
  },

  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document"
  },

  isLatestVersion: {
    type: Boolean,
    default: true
  },

  // Access Control
  accessPermissions: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowedUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      permission: {
        type: String,
        enum: ['view', 'download', 'edit', 'delete'],
        default: 'view'
      }
    }],
    allowedRoles: [{
      type: String,
      enum: ['client', 'advocate', 'paralegal', 'admin']
    }]
  },

  // Document Status
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'archived'],
    default: 'approved'
  },

  // Metadata
  tags: [{
    type: String,
    trim: true
  }],

  confidential: {
    type: Boolean,
    default: false
  },

  expiryDate: {
    type: Date
  },

  // Tracking
  downloadCount: {
    type: Number,
    default: 0
  },

  lastDownloadedAt: {
    type: Date
  },

  lastDownloadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // Additional Notes
  notes: {
    type: String,
    maxlength: [2000, "Notes cannot exceed 2000 characters"]
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
documentSchema.index({ case: 1, category: 1 });
documentSchema.index({ uploadedBy: 1, uploadedAt: -1 });
documentSchema.index({ case: 1, isDeleted: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ createdAt: -1 });

// Virtual: File extension
documentSchema.virtual('fileExtension').get(function() {
  if (!this.fileName) return '';
  const parts = this.fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
});

// Virtual: File size in MB
documentSchema.virtual('fileSizeMB').get(function() {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Virtual: Is expired
documentSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual: Days until expiry
documentSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diff = expiry - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Method: Check if user has access
documentSchema.methods.hasAccess = function(userId, userRole) {
  // Admin always has access
  if (userRole === 'admin') return true;

  // Uploader always has access
  if (this.uploadedBy.toString() === userId.toString()) return true;

  // Check if document is public
  if (this.accessPermissions.isPublic) return true;

  // Check if user's role is in allowed roles
  if (this.accessPermissions.allowedRoles.includes(userRole)) return true;

  // Check if user is in allowed users list
  const hasUserAccess = this.accessPermissions.allowedUsers.some(
    au => au.user.toString() === userId.toString()
  );
  if (hasUserAccess) return true;

  // If document is related to a case, check case access
  if (this.case) {
    // This will be checked in the controller by fetching the case
    return 'check_case_access';
  }

  return false;
};

// Method: Check if user can edit
documentSchema.methods.canEdit = function(userId, userRole) {
  // Admin can always edit
  if (userRole === 'admin') return true;

  // Uploader can edit
  if (this.uploadedBy.toString() === userId.toString()) return true;

  // Check if user has edit permission
  const userPermission = this.accessPermissions.allowedUsers.find(
    au => au.user.toString() === userId.toString()
  );
  
  if (userPermission && ['edit', 'delete'].includes(userPermission.permission)) {
    return true;
  }

  return false;
};

// Method: Check if user can delete
documentSchema.methods.canDelete = function(userId, userRole) {
  // Admin can always delete
  if (userRole === 'admin') return true;

  // Uploader can delete
  if (this.uploadedBy.toString() === userId.toString()) return true;

  // Check if user has delete permission
  const userPermission = this.accessPermissions.allowedUsers.find(
    au => au.user.toString() === userId.toString()
  );
  
  if (userPermission && userPermission.permission === 'delete') {
    return true;
  }

  return false;
};

// Method: Increment download count
documentSchema.methods.recordDownload = function(userId) {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  this.lastDownloadedBy = userId;
  return this.save();
};

// Method: Soft delete
documentSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method: Restore deleted document
documentSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

// Static: Get documents by case
documentSchema.statics.getByCase = function(caseId, includeDeleted = false) {
  const query = { case: caseId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.find(query)
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 });
};

// Static: Get documents by category
documentSchema.statics.getByCategory = function(category, caseId = null) {
  const query = { category, isDeleted: false };
  if (caseId) {
    query.case = caseId;
  }
  return this.find(query)
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 });
};

// Static: Search documents
documentSchema.statics.searchDocuments = function(searchTerm, caseId = null) {
  const query = {
    isDeleted: false,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } },
      { originalName: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (caseId) {
    query.case = caseId;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 });
};

const Document = mongoose.model("Document", documentSchema);
export default Document;
