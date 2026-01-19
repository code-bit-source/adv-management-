import Notification from "../model/notification.model.js";

// ==================== GET NOTIFICATIONS ====================
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, unread, type, priority } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      unread: unread === 'true',
      type,
      priority
    };

    const result = await Notification.getUserNotifications(userId, options);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving notifications",
      error: error.message
    });
  }
};

// ==================== GET NOTIFICATION BY ID ====================
export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    // Check if user can view this notification
    if (!notification.canView(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this notification"
      });
    }

    return res.status(200).json({
      success: true,
      notification
    });

  } catch (error) {
    console.error("Get notification by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving notification",
      error: error.message
    });
  }
};

// ==================== GET UNREAD COUNT ====================
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    const count = await Notification.getUnreadCount(userId, type);

    return res.status(200).json({
      success: true,
      count,
      type: type || 'all'
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

// ==================== MARK AS READ ====================
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    // Check if user owns this notification
    if (!notification.canView(userId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this notification"
      });
    }

    await notification.markAsRead();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification
    });

  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking notification as read",
      error: error.message
    });
  }
};

// ==================== MARK ALL AS READ ====================
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    const count = await Notification.markAllAsRead(userId, type);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      count,
      type: type || 'all'
    });

  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
      error: error.message
    });
  }
};

// ==================== DELETE NOTIFICATION ====================
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    // Check if user owns this notification
    if (!notification.canView(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this notification"
      });
    }

    await Notification.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });

  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: error.message
    });
  }
};

// ==================== DELETE ALL READ ====================
export const deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.deleteMany({
      user: userId,
      isRead: true
    });

    return res.status(200).json({
      success: true,
      message: "All read notifications deleted",
      count: result.deletedCount
    });

  } catch (error) {
    console.error("Delete all read error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting notifications",
      error: error.message
    });
  }
};

// ==================== GET NOTIFICATIONS BY TYPE ====================
export const getNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;
    const { page, limit } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    };

    const result = await Notification.getByType(userId, type, options);

    return res.status(200).json({
      success: true,
      type,
      ...result
    });

  } catch (error) {
    console.error("Get notifications by type error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving notifications",
      error: error.message
    });
  }
};

// ==================== GET NOTIFICATIONS BY PRIORITY ====================
export const getNotificationsByPriority = async (req, res) => {
  try {
    const { priority } = req.params;
    const userId = req.user.id;
    const { page, limit, unread } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      unread: unread === 'true'
    };

    const result = await Notification.getByPriority(userId, priority, options);

    return res.status(200).json({
      success: true,
      priority,
      ...result
    });

  } catch (error) {
    console.error("Get notifications by priority error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving notifications",
      error: error.message
    });
  }
};

// ==================== CREATE NOTIFICATION (Helper Function) ====================
// This function is exported to be used by other controllers
export const createNotification = async (data) => {
  try {
    const notification = await Notification.createNotification(data);
    return notification;
  } catch (error) {
    console.error("Create notification error:", error);
    throw error;
  }
};

// ==================== DELETE OLD NOTIFICATIONS (Cleanup) ====================
export const deleteOldNotifications = async (req, res) => {
  try {
    // Only admin can run cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can run cleanup"
      });
    }

    const { days } = req.query;
    const daysToKeep = parseInt(days) || 30;

    const count = await Notification.deleteOld(daysToKeep);

    return res.status(200).json({
      success: true,
      message: `Deleted notifications older than ${daysToKeep} days`,
      count
    });

  } catch (error) {
    console.error("Delete old notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting old notifications",
      error: error.message
    });
  }
};

// ==================== DELETE EXPIRED NOTIFICATIONS ====================
export const deleteExpiredNotifications = async (req, res) => {
  try {
    // Only admin can run cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can run cleanup"
      });
    }

    const count = await Notification.deleteExpired();

    return res.status(200).json({
      success: true,
      message: "Deleted expired notifications",
      count
    });

  } catch (error) {
    console.error("Delete expired notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting expired notifications",
      error: error.message
    });
  }
};
