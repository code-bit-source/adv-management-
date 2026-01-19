import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';
import { uploadSingle, validateFileUpload } from '../middleware/upload.middleware.js';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  updateDocument,
  deleteDocument,
  restoreDocument,
  updateAccessPermissions,
  getDocumentStats
} from '../controller/document.controller.js';

const documentRoute = express.Router();

// ==================== UPLOAD DOCUMENT ====================
// Any authenticated user can upload documents
documentRoute.post(
  '/upload',
  verifyToken,
  uploadSingle('document'),
  validateFileUpload,
  uploadDocument
);

// ==================== GET DOCUMENTS ====================
// Get all documents (with filters)
documentRoute.get(
  '/',
  verifyToken,
  getDocuments
);

// ==================== GET DOCUMENT STATISTICS ====================
// Get document statistics
documentRoute.get(
  '/stats',
  verifyToken,
  getDocumentStats
);

// ==================== GET DOCUMENT BY ID ====================
// Get single document details
documentRoute.get(
  '/:id',
  verifyToken,
  getDocumentById
);

// ==================== DOWNLOAD DOCUMENT ====================
// Download document file
documentRoute.get(
  '/:id/download',
  verifyToken,
  downloadDocument
);

// ==================== UPDATE DOCUMENT ====================
// Update document details
documentRoute.put(
  '/:id',
  verifyToken,
  updateDocument
);

// ==================== UPDATE ACCESS PERMISSIONS ====================
// Update document access permissions
documentRoute.put(
  '/:id/permissions',
  verifyToken,
  updateAccessPermissions
);

// ==================== DELETE DOCUMENT ====================
// Delete document (soft delete by default, permanent if admin)
documentRoute.delete(
  '/:id',
  verifyToken,
  deleteDocument
);

// ==================== RESTORE DOCUMENT ====================
// Restore deleted document (admin only)
documentRoute.put(
  '/:id/restore',
  verifyToken,
  authorizeRoles('admin'),
  restoreDocument
);

export default documentRoute;
