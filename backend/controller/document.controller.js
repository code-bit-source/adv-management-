import Document from "../model/document.model.js";
import Case from "../model/case.model.js";
import Note from "../model/note.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== UPLOAD DOCUMENT ====================
export const uploadDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      name,
      description,
      category,
      subCategory,
      caseId,
      noteId,
      timelineEventId,
      tags,
      confidential,
      expiryDate,
      notes
    } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Validate required fields
    if (!name || !category) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Document name and category are required"
      });
    }

    // If document is related to a case, verify access
    if (caseId) {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: "Case not found"
        });
      }

      // Check if user has access to the case
      if (!caseData.hasAccess(userId, userRole)) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          success: false,
          message: "You don't have access to this case"
        });
      }
    }

    // If document is related to a note, verify ownership
    if (noteId) {
      const note = await Note.findById(noteId);
      if (!note) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: "Note not found"
        });
      }

      if (note.user.toString() !== userId && userRole !== 'admin') {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          success: false,
          message: "You don't have access to this note"
        });
      }
    }

    // Create file URL
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Create document
    const document = await Document.create({
      name,
      description,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      category,
      subCategory,
      case: caseId || null,
      note: noteId || null,
      timelineEvent: timelineEventId || null,
      uploadedBy: userId,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      confidential: confidential === 'true' || confidential === true,
      expiryDate: expiryDate || null,
      notes
    });

    // Populate uploader details
    await document.populate('uploadedBy', 'name email role');

    // Update case document count if applicable
    if (caseId) {
      await Case.findByIdAndUpdate(caseId, {
        $inc: { totalDocuments: 1 }
      });
    }

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      document
    });

  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError);
      }
    }
    
    console.error("Upload document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message
    });
  }
};

// ==================== GET DOCUMENTS ====================
export const getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      caseId,
      noteId,
      category,
      status,
      confidential,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = { isDeleted: false };

    // Filter by case
    if (caseId) {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          message: "Case not found"
        });
      }

      // Check case access
      if (!caseData.hasAccess(userId, userRole)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this case"
        });
      }

      query.case = caseId;
    }

    // Filter by note
    if (noteId) {
      query.note = noteId;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by confidential
    if (confidential !== undefined) {
      query.confidential = confidential === 'true';
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } }
      ];
    }

    // If not admin, filter by access permissions
    if (userRole !== 'admin' && !caseId) {
      query.$or = [
        { uploadedBy: userId },
        { 'accessPermissions.isPublic': true },
        { 'accessPermissions.allowedRoles': userRole },
        { 'accessPermissions.allowedUsers.user': userId }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email role')
      .populate('case', 'title caseNumber')
      .populate('lastDownloadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Document.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: documents.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      documents
    });

  } catch (error) {
    console.error("Get documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get documents",
      error: error.message
    });
  }
};

// ==================== GET DOCUMENT BY ID ====================
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const document = await Document.findById(id)
      .populate('uploadedBy', 'name email role phone')
      .populate('case', 'title caseNumber status')
      .populate('note', 'title')
      .populate('lastDownloadedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check if document is deleted
    if (document.isDeleted && userRole !== 'admin') {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check access
    const hasAccess = document.hasAccess(userId, userRole);
    
    if (hasAccess === 'check_case_access' && document.case) {
      const caseData = await Case.findById(document.case);
      if (!caseData || !caseData.hasAccess(userId, userRole)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this document"
        });
      }
    } else if (hasAccess === false) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this document"
      });
    }

    return res.status(200).json({
      success: true,
      document
    });

  } catch (error) {
    console.error("Get document by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get document",
      error: error.message
    });
  }
};

// ==================== DOWNLOAD DOCUMENT ====================
export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const document = await Document.findById(id);

    if (!document || document.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check access
    const hasAccess = document.hasAccess(userId, userRole);
    
    if (hasAccess === 'check_case_access' && document.case) {
      const caseData = await Case.findById(document.case);
      if (!caseData || !caseData.hasAccess(userId, userRole)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this document"
        });
      }
    } else if (hasAccess === false) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this document"
      });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server"
      });
    }

    // Record download
    await document.recordDownload(userId);

    // Send file
    res.download(document.filePath, document.originalName, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to download document"
        });
      }
    });

  } catch (error) {
    console.error("Download document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download document",
      error: error.message
    });
  }
};

