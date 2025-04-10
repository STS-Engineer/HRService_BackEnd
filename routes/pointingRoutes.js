const express = require("express");
const {
  syncDeviceLogs,
  syncDeviceLogsNew,
  syncDeviceLog,
  syncDeviceLogsByEmployeeId,
  updatePointingStatusController,
  fetchPointingLogs,
  exportLogsToExcel,
  getLogsController,
  getLogsByEmployeeIdController,
  calculateWorkingHoursForDayController,
  getWorkingHoursSummaryController,
  correctPointingLogController,
  addNewDevice,
  getPlantManagerLogs,
  syncLogsByPointeuses,
  getFilteredLogs,
  exportFilteredLogsToExcel,
  getSummarizedWorkingHours,
  WorkingHoursToExcel,
  getSummarizedWorkingHoursByWeek,
  getSummarizedWorkingHoursByMonth,
  getSummarizedWorkingHoursByMonthExcel,
  getAttendance,
  getAllAttendance,
  getAttendanceByDate,
  getAttendanceByEmployeeId,
  getAttendanceByEmployeeName,
  insertAttendance,
  exportAttendanceExcel,
  getPointeuses,
  getEmployeesByPointeuse,
  checkAndNotifyImpairPointing,
  getSummarizedWorkingHoursupdate,
  generateExcelFileWorkingHoursupdate,
  fetchPointingLogsFilter,
} = require("../controllers/PointingController");
const router = express.Router();
const { authenticate } = require("../middleware/authenticateToken");
// Route to sync logs from ZKTeco device
router.post("/sync", syncDeviceLogs);
router.get("/WorkingHoursupdateExcel", generateExcelFileWorkingHoursupdate);
router.post("/syncTest", syncDeviceLog);
router.post("/sync/:employeeId", authenticate, syncDeviceLogs);
router.post("/syncLogs", authenticate, syncDeviceLogsByEmployeeId);
router.post("/sync/new", syncDeviceLogsNew);
// Route to fetch pointing logs
router.get("/", authenticate, fetchPointingLogs);
// Route to export logs to Excel
router.get("/export", exportLogsToExcel);
router.get("/export-workinghours", exportFilteredLogsToExcel);
router.post("/update-pointing-statuses", updatePointingStatusController);
// Route to get daily logs
router.get("/logs/:employeeId/:period/:date", getLogsController);
// Route to calculate working hours for a specific day
router.get(
  "/working-hours",
  authenticate,
  calculateWorkingHoursForDayController
);
// Route to get weekly/monthly working hours summary
router.get("/working-hours/summary", getWorkingHoursSummaryController);
// Route to correct a pointing log
router.patch("/correct-log", correctPointingLogController);
router.get(
  "/logs/employee/:employeeId",
  authenticate,
  getLogsByEmployeeIdController
);
router.get("/logs/filter", getFilteredLogs);
router.get("/logs/export", exportFilteredLogsToExcel);
router.get("/logs/working_hours", getSummarizedWorkingHours);
router.get("/working_hours", WorkingHoursToExcel);
router.post("/add-device", addNewDevice);
router.get(
  "/logs/plant-manager/:plantManagerId",
  authenticate,
  getPlantManagerLogs
);
router.get("/pointeuses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const device = await getDeviceById(id);
    if (!device) {
      return res.status(404).json({ error: "Pointeuse not found." });
    }
    res.status(200).json(device);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pointeuse details." });
  }
});
// Route to fetch all pointeuses
router.get("/pointeuses", async (req, res) => {
  try {
    const devices = await getAllDevices();
    res.status(200).json(devices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pointeuses." });
  }
});
// Route to fetch details of a specific pointeuse
router.get("/pointeuses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const device = await getDeviceById(id);
    if (!device) {
      return res.status(404).json({ error: "Pointeuse not found." });
    }
    res.status(200).json(device);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pointeuse details." });
  }
});
// Route to add a new pointeuse
router.post("/pointeuses", async (req, res) => {
  const { deviceIp, deviceName } = req.body;
  try {
    const newDevice = await addNewDevice(deviceIp, deviceName);
    res.status(201).json(newDevice); // Respond with the added device
  } catch (error) {
    // Log the error and send a detailed response
    console.error("Error in /pointeuses route:", error.message);
    res
      .status(500)
      .json({ error: `Failed to add pointeuse: ${error.message}` });
  }
});
// Route to fetch logs of a specific pointeuse
router.get("/pointeuses/:id/logs", async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await getLogsByPointeuse(id);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs for the pointeuse." });
  }
});
// Route to sync logs from a specific pointeuse
router.post("/sync-pointing", async (req, res) => {
  try {
    await syncLogsByPointeuses(req, res);
  } catch (error) {
    res.status(500).json({ error: "Failed to sync logs." });
  }
});
router.get("/logs/working_hours_weekly", getSummarizedWorkingHoursByWeek);
router.get("/logs/working_hours_monthly", getSummarizedWorkingHoursByMonth);
router.get(
  "/logs/working_hours_monthly_excel",
  getSummarizedWorkingHoursByMonthExcel
);
// router.get("/checkImpairPointing", checkAndNotifyImpairPointing); // Check the imparity and send email to the concerns
router.get("/attendance", getAttendance); // Get all attendance ordered by date ASC
router.get("/allattendance", getAllAttendance); // Get attendance all
router.get("/attendance/date", getAttendanceByDate); // Filter by date
router.get("/attendance/employee", getAttendanceByEmployeeId); // Filter by Employee ID
router.get("/attendance/employee-name", getAttendanceByEmployeeName); // Filter by Employee Name
router.post("/attendance", insertAttendance); // Insert attendance data
router.get("/attendance/export/excel", exportAttendanceExcel);
// Gestion des pointeuses
router.get("/pointeuses/:id/employees", getEmployeesByPointeuse);
router.get("/devices", getPointeuses);
router.get("/logs/working_hours_update", getSummarizedWorkingHoursupdate);
router.get("/filter", authenticate, fetchPointingLogsFilter);

module.exports = router;
