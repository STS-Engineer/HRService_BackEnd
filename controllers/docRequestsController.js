const {
  createDocumentRequest,
  getDocumentRequestsByEmployee,
  getAllDocumentRequests,
  getDocumentRequests,
  getDocumentRequestById,
  uploadDocument,
  deleteDocumentRequest,
  getDocumentFilePath,
} = require("../models/DocumentsRequest");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendEmailNotification } = require("../services/emailService");
const { getEmployeeById } = require("./UserController");

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
    if (!documentRequest) {
      res.status(404).json({ error: "Document request not found" });
      return;
    }
    res.status(200).json(documentRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleGetDocumentRequestsByEmployee = async (req, res) => {
  const { employee_id } = req.params;
  try {
    const requests = await getDocumentRequestsByEmployee(employee_id);
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleGetAllDocumentRequests = async (req, res) => {
  try {
    const requests = await getAllDocumentRequests();
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleUploadDocument = [
  upload.single("documentFile"),
  async (req, res) => {
    const { id } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      const request = await uploadDocument(id, file.filename);
      res.status(200).json(request);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

// Handle deleting a document request
const handleDeleteDocumentRequest = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedRequest = await deleteDocumentRequest(id);
    if (!deletedRequest) {
      return res.status(404).json({ error: "Document request not found" });
    }
    res.status(200).json({ message: "Document request deleted successfully" });
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

module.exports = {
  handleCreateDocumentRequest,
  handleGetDocumentRequestsByEmployee,
  handleGetAllDocumentRequests,
  handleDocumentRequestById,
  handleUploadDocument,
  handleDeleteDocumentRequest,
  handleDownloadDocument,
};
