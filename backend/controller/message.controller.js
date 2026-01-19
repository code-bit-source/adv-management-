import Message from "../model/message.model.js";
import Case from "../model/case.model.js";
import Connection from "../model/connection.model.js";
import { logActivity } from "./activity.controller.js";

// ==================== SEND MESSAGE ====================
export const sendMessage = async (req, res) => {
  try {
    const { content, receiver, case: caseId, connection: connectionId, replyTo, priority, messageType } = req.body;
    const senderId = req.user.id;

    // Validate required fields
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Message content is required"
      });
    }

    // Validate that either receiver, case, or connection is provided
    if (!receiver && !caseId && !connectionId) {
      return res.status(400).json({
        success: false,
        message: "Message must have a receiver, case, or connection"
      });
    }

    // If case is provided, verify user has access to the case
    if (caseId) {
      const caseDoc = await Case.findById(caseId);
      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: "Case not found"
        });
      }

      // Check if user is part of the case
      const isClient = caseDoc.client?.toString() === senderId;
      const isAdvocate = caseDoc.advocate?.toString() === senderId;
      const isParalegal = caseDoc.paralegals?.some(p => p.toString() === senderId);

      if (!isClient && !isAdvocate && !isParalegal && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this case"
        });
      }
    }

    // If connection is provided, verify user is part of the connection
    if (connectionId) {
      const conn = await Connection.findById(connectionId);
      if (!conn) {
        return res.status(404).json({
          success: false,
          message: "Connection not found"
        });
      }

      const isPartOfConnection = conn.from.toString() === senderId || conn.to.toString() === senderId;
      if (!isPartOfConnection) {
        return res.status(403).json({
          success: false,
          message: "You are not part of this connection"
        });
      }
    }

    // Create message
    const message = await Message.create({
      content: content.trim(),
      sender: senderId,
      receiver,
      case: caseId,
      connection: connectionId,
      replyTo,
      priority: priority || 'normal',
      messageType: messageType || 'text'
    });

    // Populate sender and receiver details
    await message.populate('sender', 'name email role profilePicture');
    if (receiver) {
      await message.populate('receiver', 'name email role profilePicture');
    }
    if (caseId) {
      await message.populate('case', 'title caseNumber');
    }

    // Log activity
    if (caseId) {
      await logActivity({
        caseId,
        userId: senderId,
        type: 'message_sent',
        description: `Message sent in case`,
        action: 'sent message',
        relatedEntity: {
          entityType: 'Message',
          entityId: message._id
        },
        importance: priority === 'urgent' ? 'high' : 'low',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    // TODO: Trigger notification for receiver

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message
    });

  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message
    });
  }
};

// ==================== GET MESSAGES ====================
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, caseId, connectionId, unread } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      caseId,
      connectionId,
      unread: unread === 'true'
    };

    const result = await Message.getUserMessages(userId, options);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving messages",
      error: error.message
    });
  }
};

// ==================== GET CASE MESSAGES ====================
export const getCaseMessages = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const { page, limit, unread } = req.query;

    // Verify case exists and user has access
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check access
    const isClient = caseDoc.client?.toString() === userId;
    const isAdvocate = caseDoc.advocate?.toString() === userId;
    const isParalegal = caseDoc.paralegals?.some(p => p.toString() === userId);

    if (!isClient && !isAdvocate && !isParalegal && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      unread: unread === 'true'
    };

    const result = await Message.getCaseMessages(caseId, options);

    return res.status(200).json({
      success: true,
      caseId,
      ...result
    });

  } catch (error) {
    console.error("Get case messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving case messages",
      error: error.message
    });
  }
};

// ==================== GET CONNECTION MESSAGES ====================
export const getConnectionMessages = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user.id;
    const { page, limit } = req.query;

    // Verify connection exists and user is part of it
    const conn = await Connection.findById(connectionId);
    if (!conn) {
      return res.status(404).json({
        success: false,
        message: "Connection not found"
      });
    }

    const isPartOfConnection = conn.from.toString() === userId || conn.to.toString() === userId;
    if (!isPartOfConnection) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this connection"
      });
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    };

    const result = await Message.getConnectionMessages(connectionId, options);

    return res.status(200).json({
      success: true,
      connectionId,
      ...result
    });

  } catch (error) {
    console.error("Get connection messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving connection messages",
      error: error.message
    });
  }
};

