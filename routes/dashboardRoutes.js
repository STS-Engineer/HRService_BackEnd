const express = require("express");
const {
  getRequestsPerEmployee,
  getEmployeesOnLeaveToday,
  getGeneralStatistics,
} = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authenticateToken");

const router = express.Router();

// Route to get total requests per employee
router.get("/requests-per-employee", authenticate, getRequestsPerEmployee);

// Route to get employees on leave today
router.get("/employees-on-leave-today", authenticate, getEmployeesOnLeaveToday);

// Route to get general statistics for the dashboard
router.get("/general-statistics", authenticate, getGeneralStatistics);

module.exports = router;
