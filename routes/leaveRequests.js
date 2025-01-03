const express = require("express");
const router = express.Router();

const {
  addLeaveRequest,
  fetchLeaveRequests,
  fetchAllLeaveRequests,
  fetchLeaveRequestById,
  fetchLeaveRequestsByEmployeeId,
  updateLeaveRequestStatus,
  removeLeaveRequest,
  downloadJustificationFile,
  getHighLeavePercentageByMonth,
  getHighLeavePercentageByYear,
} = require("../controllers/leaveRequestsController");
const { authenticate } = require("../middleware/authenticateToken");
// POST request to create a leave request
router.post("/", authenticate, addLeaveRequest);
//GET All leave requests to fetch all leave requests
router.get("/all", authenticate, fetchAllLeaveRequests);
// GET request to fetch  leave requests
router.get("/", authenticate, fetchLeaveRequests);
// GET request to fetch leave requests by employee ID
router.get("/employee/:employeeId", fetchLeaveRequestsByEmployeeId);
// GET request to fetch a leave request by ID
router.get("/:id", fetchLeaveRequestById);
// PATCH request to update leave request status
router.patch("/:id", authenticate, updateLeaveRequestStatus);
// DELETE request to delete a leave request by ID
router.delete("/:id", authenticate, removeLeaveRequest);
// GET request to download justification file
router.get("/download/:fileName", downloadJustificationFile);
// router.get("", authenticate);
router.get(
  "/high-leave-percentage/:month/:year",
  getHighLeavePercentageByMonth
);
router.get("/high-leave-percentage/year/:year", getHighLeavePercentageByYear);

module.exports = router;