// ==================== GET CONVERSATION ====================
export const getConversation = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.id;
    const { page, limit, caseId } = req.query;

    // Verify connection exists between users
    const connection = await Connection.findOne({
      $or: [
        { from: currentUserId, to: otherUserId, status: 'accepted' },
        { from: otherUserId, to: currentUserId, status: 'accepted' }
      ]
    });

    if (!connection && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "No active connection with this user"
      });
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      caseId
    };

    const result = await Message.getConversation(currentUserId, otherUserId, options);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Get conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving conversation",
      error: error.message
    });
  }
};

// ==================== GET MESSAGE BY ID ====================
export const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id)
      .populate('sender', 'name email role profilePicture')
      .populate('receiver', 'name email role profilePicture')
      .populate('case', 'title caseNumber')
      .populate('connection')
      .populate('replyTo', 'content sender createdAt');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Check if user can view this message
    if (!message.canView(userId) && req.user.role !== 'admin') {
      // Additional check for case messages
      if (message.case) {
        const caseDoc = await Case.findById(message.case);
        const isClient = caseDoc.client?.toString() === userId;
        const isAdvocate = caseDoc.advocate?.toString() === userId;
        const isParalegal = caseDoc.paralegals?.some(p => p.toString() === userId);
        
        if (!isClient && !isAdvocate && !isParalegal) {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to view this message"
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view this message"
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: message
    });

  } catch (error) {
    console.error("Get message by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving message",
      error: error.message
    });
  }
};

// ==================== MARK AS READ ====================
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Only receiver can mark as read
    if (message.receiver?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the receiver can mark message as read"
      });
    }

    await message.markAsRead();

    return res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: message
    });

  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking message as read",
      error: error.message
    });
  }
};

// ==================== MARK ALL AS READ ====================
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { caseId } = req.query;

    const query = {
      receiver: userId,
      isRead: false,
      isDeleted: false
    };

    if (caseId) {
      query.case = caseId;
    }

    const result = await Message.updateMany(
      query,
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: "All messages marked as read",
      count: result.modifiedCount
    });

  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking messages as read",
      error: error.message
    });
  }
};

// ==================== DELETE MESSAGE ====================
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Check if user can delete
    if (!message.canDelete(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages"
      });
    }

    await message.softDelete(userId);

    // Log activity if case message
    if (message.case) {
      await logActivity({
        caseId: message.case,
        userId,
        type: 'message_deleted',
        description: `Message deleted`,
        action: 'deleted message',
        importance: 'low',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });

  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting message",
      error: error.message
    });
  }
};

// ==================== UPLOAD ATTACHMENT ====================
export const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Only sender can add attachments
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the sender can add attachments"
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    // Add attachments to message
    const attachments = req.files.map(file => ({
      fileName: file.originalname,
      fileUrl: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date()
    }));

    message.attachments.push(...attachments);
    await message.save();

    return res.status(200).json({
      success: true,
      message: "Attachments uploaded successfully",
      data: message
    });

  } catch (error) {
    console.error("Upload attachment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading attachments",
      error: error.message
    });
  }
};

// ==================== GET UNREAD COUNT ====================
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { caseId } = req.query;

    const count = await Message.getUnreadCount(userId, caseId);

    return res.status(200).json({
      success: true,
      count
    });

  } catch (error) {
    console.error("Get unread count error:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting unread count",
      error: error.message
    });
  }
};

// ==================== SEARCH MESSAGES ====================
export const searchMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, page, limit, caseId } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      caseId
    };

    const result = await Message.searchMessages(userId, q.trim(), options);

    return res.status(200).json({
      success: true,
      query: q,
      ...result
    });

  } catch (error) {
    console.error("Search messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching messages",
      error: error.message
    });
  }
};
