const {
  createDocumentRequest,
  getDocumentRequestsByEmployee,
  getAllDocumentRequests,
  getDocumentRequestById,
  uploadDocumentForRequest,
  deleteDocumentRequest,
  getDocumentFilePath,
  getDocumentRequestsForHRManager,
} = require("../models/DocumentsRequest");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendEmailNotification } = require("../services/emailService");

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Handle creating a document request
const handleCreateDocumentRequest = async (req, res) => {
  const { employee_id, document_type } = req.body;

  try {
    // Validate inputs
    if (!employee_id || !document_type) {
      return res
        .status(400)
        .json({ error: "Employee ID and Document Type are required" });
    }

    // Create the document request
    const request = await createDocumentRequest({ employee_id, document_type });

    // Send email notification to the assigned HR Manager
    if (request.hr_manager_id) {
      await sendEmailNotification(
        request.hr_manager_id,
        "New Document Request",
        `A new document request for ${document_type} has been submitted by employee ID ${employee_id}. Please review the request.`
      );
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get document request by ID
const handleDocumentRequestById = async (req, res) => {
  const id = req.params.id;
  try {
    const documentRequest = await getDocumentRequestById(id);
    res.status(200).json(documentRequest);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// Get document requests by employee
const handleGetDocumentRequestsByEmployee = async (req, res) => {
  const { employee_id } = req.params;
  try {
    const requests = await getDocumentRequestsByEmployee(employee_id);
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all document requests
const handleGetAllDocumentRequests = async (req, res) => {
  try {
    const requests = await getAllDocumentRequests();
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get document requests for HR Manager
const getDocumentRequestsForHRManagerController = async (req, res) => {
  // Assuming the HR Manager ID is available in the request's user object
  const hr_manager_id = req.user.id; // Modify this if your user object structure is different

  try {
    const documentRequests = await getDocumentRequestsForHRManager(
      hr_manager_id
    );
    return res.status(200).json({ success: true, data: documentRequests });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Handle deleting a document request
const handleDeleteDocumentRequest = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedRequest = await deleteDocumentRequest(id);
    res.status(200).json({
      message: "Document request deleted successfully",
      data: deletedRequest,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Handle downloading a document
const handleDownloadDocument = (req, res) => {
  const { fileName } = req.params;
  const filePath = getDocumentFilePath(fileName);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
};

// Function to handle document upload for HR Manager
const uploadDocumentController = async (req, res) => {
  const { request_id, file } = req.body; // Assuming file is sent in the body (could also be sent as multipart/form-data)

  try {
    // Get the document request by ID
    const request = await pool.query(
      "SELECT * FROM document_requests WHERE id = $1",
      [request_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: "Document request not found" });
    }

    const documentRequest = request.rows[0];

    // Check if the current approver is the HR Manager
    if (documentRequest.hr_manager_id !== req.user.id) {
      // Assuming the HR Manager is logged in and their ID is available in req.user.id
      return res
        .status(403)
        .json({ error: "You are not authorized to upload this document" });
    }

    // Save the document (upload logic)
    const fileName = file.filename; // Assuming the file is already handled by some middleware like multer
    const status = "Completed"; // You can set the status to Completed when the document is uploaded

    // Update the document request with the uploaded file
    const updateRes = await pool.query(
      "UPDATE document_requests SET file_path = $1, status = $2 WHERE id = $3 RETURNING *",
      [fileName, status, request_id]
    );

    // Return the updated document request
    return res.status(200).json(updateRes.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Upload document for request
const uploadDocumentForRequestController = async (req, res) => {
  console.log("Uploaded File", req.file);
  console.log("Request Body ", req.body);
  const { documentRequestId } = req.params;
  const file_path = req.file.path;
  const hr_manager_id = req.user.id;

  try {
    const updatedRequest = await uploadDocumentForRequest(
      documentRequestId,
      file_path,
      hr_manager_id
    );
    return res.status(200).json({
      success: true,
      data: updatedRequest,
      message: "Document uploaded successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Fetch document requests for the logged-in user
const fetchDocumentRequests = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    const approverId = req.user.id;
    const documentRequests = await getDocumentRequests(approverId);
    res.status(200).json(documentRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  handleCreateDocumentRequest,
  handleGetDocumentRequestsByEmployee,
  handleGetAllDocumentRequests,
  uploadDocumentController,
  handleDocumentRequestById,
  getDocumentRequestsForHRManagerController,
  fetchDocumentRequests,
  handleDeleteDocumentRequest,
  uploadDocumentForRequestController,
  handleDownloadDocument,
  upload,
};
