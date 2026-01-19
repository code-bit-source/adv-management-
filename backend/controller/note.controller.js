import Note from "../model/note.model.js";
import fs from "fs";
import path from "path";

// ==================== CREATE NOTE ====================
export const createNote = async (req, res) => {
  try {
    const { title, content, category, priority, tags } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    // Create note
    const note = await Note.create({
      title,
      content,
      user: userId,
      category: category || "personal",
      priority: priority || "medium",
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
    });

    // Populate user details
    await note.populate("user", "name email role");

    return res.status(201).json({
      success: true,
      message: "Note created successfully",
      note,
    });
  } catch (error) {
    console.error("Create note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create note",
      error: error.message,
    });
  }
};

// ==================== GET MY NOTES ====================
export const getMyNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, priority, search } = req.query;

    // Build query
    const query = { user: userId };

    // Add filters if provided
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    // Search in title and content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Get notes with sorting (newest first)
    const notes = await Note.find(query)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Get notes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
      error: error.message,
    });
  }
};

// ==================== GET ALL NOTES (ADMIN ONLY) ====================
export const getAllNotes = async (req, res) => {
  try {
    const { status, category, priority, search, userId } = req.query;

    // Build query
    const query = {};

    // Add filters if provided
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (userId) query.user = userId;

    // Search in title and content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Get all notes with sorting (newest first)
    const notes = await Note.find(query)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Get all notes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
      error: error.message,
    });
  }
};

// ==================== GET NOTE BY ID ====================
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find note
    const note = await Note.findById(id).populate("user", "name email role");

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership (only owner or admin can view)
    if (!note.isOwnedBy(userId) && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own notes.",
      });
    }

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    console.error("Get note by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch note",
      error: error.message,
    });
  }
};

// ==================== UPDATE NOTE ====================
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, content, category, priority, tags, status } = req.body;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership (only owner can update)
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own notes.",
      });
    }

    // Update fields
    if (title) note.title = title;
    if (content) note.content = content;
    if (category) note.category = category;
    if (priority) note.priority = priority;
    if (tags) note.tags = Array.isArray(tags) ? tags : [tags];
    if (status) note.status = status;

    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Update note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update note",
      error: error.message,
    });
  }
};

// ==================== DELETE NOTE ====================
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership (only owner can delete)
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own notes.",
      });
    }

    // Delete associated files
    if (note.attachments && note.attachments.length > 0) {
      note.attachments.forEach((attachment) => {
        const filePath = path.join(process.cwd(), attachment.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Delete note
    await Note.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete note",
      error: error.message,
    });
  }
};

// ==================== ARCHIVE NOTE ====================
export const archiveNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only archive your own notes.",
      });
    }

    // Toggle archive status
    note.status = note.status === "archived" ? "active" : "archived";
    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: `Note ${note.status === "archived" ? "archived" : "unarchived"} successfully`,
      note,
    });
  } catch (error) {
    console.error("Archive note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to archive note",
      error: error.message,
    });
  }
};

// ==================== UPLOAD ATTACHMENT ====================
export const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      // Delete uploaded file if note not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership
    if (!note.isOwnedBy(userId)) {
      // Delete uploaded file if not owner
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only add attachments to your own notes.",
      });
    }

    // Check attachment limit
    if (note.attachments.length >= 10) {
      // Delete uploaded file if limit reached
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Maximum 10 attachments allowed per note",
      });
    }

    // Add attachment to note
    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    };

    note.attachments.push(attachment);
    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: "Attachment uploaded successfully",
      note,
      attachment,
    });
  } catch (error) {
    console.error("Upload attachment error:", error);
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      success: false,
      message: "Failed to upload attachment",
      error: error.message,
    });
  }
};

// ==================== DELETE ATTACHMENT ====================
export const deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.id;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete attachments from your own notes.",
      });
    }

    // Find attachment
    const attachment = note.attachments.id(attachmentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), attachment.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove attachment from note
    note.attachments.pull(attachmentId);
    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
      note,
    });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete attachment",
      error: error.message,
    });
  }
};

