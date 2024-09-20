const {
  createMissionRequest,
  getMissionRequests,
  getMissionRequestById,
  getMissionRequestsByEmployeeId,
  getAllMissionRequests,
  updateMissionRequest,
  deleteMissionRequest,
} = require("../models/MissionRequest");
const {} = require("../models/UserModel");
const { sendEmailNotification } = require("../services/emailService");
const { getEmployeeById } = require("./UserController");

// Create a new mission request
const addMissionRequest = async (req, res) => {
  try {
    const data = req.body;
    const employee = await getEmployeeById(data.employeeId);
    console.log(employee, "  the employee information .");
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const newMissionRequest = await createMissionRequest(data);
    // Notify the first approver
    const firstApproverId = newMissionRequest.current_approver_id;
    if (firstApproverId) {
      await sendEmailNotification(
        firstApproverId,
        "Mission Request Approval Needed",
        `A new mission request has been submitted by ${employee.firstname} ${employee.lastname}. Please review the request.`
      );
    }
    res.status(201).json(newMissionRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all mission requests
const fetchMissionRequests = async (req, res) => {
  try {
    const approverId = req.user.id;
    const missionRequests = await getMissionRequests(approverId);
    res.status(200).json(missionRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get mission request by ID
const fetchMissionRequestById = async (req, res) => {
  const id = req.params.id;

  try {
    const missionRequest = await getMissionRequestById(id);
    if (!missionRequest) {
      res.status(404).json({ error: "Mission request not found" });
      return;
    }
    res.status(200).json(missionRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get mission requests by employee ID
const fetchMissionRequestsByEmployeeId = async (req, res) => {
  const employeeId = req.params.employeeId;

  try {
    const missionRequests = await getMissionRequestsByEmployeeId(employeeId);
    res.status(200).json(missionRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update mission request by ID
const updateMissionRequestById = async (req, res) => {
  const id = parseInt(req.params.id); // Parse id from URL parameter
  const { status } = req.body; // Extract status from request body
  const { role, id: userId } = req.user;

  console.log("Current user ID:", userId);
  console.log("Current user role:", role);

  try {
    // Fetch the mission request by ID
    const missionRequest = await getMissionRequestById(id);
    if (!missionRequest) {
      return res.status(404).json({ error: "Mission request not found" });
    }

    console.log("Mission request details:", missionRequest);

    // For Manager role
    if (role === "MANAGER" && missionRequest.employee_id !== userId) {
      // Manager is reviewing someone else's mission request
      if (missionRequest.manager_approval_status === "Pending") {
        missionRequest.manager_approval_status = status;

        if (status === "Approved") {
          missionRequest.plant_manager_approval_status = "Pending";
          missionRequest.status = "Under Plant Manager Review"; // Update status for overall process

          // Notify Plant Manager
          await sendEmailNotification(
            missionRequest.next_approver_id,
            "Mission Request Approval Needed",
            "A mission request from an employee has been approved by the Manager and is awaiting your approval."
          );
        } else {
          // If rejected by Manager, update status to Rejected
          missionRequest.status = "Rejected";
          await sendEmailNotification(
            missionRequest.employee_id,
            "Mission Request Rejected",
            "Your mission request has been rejected by the Manager."
          );
        }
      }
    }
    // When the Manager applies for a mission request
    else if (role === "MANAGER" && missionRequest.employee_id === userId) {
      // Automatically move to Plant Manager review when a Manager applies
      missionRequest.manager_approval_status = "Approved";
      missionRequest.plant_manager_approval_status = "Pending";
      missionRequest.status = "Under Plant Manager Review";

      // Notify Plant Manager
      await sendEmailNotification(
        missionRequest.next_approver_id,
        "Mission Request Approval Needed",
        "A mission request from the Manager is awaiting your approval."
      );
    }

    // For Plant Manager role
    else if (role === "PLANT_MANAGER") {
      if (
        missionRequest.manager_approval_status === "Approved" &&
        missionRequest.plant_manager_approval_status === "Pending"
      ) {
        missionRequest.plant_manager_approval_status = status;

        if (status === "Approved") {
          // If approved by Plant Manager, finalize status to Approved
          missionRequest.status = "Approved";
          missionRequest.current_approver_id = null;
          await sendEmailNotification(
            missionRequest.employee_id,
            "Mission Request Approved",
            "Your mission request has been approved by the Plant Manager."
          );
        } else {
          // If rejected by Plant Manager, update status to Rejected
          missionRequest.status = "Rejected";
          await sendEmailNotification(
            missionRequest.employee_id,
            "Mission Request Rejected",
            "Your mission request has been rejected by the Plant Manager."
          );
        }
      }
    }

    // For CEO role
    else if (role === "CEO") {
      if (
        missionRequest.manager_approval_status === "Pending" &&
        missionRequest.plant_manager_approval_status === "Pending" &&
        missionRequest.ceo_approval_status === "Pending"
      ) {
        missionRequest.ceo_approval_status = status;

        if (status === "Approved") {
          // If approved by CEO, finalize status to Approved
          missionRequest.status = "Approved";
          missionRequest.current_approver_id = null;
          await sendEmailNotification(
            missionRequest.employee_id,
            "Mission Request Approved",
            "Your mission request has been approved by the CEO."
          );
        } else {
          // If rejected by CEO, update status to Rejected
          missionRequest.status = "Rejected";
          await sendEmailNotification(
            missionRequest.employee_id,
            "Mission Request Rejected",
            "Your mission request has been rejected by the CEO."
          );
        }
      }
    }

    // Update the mission request with the new status
    const updatedMissionRequest = await updateMissionRequest(
      id,
      missionRequest
    );
    res.status(200).json(updatedMissionRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const fetchAllMissionRequests = async (req, res) => {
  try {
    const missionRequests = await getAllMissionRequests();
    res.status(200).json(missionRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete mission request by ID
const deleteMissionRequestById = async (req, res) => {
  const id = req.params.id;

  try {
    const deletedMissionRequest = await deleteMissionRequest(id);
    if (!deletedMissionRequest) {
      res.status(404).json({ error: "Mission request not found" });
      return;
    }
    res.status(200).json(deletedMissionRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addMissionRequest,
  fetchMissionRequests,
  fetchAllMissionRequests,
  fetchMissionRequestById,
  fetchMissionRequestsByEmployeeId,
  updateMissionRequestById,
  deleteMissionRequestById,
};
