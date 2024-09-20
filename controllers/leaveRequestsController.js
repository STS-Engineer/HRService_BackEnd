const {
  createLeaveRequest,
  getLeaveRequests,
  getAllLeaveRequests,
  getLeaveRequestById,
  getLeaveRequestsByEmployeeId,
  updateLeaveRequest,
  deleteLeaveRequest,
} = require("../models/LeaveRequest");
const {} = require("../models/UserModel");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { sendEmailNotification } = require("../services/emailService");
const { getEmployeeById } = require("./UserController");

// Ensure the upload directory exists
const uploadPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); // Correct path
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Create a new leave request with file upload
const addLeaveRequest = [
  upload.single("justificationFile"),
  async (req, res) => {
    try {
      const data = req.body;
      console.log(" Uploaded file details (req.file):", req.file);
      if (req.file) {
        data.justificationFile = req.file.filename;
      }

      const employee = await getEmployeeById(data.employeeId);
      console.log(employee, "\n the employee information .");
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      const newLeaveRequest = await createLeaveRequest(data);

      // Notify the first approver
      const firstApproverId = newLeaveRequest.current_approver_id;
      if (firstApproverId) {
        await sendEmailNotification(
          firstApproverId,
          "Leave Request Approval Needed",
          `A new leave request has been submitted by ${employee.firstname} ${employee.lastname}. Please review the request.`
        );
      }
      res.status(201).json(newLeaveRequest);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];
// Get all leave requests
const fetchLeaveRequests = async (req, res) => {
  try {
    const approverId = req.user.id;
    const leaveRequests = await getLeaveRequests(approverId);
    res.status(200).json(leaveRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const fetchAllLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await getAllLeaveRequests();
    res.status(200).json(leaveRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get leave request by ID
const fetchLeaveRequestById = async (req, res) => {
  const id = req.params.id;

  try {
    const leaveRequest = await getLeaveRequestById(id);
    if (!leaveRequest) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    res.status(200).json(leaveRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Get leave requests by employee ID
const fetchLeaveRequestsByEmployeeId = async (req, res) => {
  const employeeId = req.params.employeeId;
  try {
    const leaveRequests = await getLeaveRequestsByEmployeeId(employeeId);
    res.status(200).json(leaveRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateLeaveRequestStatus = async (req, res) => {
  const id = parseInt(req.params.id); // Leave request ID
  const { status } = req.body; // Approval status (Approved or Rejected)
  const { role, id: userId } = req.user;

  console.log("Current user ID:", userId);
  console.log("Current user role:", role);

  try {
    // Fetch the leave request by ID
    const leaveRequest = await getLeaveRequestById(id);
    if (!leaveRequest) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    console.log("Leave request details:", leaveRequest);

    // For Manager role
    if (role === "MANAGER" && leaveRequest.employee_id !== userId) {
      // This part handles when a Manager is reviewing someone else's leave request
      if (leaveRequest.manager_approval_status === "Pending") {
        leaveRequest.manager_approval_status = status;

        if (status === "Approved") {
          leaveRequest.plant_manager_approval_status = "Pending";
          leaveRequest.status = "Under Plant Manager Review"; // Update status for overall process

          // Notify Plant Manager
          await sendEmailNotification(
            leaveRequest.next_approver_id,
            "Leave Request Approval Needed",
            "A leave request from  has been approved by the Manager and is awaiting your approval."
          );
        } else {
          // If rejected by Manager, update status to Refused
          leaveRequest.status = "Rejected";
          await sendEmailNotification(
            leaveRequest.employee_id,
            "Leave Request Rejected",
            "Your leave request has been rejected by the Manager."
          );
        }
      }
    }
    // When the Manager applies for a leave request (Manager is the employee)
    else if (role === "MANAGER" && leaveRequest.employee_id === userId) {
      // Automatically move to Plant Manager review when a Manager applies

      leaveRequest.manager_approval_status = "Approved";
      leaveRequest.plant_manager_approval_status = "Pending";
      leaveRequest.status = "Under Plant Manager Review"; // Update status

      // Notify Plant Manager
      await sendEmailNotification(
        leaveRequest.next_approver_id,
        "Leave Request Approval Needed",
        "A leave request from the Manager is awaiting your approval."
      );
    }

    // For Plant Manager role
    else if (role === "PLANT_MANAGER") {
      if (
        leaveRequest.manager_approval_status === "Approved" &&
        leaveRequest.plant_manager_approval_status === "Pending"
      ) {
        leaveRequest.plant_manager_approval_status = status;

        if (status === "Approved") {
          // If approved by Plant Manager, finalize status to Approved
          leaveRequest.status = "Approved";
          leaveRequest.current_approver_id = null;
          await sendEmailNotification(
            leaveRequest.employee_id,
            "Leave Request Approved",
            "Your leave request has been approved by the Plant Manager."
          );
        } else {
          // If rejected by Plant Manager, update status to Refused
          leaveRequest.status = "Rejected";
          await sendEmailNotification(
            leaveRequest.employee_id,
            "Leave Request Rejected",
            "Your leave request has been rejected by the Plant Manager."
          );
        }
      } else if (
        leaveRequest.manager_approval_status === "Pending" &&
        leaveRequest.plant_manager_approval_status === "Pending"
      ) {
        leaveRequest.plant_manager_approval_status = status;

        if (status === "Approved") {
          // If approved by Plant Manager, finalize status to Approved
          leaveRequest.status = "Approved";
          leaveRequest.current_approver_id = null;
          await sendEmailNotification(
            leaveRequest.employee_id,
            "Leave Request Approved",
            "Your leave request has been approved by the Plant Manager."
          );
        } else {
          // If rejected by Plant Manager, update status to Refused
          leaveRequest.status = "Rejected";
          await sendEmailNotification(
            leaveRequest.employee_id,
            "Leave Request Rejected",
            "Your leave request has been rejected by the Plant Manager."
          );
        }
      }
    }
    // For CEO role
    else if (role === "CEO") {
      if (
        leaveRequest.manager_approval_status === "Pending" &&
        leaveRequest.plant_manager_approval_status === "Pending" &&
        leaveRequest.ceo_approval_status === "Pending"
      ) {
        leaveRequest.ceo_approval_status = status;

        if (status === "Approved") {
          // If approved by CEO, finalize status to Approved
          leaveRequest.status = "Approved";
          leaveRequest.current_approver_id = null;
          await sendEmailNotification(
            leaveRequest.employee_id,
            "Leave Request Approved",
            "Your leave request has been approved by the CEO."
          );
        } else {
          // If rejected by CEO, update status to Refused
          leaveRequest.status = "Rejected";
          await sendEmailNotification(
            leaveRequest.employee_id,
            "Leave Request Rejected",
            "Your leave request has been rejected by the CEO."
          );
        }
      }
    }
    // Update the leave request with new status
    const updatedLeaveRequest = await updateLeaveRequest(id, leaveRequest);
    res.status(200).json(updatedLeaveRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeLeaveRequest = async (req, res) => {
  const id = req.params.id;

  try {
    const deletedLeaveRequest = await deleteLeaveRequest(id);
    res.status(200).json(deletedLeaveRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Function to handle file download
const downloadJustificationFile = (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "..", "uploads", fileName);
  console.log("Attempting to download file:", filePath);
  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("Error downloading file");
    } else {
      console.log("File downloaded successfully:", fileName);
    }
  });
};

module.exports = {
  addLeaveRequest,
  fetchLeaveRequests,
  fetchAllLeaveRequests,
  fetchLeaveRequestById,
  fetchLeaveRequestsByEmployeeId,
  updateLeaveRequestStatus,
  removeLeaveRequest,
  downloadJustificationFile,
};