// ==================== UPDATE DOCUMENT ====================
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      name,
      description,
      category,
      subCategory,
      tags,
      confidential,
      expiryDate,
      status,
      notes
    } = req.body;

    const document = await Document.findById(id);

    if (!document || document.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check edit permission
    if (!document.canEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to edit this document"
      });
    }

    // Update fields
    if (name) document.name = name;
    if (description !== undefined) document.description = description;
    if (category) document.category = category;
    if (subCategory !== undefined) document.subCategory = subCategory;
    if (tags) document.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (confidential !== undefined) document.confidential = confidential;
    if (expiryDate !== undefined) document.expiryDate = expiryDate;
    if (status) document.status = status;
    if (notes !== undefined) document.notes = notes;

    await document.save();
    await document.populate('uploadedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: "Document updated successfully",
      document
    });

  } catch (error) {
    console.error("Update document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update document",
      error: error.message
    });
  }
};

// ==================== DELETE DOCUMENT ====================
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { permanent } = req.query;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check delete permission
    if (!document.canDelete(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this document"
      });
    }

    // Permanent delete (admin only)
    if (permanent === 'true' && userRole === 'admin') {
      // Delete physical file
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

      // Update case document count
      if (document.case) {
        await Case.findByIdAndUpdate(document.case, {
          $inc: { totalDocuments: -1 }
        });
      }

      await Document.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Document permanently deleted"
      });
    }

    // Soft delete
    await document.softDelete(userId);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      document
    });

  } catch (error) {
    console.error("Delete document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message
    });
  }
};

// ==================== RESTORE DOCUMENT ====================
export const restoreDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Only admin can restore
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can restore documents"
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    if (!document.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Document is not deleted"
      });
    }

    await document.restore();
    await document.populate('uploadedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: "Document restored successfully",
      document
    });

  } catch (error) {
    console.error("Restore document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to restore document",
      error: error.message
    });
  }
};

// ==================== UPDATE ACCESS PERMISSIONS ====================
export const updateAccessPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { isPublic, allowedUsers, allowedRoles } = req.body;

    const document = await Document.findById(id);

    if (!document || document.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check edit permission
    if (!document.canEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify access permissions"
      });
    }

    // Update permissions
    if (isPublic !== undefined) {
      document.accessPermissions.isPublic = isPublic;
    }

    if (allowedUsers) {
      document.accessPermissions.allowedUsers = allowedUsers;
    }

    if (allowedRoles) {
      document.accessPermissions.allowedRoles = allowedRoles;
    }

    await document.save();
    await document.populate('uploadedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: "Access permissions updated successfully",
      document
    });

  } catch (error) {
    console.error("Update access permissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update access permissions",
      error: error.message
    });
  }
};

// ==================== GET DOCUMENT STATISTICS ====================
export const getDocumentStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { caseId } = req.query;

    let query = { isDeleted: false };

    // Filter by case if provided
    if (caseId) {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          message: "Case not found"
        });
      }

      if (!caseData.hasAccess(userId, userRole)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this case"
        });
      }

      query.case = caseId;
    } else if (userRole !== 'admin') {
      // Filter by user access
      query.$or = [
        { uploadedBy: userId },
        { 'accessPermissions.isPublic': true },
        { 'accessPermissions.allowedRoles': userRole },
        { 'accessPermissions.allowedUsers.user': userId }
      ];
    }

    const stats = {
      total: await Document.countDocuments(query),
      byCategory: {},
      byStatus: {},
      totalSize: 0,
      totalDownloads: 0,
      confidential: await Document.countDocuments({ ...query, confidential: true })
    };

    // Category breakdown
    const categories = await Document.aggregate([
      { $match: query },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    
    categories.forEach(cat => {
      stats.byCategory[cat._id] = cat.count;
    });

    // Status breakdown
    const statuses = await Document.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    statuses.forEach(status => {
      stats.byStatus[status._id] = status.count;
    });

    // Total size and downloads
    const sizeAndDownloads = await Document.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSize: { $sum: "$fileSize" },
          totalDownloads: { $sum: "$downloadCount" }
        }
      }
    ]);

    if (sizeAndDownloads.length > 0) {
      stats.totalSize = sizeAndDownloads[0].totalSize;
      stats.totalDownloads = sizeAndDownloads[0].totalDownloads;
      stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
    }

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("Get document stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get document statistics",
      error: error.message
    });
  }
};
