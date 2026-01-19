import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, "Checklist item cannot exceed 500 characters"],
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  dueDate: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Note content is required"],
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster queries
    },
    category: {
      type: String,
      enum: ["personal", "legal", "evidence", "important", "other"],
      default: "personal",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags) {
          return tags.length <= 10;
        },
        message: "Cannot have more than 10 tags",
      },
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: function (attachments) {
          return attachments.length <= 10;
        },
        message: "Cannot have more than 10 attachments",
      },
    },
    checklists: {
      type: [checklistItemSchema],
      default: [],
      validate: {
        validator: function (checklists) {
          return checklists.length <= 50;
        },
        message: "Cannot have more than 50 checklist items",
      },
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    canConvertToCase: {
      type: Boolean,
      default: true,
    },
    convertedToCase: {
      type: Boolean,
      default: false,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for better query performance
noteSchema.index({ user: 1, status: 1 });
noteSchema.index({ user: 1, category: 1 });
noteSchema.index({ createdAt: -1 });

// Virtual for attachment count
noteSchema.virtual("attachmentCount").get(function () {
  return this.attachments.length;
});

// Virtual for checklist count
noteSchema.virtual("checklistCount").get(function () {
  return this.checklists.length;
});

// Virtual for completed checklist items count
noteSchema.virtual("completedChecklistCount").get(function () {
  return this.checklists.filter(item => item.isCompleted).length;
});

// Virtual for checklist progress percentage
noteSchema.virtual("checklistProgress").get(function () {
  if (this.checklists.length === 0) return 0;
  return Math.round((this.completedChecklistCount / this.checklists.length) * 100);
});

// Method to check if user owns this note
noteSchema.methods.isOwnedBy = function (userId) {
  return this.user.toString() === userId.toString();
};

const Note = mongoose.model("Note", noteSchema);
export default Note;
