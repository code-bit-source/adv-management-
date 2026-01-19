import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester is required"],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
      index: true,
    },
    connectionType: {
      type: String,
      enum: ["advocate", "paralegal"],
      required: [true, "Connection type is required"],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
      required: true,
      index: true,
    },
    requestMessage: {
      type: String,
      trim: true,
      maxlength: [500, "Request message cannot exceed 500 characters"],
      default: null,
    },
    responseMessage: {
      type: String,
      trim: true,
      maxlength: [500, "Response message cannot exceed 500 characters"],
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });
connectionSchema.index({ requester: 1, status: 1 });
connectionSchema.index({ recipient: 1, status: 1 });
connectionSchema.index({ status: 1, createdAt: -1 });

// Virtual for connection duration
connectionSchema.virtual("connectionDuration").get(function () {
  if (this.status === "accepted" && this.respondedAt) {
    return Math.floor((Date.now() - this.respondedAt) / (1000 * 60 * 60 * 24)); // days
  }
  return 0;
});

// Method to check if connection is pending
connectionSchema.methods.isPending = function () {
  return this.status === "pending";
};

// Method to check if connection is active
connectionSchema.methods.isAccepted = function () {
  return this.status === "accepted" && this.isActive;
};

// Method to accept connection
connectionSchema.methods.accept = function (responseMessage = null) {
  this.status = "accepted";
  this.respondedAt = new Date();
  this.responseMessage = responseMessage;
  return this.save();
};

// Method to reject connection
connectionSchema.methods.reject = function (responseMessage = null) {
  this.status = "rejected";
  this.respondedAt = new Date();
  this.responseMessage = responseMessage;
  this.isActive = false;
  return this.save();
};

// Method to block connection
connectionSchema.methods.block = function () {
  this.status = "blocked";
  this.isActive = false;
  return this.save();
};

// Static method to check if connection already exists
connectionSchema.statics.connectionExists = async function (requesterId, recipientId) {
  const connection = await this.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });
  return !!connection;
};

// Static method to get active connection between two users
connectionSchema.statics.getActiveConnection = async function (user1Id, user2Id) {
  return await this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id, status: "accepted", isActive: true },
      { requester: user2Id, recipient: user1Id, status: "accepted", isActive: true },
    ],
  })
    .populate("requester", "name email role profilePicture")
    .populate("recipient", "name email role profilePicture");
};

const Connection = mongoose.model("Connection", connectionSchema);
export default Connection;