// ==================== DOWNLOAD ATTACHMENT ====================
export const downloadAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership (only owner or admin can download)
    if (!note.isOwnedBy(userId) && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only download attachments from your own notes.",
      });
    }

    // Find attachment
    const attachment = note.attachments.id(attachmentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    // Check if file exists
    const filePath = path.join(process.cwd(), attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    // Send file
    res.download(filePath, attachment.originalName);
  } catch (error) {
    console.error("Download attachment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download attachment",
      error: error.message,
    });
  }
};

// ==================== ADD CHECKLIST ITEM ====================
export const addChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { text, priority, dueDate } = req.body;

    // Validate input
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Checklist item text is required",
      });
    }

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only add checklist items to your own notes.",
      });
    }

    // Check checklist limit
    if (note.checklists.length >= 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 checklist items allowed per note",
      });
    }

    // Add checklist item
    const checklistItem = {
      text,
      priority: priority || "medium",
      dueDate: dueDate || null,
      isCompleted: false,
    };

    note.checklists.push(checklistItem);
    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: "Checklist item added successfully",
      note,
      checklistItem: note.checklists[note.checklists.length - 1],
    });
  } catch (error) {
    console.error("Add checklist item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add checklist item",
      error: error.message,
    });
  }
};

// ==================== UPDATE CHECKLIST ITEM ====================
export const updateChecklistItem = async (req, res) => {
  try {
    const { id, checklistId } = req.params;
    const userId = req.user.id;
    const { text, priority, dueDate, isCompleted } = req.body;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update checklist items in your own notes.",
      });
    }

    // Find checklist item
    const checklistItem = note.checklists.id(checklistId);

    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: "Checklist item not found",
      });
    }

    // Update fields
    if (text !== undefined) checklistItem.text = text;
    if (priority !== undefined) checklistItem.priority = priority;
    if (dueDate !== undefined) checklistItem.dueDate = dueDate;
    if (isCompleted !== undefined) {
      checklistItem.isCompleted = isCompleted;
      checklistItem.completedAt = isCompleted ? new Date() : null;
    }

    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: "Checklist item updated successfully",
      note,
      checklistItem,
    });
  } catch (error) {
    console.error("Update checklist item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update checklist item",
      error: error.message,
    });
  }
};

// ==================== TOGGLE CHECKLIST ITEM ====================
export const toggleChecklistItem = async (req, res) => {
  try {
    const { id, checklistId } = req.params;
    const userId = req.user.id;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only toggle checklist items in your own notes.",
      });
    }

    // Find checklist item
    const checklistItem = note.checklists.id(checklistId);

    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: "Checklist item not found",
      });
    }

    // Toggle completion status
    checklistItem.isCompleted = !checklistItem.isCompleted;
    checklistItem.completedAt = checklistItem.isCompleted ? new Date() : null;

    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: `Checklist item ${checklistItem.isCompleted ? "completed" : "uncompleted"}`,
      note,
      checklistItem,
    });
  } catch (error) {
    console.error("Toggle checklist item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle checklist item",
      error: error.message,
    });
  }
};

// ==================== DELETE CHECKLIST ITEM ====================
export const deleteChecklistItem = async (req, res) => {
  try {
    const { id, checklistId } = req.params;
    const userId = req.user.id;

    // Find note
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership
    if (!note.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete checklist items from your own notes.",
      });
    }

    // Find checklist item
    const checklistItem = note.checklists.id(checklistId);

    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: "Checklist item not found",
      });
    }

    // Remove checklist item
    note.checklists.pull(checklistId);
    await note.save();
    await note.populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: "Checklist item deleted successfully",
      note,
    });
  } catch (error) {
    console.error("Delete checklist item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete checklist item",
      error: error.message,
    });
  }
};

// ==================== GET CHECKLIST ITEMS ====================
export const getChecklistItems = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find note
    const note = await Note.findById(id).populate("user", "name email role");

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check ownership (only owner or admin can view)
    if (!note.isOwnedBy(userId) && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view checklist items from your own notes.",
      });
    }

    return res.status(200).json({
      success: true,
      checklists: note.checklists,
      totalItems: note.checklists.length,
      completedItems: note.checklists.filter(item => item.isCompleted).length,
      progress: note.checklists.length > 0 
        ? Math.round((note.checklists.filter(item => item.isCompleted).length / note.checklists.length) * 100)
        : 0,
    });
  } catch (error) {
    console.error("Get checklist items error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get checklist items",
      error: error.message,
    });
  }
};
