const express = require("express");
const router = express.Router();
const {
  addMissionRequest,
  fetchMissionRequests,
  fetchAllMissionRequests,
  fetchMissionRequestById,
  fetchMissionRequestsByEmployeeId,
  updateMissionRequestById,
  deleteMissionRequestById,
} = require("../controllers/missionRequestsController");
const { authenticate } = require("../middleware/authenticateToken");

// Define routes for mission requests
router.post("/", authenticate, addMissionRequest);
router.get("/", authenticate, fetchMissionRequests);
router.get("/all", authenticate, fetchAllMissionRequests);
router.get("/:id", fetchMissionRequestById);
router.get("/employee/:employeeId", fetchMissionRequestsByEmployeeId);
router.patch("/:id", authenticate, updateMissionRequestById);
router.delete("/:id", authenticate, deleteMissionRequestById);

module.exports = router;
