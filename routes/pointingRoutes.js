const express = require("express");
const {
  syncDeviceLogs,
  syncDeviceLogsNew,
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
} = require("../controllers/PointingController");
const router = express.Router();
const { authenticate } = require("../middleware/authenticateToken");
// Route to sync logs from ZKTeco device
router.post("/sync", syncDeviceLogs);
router.post("/sync/:employeeId", authenticate, syncDeviceLogs);
router.post("/syncLogs", authenticate, syncDeviceLogsByEmployeeId);
router.post("/sync/new", syncDeviceLogsNew);
// Route to fetch pointing logs
router.get("/", authenticate, fetchPointingLogs);
// Route to export logs to Excel
router.get("/export", exportLogsToExcel);
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
    const newDevice = await addDevice(deviceIp, deviceName);
    res.status(201).json(newDevice);
  } catch (error) {
    res.status(500).json({ error: "Failed to add pointeuse." });
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
module.exports = router;
