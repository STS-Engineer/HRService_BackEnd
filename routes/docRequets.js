const express = require("express");
const router = express.Router();
const {
  handleCreateDocumentRequest,
  handleGetDocumentRequestsByEmployee,
  handleGetAllDocumentRequests,
  handleDocumentRequestById,
  handleUploadDocument,
  handleDeleteDocumentRequest,
  handleDownloadDocument,
} = require("../controllers/docRequestsController");
const { authenticate } = require("../middleware/authenticateToken");

// Create a new document request
router.post("/", handleCreateDocumentRequest);

// Get all document requests (for managers)
router.get("/", handleGetAllDocumentRequests);

// Get document requests by employee ID
router.get("/employee/:employee_id", handleGetDocumentRequestsByEmployee);

// Get a document request by ID
router.get("/:id", handleDocumentRequestById);

// Upload a document for a request
router.post("/upload/:id", handleUploadDocument);

// Delete a document request
router.delete("/:id", handleDeleteDocumentRequest);

// Download a document
router.get("/download/:fileName", handleDownloadDocument);

module.exports = router;
