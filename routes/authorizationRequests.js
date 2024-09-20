const express = require("express");
const router = express.Router();
const {
  addAuthorizationRequest,
  fetchAuthorizationRequests,
  fetchAuthorizationRequestById,
  fetchAuthorizationRequestsByEmployeeId,
  deleteAuthorizationRequestById,
  updateAuthorizationRequestStatus,
} = require("../controllers/authRequestsController");
const { authenticate } = require("../middleware/authenticateToken");

// Route to create a new authorization request
router.post("/", authenticate, addAuthorizationRequest);

// Route to get all authorization requests
router.get("/", authenticate, fetchAuthorizationRequests);

// Route to get an authorization request by ID
router.get("/:id", fetchAuthorizationRequestById);

// Route to get authorization requests by employee ID
router.get("/employee/:employeeId", fetchAuthorizationRequestsByEmployeeId);

// Route to update an authorization request by ID
router.patch("/:id", authenticate, updateAuthorizationRequestStatus);

// Route to delete an authorization request by ID
router.delete("/:id", authenticate, deleteAuthorizationRequestById);

module.exports = router;
