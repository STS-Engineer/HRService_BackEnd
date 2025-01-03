const express = require("express");
const router = express.Router();
const {
  handleCreateDocumentRequest,
  handleGetDocumentRequestsByEmployee,
  handleGetAllDocumentRequests,
  handleDocumentRequestById,
  uploadDocumentController,
  getDocumentRequestsForHRManagerController,
  fetchDocumentRequests,
  handleDeleteDocumentRequest,
  uploadDocumentForRequestController,
  handleDownloadDocument,
  upload,
} = require("../controllers/docRequestsController");
const { authenticate } = require("../middleware/authenticateToken");

// Create a new document request
router.post("/", authenticate, handleCreateDocumentRequest);

// Get all document requests for the logged-in user (e.g., manager)
router.get("/my-requests", authenticate, fetchDocumentRequests);

// Get all document requests (for admin or HR)
router.get("/all", authenticate, handleGetAllDocumentRequests);

router.get(
  "/hr-manager-requests",
  authenticate,
  getDocumentRequestsForHRManagerController
);

// Download a document by file name
router.get("/download/:fileName", authenticate, handleDownloadDocument);

// Upload a document for a request by ID
router.post(
  "/upload/:id",
  authenticate,
  upload.single("documentFilet"),
  uploadDocumentForRequestController
);

// Get document requests by employee ID
router.get(
  "/employee/:employee_id",
  authenticate,
  handleGetDocumentRequestsByEmployee
);

// Get a document request by document request ID
router.get("/:id", authenticate, handleDocumentRequestById);

// Delete a document request by ID
router.delete("/:id", authenticate, handleDeleteDocumentRequest);

router.post("/upload", authenticate, uploadDocumentController);

module.exports = router;
