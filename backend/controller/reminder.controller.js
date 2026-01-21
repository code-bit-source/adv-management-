import Reminder from "../model/reminder.model.js";
import Case from "../model/case.model.js";
import { createNotification } from "./notification.controller.js";
import { logActivity } from "./activity.controller.js";

// ==================== CREATE REMINDER ====================
export const createReminder = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      reminderDate,
      eventDate,
      recipients,
      relatedEntity,
      isRecurring,
      recurrence,
      priority,
      notificationChannels,
      actionUrl,
      actionText,
      metadata
    } = req.body;

    const userId = req.user.id;

    // Validate reminder date
    if (new Date(reminderDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reminder date must be in the future"
      });
    }

    // Create reminder
    const reminder = await Reminder.createReminder({
      title,
      message,
      type,
      reminderDate,
      eventDate,
      recipients,
      createdBy: userId,
      relatedEntity,
      isRecurring,
      recurrence,
      priority,
      notificationChannels,
      actionUrl,
      actionText,
      metadata
    });

    // Log activity
    if (relatedEntity && relatedEntity.entityType === 'Case') {
      await logActivity({
        type: 'reminder_created',
        description: `Reminder created: ${title}`,
        user: userId,
        case: relatedEntity.entityId
      });
    }

    return res.status(201).json({
      success: true,
      message: "Reminder created successfully",
      reminder
    });

  } catch (error) {
    console.error("Create reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating reminder",
      error: error.message
    });
  }
};

// ==================== GET REMINDERS ====================
export const getReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, status, type } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      type
    };

    const result = await Reminder.getUserReminders(userId, options);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Get reminders error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving reminders",
      error: error.message
    });
  }
};

// ==================== GET REMINDER BY ID ====================
export const getReminderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findById(id)
      .populate('createdBy', 'name email role')
      .populate('recipients.user', 'name email role');

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    // Check if user can view this reminder
    if (!reminder.canEdit(userId) && !reminder.isRecipient(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this reminder"
      });
    }

    return res.status(200).json({
      success: true,
      reminder
    });

  } catch (error) {
    console.error("Get reminder by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving reminder",
      error: error.message
    });
  }
};

// ==================== UPDATE REMINDER ====================
export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    // Check if user can edit
    if (!reminder.canEdit(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the creator can update this reminder"
      });
    }

    // Cannot update sent or cancelled reminders
    if (reminder.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: "Cannot update reminder that is not scheduled"
      });
    }

    // Validate reminder date if being updated
    if (updates.reminderDate && new Date(updates.reminderDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reminder date must be in the future"
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title',
      'message',
      'reminderDate',
      'eventDate',
      'recipients',
      'priority',
      'notificationChannels',
      'actionUrl',
      'actionText',
      'metadata'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        reminder[field] = updates[field];
      }
    });

    await reminder.save();

    return res.status(200).json({
      success: true,
      message: "Reminder updated successfully",
      reminder
    });

  } catch (error) {
    console.error("Update reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating reminder",
      error: error.message
    });
  }
};

// ==================== CANCEL REMINDER ====================
export const cancelReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    // Check if user can cancel
    if (!reminder.canEdit(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only the creator can cancel this reminder"
      });
    }

    await reminder.cancel();

    // Log activity
    if (reminder.relatedEntity && reminder.relatedEntity.entityType === 'Case') {
      await logActivity({
        type: 'reminder_cancelled',
        description: `Reminder cancelled: ${reminder.title}`,
        user: userId,
        case: reminder.relatedEntity.entityId
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reminder cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error cancelling reminder",
      error: error.message
    });
  }
};

// ==================== SNOOZE REMINDER ====================
export const snoozeReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { duration = 60 } = req.body; // duration in minutes

    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    // Check if user is a recipient
    if (!reminder.isRecipient(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only recipients can snooze this reminder"
      });
    }

    await reminder.snooze(userId, duration);

    return res.status(200).json({
      success: true,
      message: `Reminder snoozed for ${duration} minutes`,
      reminder
    });

  } catch (error) {
    console.error("Snooze reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error snoozing reminder",
      error: error.message
    });
  }
};

// ==================== DISMISS REMINDER ====================
export const dismissReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    // Check if user is a recipient
    if (!reminder.isRecipient(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only recipients can dismiss this reminder"
      });
    }

    await reminder.dismiss(userId);

    return res.status(200).json({
      success: true,
      message: "Reminder dismissed successfully"
    });

  } catch (error) {
    console.error("Dismiss reminder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error dismissing reminder",
      error: error.message
    });
  }
};

// ==================== GET UPCOMING REMINDERS ====================
export const getUpcomingReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const reminders = await Reminder.getUpcoming(userId, parseInt(days));

    return res.status(200).json({
      success: true,
      count: reminders.length,
      days: parseInt(days),
      reminders
    });

  } catch (error) {
    console.error("Get upcoming reminders error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving upcoming reminders",
      error: error.message
    });
  }
};

// ==================== GET CASE REMINDERS ====================
export const getCaseReminders = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const { page, limit, status } = req.query;

    // Verify case access
    const caseDoc = await Case.findById(caseId);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check if user has access to this case
    const hasAccess = 
      caseDoc.client.toString() === userId ||
      caseDoc.advocate.toString() === userId ||
      caseDoc.paralegals.some(p => p.toString() === userId) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status
    };

    const result = await Reminder.getCaseReminders(caseId, options);

    return res.status(200).json({
      success: true,
      caseId,
      ...result
    });

  } catch (error) {
    console.error("Get case reminders error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving case reminders",
      error: error.message
    });
  }
};

// ==================== DELETE OLD REMINDERS (ADMIN) ====================
export const deleteOldReminders = async (req, res) => {
  try {
    // Only admin can run cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can run cleanup"
      });
    }

    const { days } = req.query;
    const daysToKeep = parseInt(days) || 90;

    const count = await Reminder.deleteOld(daysToKeep);

    return res.status(200).json({
      success: true,
      message: `Deleted reminders older than ${daysToKeep} days`,
      count
    });

  } catch (error) {
    console.error("Delete old reminders error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting old reminders",
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTION: SEND REMINDER ====================
// This function is called by the scheduler
export const sendReminderNotifications = async (reminder) => {
  try {
    // Create notification for each recipient
    for (const recipient of reminder.recipients) {
      if (recipient.status === 'pending') {
        await createNotification({
          userId: recipient.user,
          type: reminder.type,
          title: reminder.title,
          message: reminder.message,
          relatedEntity: reminder.relatedEntity,
          actionUrl: reminder.actionUrl,
          priority: reminder.priority
        });
      }
    }

    // Mark reminder as sent
    await reminder.send();

    // Log activity if related to case
    if (reminder.relatedEntity && reminder.relatedEntity.entityType === 'Case') {
      await logActivity({
        type: 'reminder_sent',
        description: `Reminder sent: ${reminder.title}`,
        user: reminder.createdBy,
        case: reminder.relatedEntity.entityId
      });
    }

    return true;
  } catch (error) {
    console.error("Send reminder notifications error:", error);
    
    // Mark as failed
    reminder.status = 'failed';
    await reminder.save();
    
    return false;
  }
}; 
