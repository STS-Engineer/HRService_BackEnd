const express = require("express");
const multer = require("multer"); // For handling file uploads
const {
  createSalaryCertificate,
} = require("../controllers/salaryCertificateController");
const router = express.Router();

// Change upload configuration to accept multiple files
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage for the uploaded files

// Route to create salary certificates (for multiple files)
router.post("/", upload.array("certificates"), createSalaryCertificate);

module.exports = router;
