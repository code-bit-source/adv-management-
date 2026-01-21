import Task from "../model/task.model.js";
import Case from "../model/case.model.js";
import User from "../model/user.model.js";
import Reminder from "../model/reminder.model.js";
import { createNotification } from "./notification.controller.js";
import { logActivity } from "./activity.controller.js";

// ==================== CREATE TASK ====================
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      caseId,
      assignedTo,
      dueDate,
      priority,
      type,
      estimatedHours,
      tags
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!title || !description || !caseId || !assignedTo || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Verify case exists and user has access
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check if user is advocate of this case
    if (caseDoc.advocate.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only the case advocate can assign tasks"
      });
    }

    // Verify assignee is a paralegal
    const paralegal = await User.findById(assignedTo);
    if (!paralegal || paralegal.role !== 'paralegal') {
      return res.status(400).json({
        success: false,
        message: "Task can only be assigned to a paralegal"
      });
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      case: caseId,
      assignedBy: userId,
      assignedTo,
      dueDate,
      priority: priority || 'normal',
      type: type || 'other',
      estimatedHours,
      tags
    });

    // Create notification for paralegal
    await createNotification({
      userId: assignedTo,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${req.user.name} assigned you a task: ${title}`,
      relatedEntity: {
        entityType: 'Task',
        entityId: task._id
      },
      actionUrl: `/tasks/${task._id}`,
      priority: priority || 'normal'
    });

    // Create reminder (1 day before due date)
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    
    if (reminderDate > new Date()) {
      try {
        await Reminder.createReminder({
          title: 'Task Deadline Reminder',
          message: `Task "${title}" is due tomorrow`,
          type: 'task_reminder',
          reminderDate,
          eventDate: dueDate,
          recipients: [assignedTo],
          createdBy: userId,
          relatedEntity: {
          entityType: 'Task',
          entityId: task._id
        },
        priority: priority || 'normal'
      });
      } catch (reminderError) {
        console.error('Failed to create task reminder:', reminderError.message);
        // Don't fail the entire task creation if reminder fails
      }
    }

    // Log activity
    await logActivity({
      type: 'task_created',
      description: `Task assigned: ${title}`,
      user: userId,
      case: caseId
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task
    });

  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating task",
      error: error.message
    });
  }
};

// ==================== GET TASKS ====================
export const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page, limit, status, priority } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      priority
    };

    let result;

    if (userRole === 'paralegal') {
      result = await Task.getParalegalTasks(userId, options);
    } else if (userRole === 'advocate') {
      result = await Task.getAdvocateTasks(userId, options);
    } else if (userRole === 'admin') {
      // Admin can see all tasks
      const skip = (options.page - 1) * options.limit;
      const query = {};
      if (status) query.status = status;
      if (priority) query.priority = priority;

      const tasks = await Task.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .populate('assignedBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .populate('case', 'caseNumber title')
        .lean();

      const total = await Task.countDocuments(query);

      result = {
        tasks,
        total,
        page: options.page,
        totalPages: Math.ceil(total / options.limit)
      };
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view tasks"
      });
    }

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving tasks",
      error: error.message
    });
  }
};

// ==================== GET TASK BY ID ====================
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findById(id)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('case', 'caseNumber title client advocate')
      .populate('comments.user', 'name email role');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if user can view this task
    if (!task.canView(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this task"
      });
    }

    return res.status(200).json({
      success: true,
      task
    });

  } catch (error) {
    console.error("Get task by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving task",
      error: error.message
    });
  }
};

// ==================== UPDATE TASK ====================
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if user can edit
    if (!task.canEdit(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only the task creator can update this task"
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title',
      'description',
      'dueDate',
      'priority',
      'type',
      'estimatedHours',
      'tags'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    await task.save();

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task
    });

  } catch (error) {
    console.error("Update task error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating task",
      error: error.message
    });
  }
};

// ==================== UPDATE TASK STATUS ====================
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if user can update status
    if (!task.canUpdateStatus(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this task status"
      });
    }

    const oldStatus = task.status;
    await task.updateStatus(status);

    // Notify advocate if task is completed
    if (status === 'completed' && task.assignedBy.toString() !== userId) {
      await createNotification({
        userId: task.assignedBy,
        type: 'task_completed',
        title: 'Task Completed',
        message: `${req.user.name} completed the task: ${task.title}`,
        relatedEntity: {
          entityType: 'Task',
          entityId: task._id
        },
        actionUrl: `/tasks/${task._id}`,
        priority: 'normal'
      });
    }

    // Log activity
    await logActivity({
      type: 'task_status_changed',
      description: `Task status changed from ${oldStatus} to ${status}: ${task.title}`,
      user: userId,
      case: task.case
    });

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      task
    });

  } catch (error) {
    console.error("Update task status error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating task status",
      error: error.message
    });
  }
};

// ==================== UPDATE TASK PROGRESS ====================
export const updateTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    const userId = req.user.id;

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be between 0 and 100"
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if user can update progress
    if (!task.canUpdateStatus(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this task progress"
      });
    }

    await task.updateProgress(progress);

    return res.status(200).json({
      success: true,
      message: "Task progress updated successfully",
      task
    });

  } catch (error) {
    console.error("Update task progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating task progress",
      error: error.message
    });
  }
};

// ==================== DELETE TASK ====================
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if user can delete
    if (!task.canEdit(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only the task creator can delete this task"
      });
    }

    await Task.findByIdAndDelete(id);

    // Log activity
    await logActivity({
      type: 'task_deleted',
      description: `Task deleted: ${task.title}`,
      user: userId,
      case: task.case
    });

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully"
    });

  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting task",
      error: error.message
    });
  }
};

// ==================== ADD COMMENT ====================
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: "Comment is required"
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if user can view this task
    if (!task.canView(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to comment on this task"
      });
    }

    await task.addComment(userId, comment);

    // Notify other party (if paralegal comments, notify advocate and vice versa)
    const notifyUserId = task.assignedBy.toString() === userId 
      ? task.assignedTo 
      : task.assignedBy;

    await createNotification({
      userId: notifyUserId,
      type: 'task_comment',
      title: 'New Task Comment',
      message: `${req.user.name} commented on task: ${task.title}`,
      relatedEntity: {
        entityType: 'Task',
        entityId: task._id
      },
      actionUrl: `/tasks/${task._id}`,
      priority: 'normal'
    });

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
      task
    });

  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding comment",
      error: error.message
    });
  }
};

// ==================== ADD ATTACHMENT ====================
export const addAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if user can view this task
    if (!task.canView(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add attachments to this task"
      });
    }

    // Add attachment
    task.attachments.push({
      name: req.file.originalname,
      url: req.file.path,
      uploadedBy: userId,
      uploadedAt: new Date()
    });

    await task.save();

    return res.status(200).json({
      success: true,
      message: "Attachment added successfully",
      task
    });

  } catch (error) {
    console.error("Add attachment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding attachment",
      error: error.message
    });
  }
};

// ==================== GET CASE TASKS ====================
export const getCaseTasks = async (req, res) => {
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

    const result = await Task.getCaseTasks(caseId, options);

    return res.status(200).json({
      success: true,
      caseId,
      ...result
    });

  } catch (error) {
    console.error("Get case tasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving case tasks",
      error: error.message
    });
  }
};

// ==================== GET TASK STATS ====================
export const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'paralegal' && userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view task statistics"
      });
    }

    const stats = await Task.getTaskStats(userId, userRole);

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("Get task stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving task statistics",
      error: error.message
    });
  }
};

// ==================== GET OVERDUE TASKS ====================
export const getOverdueTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const tasks = await Task.getOverdueTasks(userId, userRole);

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });

  } catch (error) {
    console.error("Get overdue tasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving overdue tasks",
      error: error.message
    });
  }
};
