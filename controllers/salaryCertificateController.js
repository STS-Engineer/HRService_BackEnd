const SalaryCertificate = require("../models/salaryCertificateModel"); // Your model file
const { sendEmailNotification } = require("../services/emailService"); // Import your email service
const pool = require("../config/database");

const createSalaryCertificate = async (req, res) => {
  const files = req.files; // Get the uploaded files from the request

  // Check if files are provided
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    const results = []; // Store results of all operations
    for (const file of files) {
      const userId = file.originalname.split("-")[1].split(".")[0]; // Extract userId from the filename (e.g., MAT-1.pdf -> 1)

      const fileName = file.originalname; // Keep the original file name
      const mimeType = file.mimetype;
      const fileData = file.buffer;

      // Store the certificate in the database
      const certificate = await SalaryCertificate.create(
        userId,
        fileName,
        fileData,
        mimeType
      );
      results.push(certificate); // Add the result to the array

      // Prepare the email details
      const subject = "Your Salary Certificate";
      const message = "Please find attached your salary certificate.";
      const attachments = [
        { filename: fileName, content: fileData, contentType: mimeType },
      ];

      // Send the email notification with the certificate attached
      await sendEmailNotification(userId, subject, message, attachments);
    }

    res
      .status(201)
      .json({ message: "Salary certificates created successfully", results });
  } catch (error) {
    console.error("Error creating salary certificates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createSalaryCertificate,
};
