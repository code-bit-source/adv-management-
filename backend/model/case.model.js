import mongoose from "mongoose";

const caseSchema = new mongoose.Schema(
  {
    // Basic Information
    caseNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows null during creation, will be set by pre-save hook
    },
    title: {
      type: String,
      required: [true, "Case title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Case description is required"],
    },
    
    // Case Classification
    category: {
      type: String,
      enum: [
        "civil",
        "criminal",
        "family",
        "property",
        "corporate",
        "labor",
        "tax",
        "constitutional",
        "other",
      ],
      required: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    
    // Status
    status: {
      type: String,
      enum: ["draft", "active", "pending", "on_hold", "closed", "won", "lost"],
      default: "draft",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    
    // Parties Involved
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    advocate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paralegals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    
    // Court Information
    courtName: {
      type: String,
      trim: true,
    },
    courtLocation: {
      city: String,
      state: String,
      country: { type: String, default: "India" },
    },
    judgeAssigned: {
      type: String,
      trim: true,
    },
    
    // Important Dates
    filingDate: {
      type: Date,
    },
    nextHearingDate: {
      type: Date,
    },
    closedDate: {
      type: Date,
    },
    
    // Case Details
    opposingParty: {
      name: String,
      advocate: String,
      contact: String,
    },
    caseValue: {
      type: Number,
      min: 0,
    },
    
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    convertedFromNote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    
    // Tracking
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
    
    // Statistics
    totalDocuments: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    totalTasks: {
      type: Number,
      default: 0,
    },
    totalHearings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
caseSchema.index({ caseNumber: 1 });
caseSchema.index({ client: 1, status: 1 });
caseSchema.index({ advocate: 1, status: 1 });
caseSchema.index({ paralegals: 1 });
caseSchema.index({ status: 1, priority: 1 });
caseSchema.index({ nextHearingDate: 1 });
caseSchema.index({ createdAt: -1 });

// Generate unique case number
caseSchema.pre("save", async function () {
  if (!this.caseNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("Case").countDocuments();
    this.caseNumber = `CASE/${year}/${String(count + 1).padStart(6, "0")}`;
  }
});

// Virtual for case duration
caseSchema.virtual("caseDuration").get(function () {
  if (this.closedDate && this.filingDate) {
    const duration = this.closedDate - this.filingDate;
    return Math.floor(duration / (1000 * 60 * 60 * 24)); // days
  }
  return null;
});

// Virtual for days until next hearing
caseSchema.virtual("daysUntilHearing").get(function () {
  if (this.nextHearingDate) {
    const today = new Date();
    const hearing = new Date(this.nextHearingDate);
    const diff = hearing - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Method to check if user has access to case
caseSchema.methods.hasAccess = function (userId, userRole) {
  if (userRole === "admin") return true;
  
  const userIdStr = userId.toString();
  
  // Check if user is client, advocate, or paralegal
  if (this.client.toString() === userIdStr) return true;
  if (this.advocate.toString() === userIdStr) return true;
  if (this.paralegals.some((p) => p.toString() === userIdStr)) return true;
  
  return false;
};

// Method to check if user can edit case
caseSchema.methods.canEdit = function (userId, userRole) {
  if (userRole === "admin") return true;
  
  const userIdStr = userId.toString();
  
  // Only advocate and admin can edit
  if (this.advocate.toString() === userIdStr) return true;
  
  return false;
};

// Static method to get cases by user role
caseSchema.statics.getCasesByRole = async function (userId, userRole) {
  let query = {};
  
  if (userRole === "admin") {
    // Admin can see all cases
    query = {};
  } else if (userRole === "client") {
    // Client can see their own cases
    query = { client: userId };
  } else if (userRole === "advocate") {
    // Advocate can see cases they're handling
    query = { advocate: userId };
  } else if (userRole === "paralegal") {
    // Paralegal can see cases they're assigned to
    query = { paralegals: userId };
  }
  
  return this.find(query);
};

// Method to archive case
caseSchema.methods.archive = async function () {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Method to unarchive case
caseSchema.methods.unarchive = async function () {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

// Method to close case
caseSchema.methods.closeCase = async function (outcome) {
  this.status = outcome; // 'won' or 'lost' or 'closed'
  this.closedDate = new Date();
  return this.save();
};

const Case = mongoose.model("Case", caseSchema);
export default Case;
