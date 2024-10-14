const {
  createAuthorizationRequest,
  getAuthorizationRequests,
  getAllAuthorizationRequests,
  getAuthorizationRequestById,
  getAuthorizationRequestsByEmployeeId,
  updateAuthorizationRequest,
  deleteAuthorizationRequest,
} = require("../models/AuthorizationRequest");
const {} = require("../models/UserModel");
const { sendEmailNotification } = require("../services/emailService");
const { getEmployeeById } = require("./UserController");

// Create a new authorization request
const addAuthorizationRequest = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const employee = await getEmployeeById(employeeId);
    console.log(employee, "\n the employee information .");
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const newAuthorizationRequest = await createAuthorizationRequest(req.body);
    // Notify the first approver
    const firstApproverId = newAuthorizationRequest.current_approver_id;
    if (firstApproverId) {
      await sendEmailNotification(
        firstApproverId,
        "Authorization Request Approval Needed",
        `A new authorization request has been submitted by ${employee.firstname} ${employee.lastname}. Please review the request.`
      );
    }
    res.status(201).json(newAuthorizationRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all authorization requests
const fetchAuthorizationRequests = async (req, res) => {
  try {
    const approverId = req.user.id;
    const authorizationRequests = await getAuthorizationRequests(approverId);
    res.status(200).json(authorizationRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get authorization request by ID
const fetchAuthorizationRequestById = async (req, res) => {
  const id = req.params.id;

  try {
    const authorizationRequest = await getAuthorizationRequestById(id);
    if (!authorizationRequest) {
      res.status(404).json({ error: "Authorization request not found" });
      return;
    }
    res.status(200).json(authorizationRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get authorization requests by employee ID
const fetchAuthorizationRequestsByEmployeeId = async (req, res) => {
  const employeeId = req.params.employeeId;

  try {
    const authorizationRequests = await getAuthorizationRequestsByEmployeeId(
      employeeId
    );
    res.status(200).json(authorizationRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update authorization request by ID
const updateAuthorizationRequestStatus = async (req, res) => {
  const id = parseInt(req.params.id); // Authorization request ID
  const { status } = req.body; // Approval status (Approved or Rejected)
  const { role, id: userId } = req.user;

  console.log("Current user ID:", userId);
  console.log("Current user role:", role);

  try {
    // Fetch the authorization request by ID
    const authorizationRequest = await getAuthorizationRequestById(id);
    if (!authorizationRequest) {
      return res.status(404).json({ error: "Authorization request not found" });
    }

    console.log("Authorization request details:", authorizationRequest);

    // For Manager role
    if (role === "MANAGER" && authorizationRequest.employee_id !== userId) {
      if (authorizationRequest.manager_approval_status === "Pending") {
        authorizationRequest.manager_approval_status = status;

        if (status === "Approved") {
          authorizationRequest.plant_manager_approval_status = "Pending";
          authorizationRequest.status = "Under Plant Manager Review";

          // Notify Plant Manager
          await sendEmailNotification(
            authorizationRequest.next_approver_id,
            "Authorization Request Approval Needed",
            "An authorization request from an employee has been approved by the Manager and is awaiting your approval."
          );
        } else {
          authorizationRequest.status = "Rejected";
          await sendEmailNotification(
            authorizationRequest.employee_id,
            "Authorization Request Rejected",
            "Your authorization request has been rejected by the Manager."
          );
        }
      }
    } else if (
      role === "MANAGER" &&
      authorizationRequest.employee_id === userId
    ) {
      authorizationRequest.manager_approval_status = "Approved";
      authorizationRequest.plant_manager_approval_status = "Pending";
      authorizationRequest.status = "Under Plant Manager Review";

      // Notify Plant Manager
      await sendEmailNotification(
        authorizationRequest.next_approver_id,
        "Authorization Request Approval Needed",
        "An authorization request from the Manager is awaiting your approval."
      );
    }

    // For Plant Manager role
    else if (role === "PLANT_MANAGER") {
      if (
        authorizationRequest.manager_approval_status === "Approved" &&
        authorizationRequest.plant_manager_approval_status === "Pending"
      ) {
        authorizationRequest.plant_manager_approval_status = status;

        if (status === "Approved") {
          authorizationRequest.status = "Approved";
          authorizationRequest.current_approver_id = null;
          await sendEmailNotification(
            authorizationRequest.employee_id,
            "Authorization Request Approved",
            "Your authorization request has been approved by the Plant Manager."
          );
        } else {
          authorizationRequest.status = "Rejected";
          await sendEmailNotification(
            authorizationRequest.employee_id,
            "Authorization Request Rejected",
            "Your authorization request has been rejected by the Plant Manager."
          );
        }
      } else if (
        authorizationRequest.manager_approval_status === "Pending" &&
        authorizationRequest.plant_manager_approval_status === "Pending"
      ) {
        authorizationRequest.plant_manager_approval_status = status;

        if (status === "Approved") {
          // If approved by Plant Manager, finalize status to Approved
          authorizationRequest.status = "Approved";
          authorizationRequest.current_approver_id = null;
          await sendEmailNotification(
            authorizationRequest.employee_id,
            "Authorization Request Approved",
            "Your authorization request has been approved by the Plant Manager."
          );
        } else {
          // If rejected by Plant Manager, update status to Refused
          authorizationRequest.status = "Rejected";
          await sendEmailNotification(
            authorizationRequest.employee_id,
            "Authorization Request Rejected",
            "Your authorization request has been rejected by the Plant Manager."
          );
        }
      }
    }

    // For CEO role
    else if (role === "CEO") {
      if (
        authorizationRequest.manager_approval_status === "Pending" &&
        authorizationRequest.plant_manager_approval_status === "Pending" &&
        authorizationRequest.ceo_approval_status === "Pending"
      ) {
        authorizationRequest.ceo_approval_status = status;

        if (status === "Approved") {
          authorizationRequest.status = "Approved";
          authorizationRequest.current_approver_id = null;
          await sendEmailNotification(
            authorizationRequest.employee_id,
            "Authorization Request Approved",
            "Your authorization request has been approved by the CEO."
          );
        } else {
          authorizationRequest.status = "Rejected";
          await sendEmailNotification(
            authorizationRequest.employee_id,
            "Authorization Request Rejected",
            "Your authorization request has been rejected by the CEO."
          );
        }
      }
    }

    // Update the authorization request with the new status
    const updatedAuthorizationRequest = await updateAuthorizationRequest(
      id,
      authorizationRequest
    );
    res.status(200).json(updatedAuthorizationRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete authorization request by ID
const deleteAuthorizationRequestById = async (req, res) => {
  const id = req.params.id;

  try {
    const deletedAuthorizationRequest = await deleteAuthorizationRequest(id);
    if (!deletedAuthorizationRequest) {
      res.status(404).json({ error: "Authorization request not found" });
      return;
    }
    res.status(200).json(deletedAuthorizationRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const fetchAllAuthorizationRequests = async (req, res) => {
  try {
    const { plant } = req.user;
    const AuthorizationRequests = await getAllAuthorizationRequests(plant);
    res.status(200).json(AuthorizationRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addAuthorizationRequest,
  fetchAuthorizationRequests,
  fetchAllAuthorizationRequests,
  fetchAuthorizationRequestById,
  fetchAuthorizationRequestsByEmployeeId,
  updateAuthorizationRequestStatus,
  deleteAuthorizationRequestById,
};
