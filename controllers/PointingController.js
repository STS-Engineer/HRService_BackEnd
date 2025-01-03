const Zkteco = require("zkteco-js");
const moment = require("moment-timezone");
const ExcelJS = require("exceljs");
const {
  insertPointingLog,
  getPointingLogs,
  updatePointingStatuses,
  getLogs,
  calculateWorkingHoursForDay,
  getWorkingHoursSummary,
  getLogsByEmployeeId,
  getAllDevices,
  getDeviceById,
  addDevice,
  fetchLogsByPlantManager,
  getLogsByPointeuse,
} = require("../models/PointingModel");
const pool = require("../config/database");

// Function to fetch data from the device and save to the database without ID normalization
const syncDeviceLogsNew = async (req, res) => {
  const device = new Zkteco("192.168.7.54", 4370, 5200, 5000);
  try {
    // Connect to the device
    await device.createSocket();

    // Fetch logs from the device
    const attendanceLogs = await device.getAttendances();
    const logsArray = attendanceLogs.data || [];

    if (logsArray.length === 0) {
      return res.status(200).json({
        message: "No logs found on the device.",
        results: { added: 0, skipped: 0, errors: [] },
      });
    }

    const results = { added: 0, skipped: 0, errors: [] };

    for (const log of logsArray) {
      try {
        // Use the original user ID directly
        const employeeId = log.user_id;

        const rawTimestamp = log.record_time;

        // Parse and validate the timestamp
        const logTime = moment
          .tz(rawTimestamp, "ddd MMM DD YYYY HH:mm:ss [GMT]Z", "Africa/Tunis")
          .utc()
          .toDate();

        if (!logTime || isNaN(logTime.getTime())) {
          throw new Error(`Invalid timestamp format: ${rawTimestamp}`);
        }

        // Check if the log is for December (month 12)
        const month = logTime.getUTCMonth() + 1; // getUTCMonth() returns 0-11
        if (month !== 12) {
          results.skipped++;
          continue; // Skip logs not in December
        }

        // Check if the log already exists in the database
        const query = `
            SELECT COUNT(*) 
            FROM pointing 
            WHERE employee_id = $1 AND log_time = $2
          `;
        const values = [employeeId, logTime];
        const result = await pool.query(query, values);

        if (parseInt(result.rows[0].count) > 0) {
          // Log exists, skip it
          results.skipped++;
          continue;
        }

        // Insert the new log into the database
        const insertQuery = `
            INSERT INTO pointing (employee_id, log_time, status)
            VALUES ($1, $2, $3)
          `;
        const insertValues = [employeeId, logTime, log.state || "Unknown"];
        await pool.query(insertQuery, insertValues);

        results.added++;
      } catch (err) {
        results.errors.push({ log, error: err.message });
      }
    }

    // Send response with the synchronization summary
    res.status(200).json({
      message: "Synchronization completed.",
      results,
    });
  } catch (error) {
    console.error("Error syncing logs:", error);
    res.status(500).json({ error: "Failed to sync logs from the device." });
  }
};
// Function to fetch data from the device and save to the database
const syncDeviceLogs = async (req, res) => {
  const device = new Zkteco("192.168.1.40", 4370, 5200, 5000);

  // Helper function to normalize user ID
  const normalizeUserId = (deviceUserId) => {
    const id = parseInt(deviceUserId, 10);
    return id >= 40000 ? id % 10000 : id; // Remove the "400" prefix if it exists
  };

  try {
    // Connect to the device
    await device.createSocket();

    // Fetch logs from the device
    const attendanceLogs = await device.getAttendances();
    const logsArray = attendanceLogs.data || [];

    if (logsArray.length === 0) {
      return res.status(200).json({
        message: "No logs found on the device.",
        results: { added: 0, skipped: 0, errors: [] },
      });
    }

    const results = { added: 0, skipped: 0, errors: [] };

    for (const log of logsArray) {
      try {
        // Normalize user ID
        const employeeId = normalizeUserId(log.user_id);

        const rawTimestamp = log.record_time;

        // Parse and validate the timestamp
        const logTime = moment
          .tz(rawTimestamp, "ddd MMM DD YYYY HH:mm:ss [GMT]Z", "Africa/Tunis")
          .utc()
          .toDate();

        if (!logTime || isNaN(logTime.getTime())) {
          throw new Error(`Invalid timestamp format: ${rawTimestamp}`);
        }

        // Check if the log already exists in the database
        const query = `
            SELECT COUNT(*) 
            FROM pointing 
            WHERE employee_id = $1 AND log_time = $2
          `;
        const values = [employeeId, logTime];
        const result = await pool.query(query, values);

        if (parseInt(result.rows[0].count) > 0) {
          // Log exists, skip it
          results.skipped++;
          continue;
        }

        // Insert the new log into the database
        const insertQuery = `
            INSERT INTO pointing (employee_id, log_time, status)
            VALUES ($1, $2, $3)
          `;
        const insertValues = [employeeId, logTime, log.state || "Unknown"];
        await pool.query(insertQuery, insertValues);

        results.added++;
      } catch (err) {
        results.errors.push({ log, error: err.message });
      }
    }

    // Send response with the synchronization summary
    res.status(200).json({
      message: "Synchronization completed.",
      results,
    });
  } catch (error) {
    console.error("Error syncing logs:", error);
    res.status(500).json({ error: "Failed to sync logs from the device." });
  }
};

const syncLogsByPointeuses = async (req, res) => {
  const { pointeuseId, deviceIp } = req.body;

  if (!deviceIp || !pointeuseId) {
    return res
      .status(400)
      .json({ error: "Device IP and Pointeuse ID are required." });
  }

  const device = new Zkteco(deviceIp, 4370, 5200, 5000);

  try {
    await device.createSocket();
    const attendanceLogs = await device.getAttendances();
    const logsArray = attendanceLogs.data || [];

    if (logsArray.length === 0) {
      return res.status(200).json({
        message: "No logs found on the device.",
        results: { added: 0, skipped: 0, errors: [] },
      });
    }

    const results = { added: 0, skipped: 0, errors: [] };

    for (const log of logsArray) {
      try {
        const employeeId = normalizeUserId(log.user_id);
        const rawTimestamp = log.record_time;

        const logTime = moment
          .tz(rawTimestamp, "ddd MMM DD YYYY HH:mm:ss [GMT]Z", "Africa/Tunis")
          .utc()
          .toDate();

        if (!logTime || isNaN(logTime.getTime())) {
          throw new Error(`Invalid timestamp format: ${rawTimestamp}`);
        }

        const query = `
          SELECT COUNT(*) 
          FROM pointing 
          WHERE employee_id = $1 AND log_time = $2 AND pointeuse_id = $3
        `;
        const values = [employeeId, logTime, pointeuseId];
        const result = await pool.query(query, values);

        if (parseInt(result.rows[0].count) > 0) {
          results.skipped++;
          continue;
        }

        const insertQuery = `
          INSERT INTO pointing (employee_id, log_time, status, pointeuse_id)
          VALUES ($1, $2, $3, $4)
        `;
        const insertValues = [
          employeeId,
          logTime,
          log.state || "Unknown",
          pointeuseId,
        ];
        await pool.query(insertQuery, insertValues);

        results.added++;
      } catch (err) {
        results.errors.push({ log, error: err.message });
      }
    }

    res.status(200).json({
      message: "Synchronization completed.",
      results,
    });
  } catch (error) {
    console.error("Error syncing logs:", error);
    res.status(500).json({ error: "Failed to sync logs from the device." });
  }
};
const syncDeviceLogsByEmployeeId = async (req, res) => {
  // Assume employeeId comes from an authenticated user's session or request
  const employeeId = req.user?.id || req.body.employeeId;

  if (!employeeId) {
    return res.status(400).json({ error: "Employee ID is required." });
  }

  const device = new Zkteco("192.168.1.40", 4370, 5200, 5000);

  try {
    // Connect to the device
    await device.createSocket();

    // Fetch logs from the device
    const attendanceLogs = await device.getAttendances();
    const logsArray = attendanceLogs.data || [];

    if (logsArray.length === 0) {
      return res.status(200).json({
        message: "No logs found on the device.",
        results: { added: 0, skipped: 0, errors: [] },
      });
    }

    const results = { added: 0, skipped: 0, errors: [] };

    for (const log of logsArray) {
      try {
        // Normalize user ID (if needed)
        const normalizedUserId = parseInt(log.user_id, 10);

        // Only process logs for the requesting employee
        if (normalizedUserId !== parseInt(employeeId, 10)) {
          results.skipped++;
          continue;
        }

        const rawTimestamp = log.record_time;

        // Parse the timestamp
        const logTime = moment
          .tz(rawTimestamp, "ddd MMM DD YYYY HH:mm:ss [GMT]Z", "Africa/Tunis")
          .utc()
          .toDate();

        if (!logTime || isNaN(logTime.getTime())) {
          throw new Error(`Invalid timestamp: ${rawTimestamp}`);
        }

        // Check if the log already exists
        const query = `
          SELECT COUNT(*) 
          FROM pointing 
          WHERE employee_id = $1 AND log_time = $2
        `;
        const values = [employeeId, logTime];
        const result = await pool.query(query, values);

        if (parseInt(result.rows[0].count, 10) > 0) {
          results.skipped++;
          continue;
        }

        // Insert the log
        const insertQuery = `
          INSERT INTO pointing (employee_id, log_time, status)
          VALUES ($1, $2, $3)
        `;
        const insertValues = [employeeId, logTime, log.state || "Unknown"];
        await pool.query(insertQuery, insertValues);

        results.added++;
      } catch (error) {
        results.errors.push({ log, error: error.message });
      }
    }

    res.status(200).json({
      message: `Logs synchronized for employee ID ${employeeId}.`,
      results,
    });
  } catch (error) {
    console.error("Error syncing logs:", error);
    res.status(500).json({ error: "Failed to sync logs from the device." });
  }
};
// Function to fetch logs from the database
const fetchPointingLogs = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const logs = await getPointingLogs({ employeeId, startDate, endDate });
    res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch pointing logs." });
  }
};

// Function to export logs to Excel
const exportLogsToExcel = async (req, res) => {
  try {
    const logs = await getPointingLogs(req.query);

    // Generate Excel file
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance Logs");
    if (logs.length > 0) {
      const columns = Object.keys(logs[0]).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key: key,
        width: 20,
      }));
      sheet.columns = columns;
      logs.forEach((log) => sheet.addRow(log));
    }

    // Send the Excel file to the client
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="AttendanceLogs.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting logs:", error);
    res.status(500).json({ error: "Failed to export logs to Excel." });
  }
};
const updatePointingStatusController = async (req, res) => {
  try {
    // Call the function to update statuses
    await updatePointingStatuses();
    res.status(200).json({ message: "Statuses updated successfully." });
  } catch (err) {
    console.error("Error updating statuses: ", err);
    res
      .status(500)
      .json({ message: "Error updating statuses.", error: err.message });
  }
};
// Get Daily Logs for an Employee
const getLogsController = async (req, res) => {
  const { employeeId, period, date } = req.params;

  if (!employeeId || !period || !date) {
    return res.status(400).json({
      message: "Missing required parameters: employeeId, period, or date",
    });
  }

  const employeeIdNum = parseInt(employeeId, 10);
  if (isNaN(employeeIdNum)) {
    return res.status(400).json({ message: "Invalid employeeId." });
  }

  let isValidDate = false;
  if (period === "day") {
    isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date); // YYYY-MM-DD
  } else if (period === "week") {
    isValidDate = /^\d{4}-W\d{2}$/.test(date); // YYYY-WXX
  } else if (period === "month") {
    isValidDate = /^\d{4}-\d{2}$/.test(date); // YYYY-MM
  }

  if (!isValidDate) {
    return res.status(400).json({
      message: `Invalid date format for period '${period}'. Expected format: ${
        period === "day"
          ? "YYYY-MM-DD"
          : period === "week"
          ? "YYYY-WXX"
          : "YYYY-MM"
      }`,
    });
  }

  try {
    const logs = await getLogs(employeeIdNum, period, date);

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified period." });
    }

    res.status(200).json(logs);
  } catch (error) {
    console.error("Error getting logs:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching logs", error: error.message });
  }
};

// Calculate Total Hours Worked on a Given Day
const calculateWorkingHoursForDayController = async (req, res) => {
  const { employeeId, date } = req.body; // Use req.body instead of req.query
  console.log("Employee ID:", employeeId); // Log the employeeId value

  try {
    const hours = await calculateWorkingHoursForDay(employeeId, date);
    if (hours) {
      res.status(200).json({ total_hours: hours.total_hours });
    } else {
      res.status(404).json({ message: "No logs found for the given date" });
    }
  } catch (error) {
    console.error("Error calculating working hours:", error);
    res.status(500).json({ message: "Error calculating working hours" });
  }
};

// Get Weekly/Monthly Summary of Hours Worked
const getWorkingHoursSummaryController = async (req, res) => {
  const { employeeId, startDate, endDate } = req.query;

  try {
    const summary = await getWorkingHoursSummary({
      employeeId,
      startDate,
      endDate,
    });
    res.status(200).json(summary);
  } catch (error) {
    console.error("Error getting working hours summary:", error);
    res.status(500).json({ message: "Error fetching working hours summary" });
  }
};
const getLogsByEmployeeIdController = async (req, res) => {
  const { employeeId } = req.params;

  if (!employeeId) {
    return res
      .status(400)
      .json({ message: "Missing required parameter: employeeId" });
  }

  const employeeIdNum = parseInt(employeeId, 10);
  if (isNaN(employeeIdNum)) {
    return res.status(400).json({ message: "Invalid employeeId." });
  }

  try {
    const logs = await getLogsByEmployeeId(employeeIdNum);

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for this employee." });
    }

    res.status(200).json(logs);
  } catch (error) {
    console.error("Error getting logs by employeeId:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching logs", error: error.message });
  }
};

// Correct or Approve a Log Entry
const correctPointingLogController = async (req, res) => {
  const { logId, newInTime, newOutTime } = req.body;

  try {
    await correctPointingLog(logId, newInTime, newOutTime);
    res.status(200).json({ message: "Pointing log corrected successfully" });
  } catch (error) {
    console.error("Error correcting pointing log:", error);
    res.status(500).json({ message: "Error correcting pointing log" });
  }
};
const addNewDevice = async (req, res) => {
  const { device_name, device_ip } = req.body;

  // Check if device_ip is provided
  if (!device_ip) {
    return res.status(400).json({ error: "Device IP is required" });
  }

  try {
    // Insert device into the database
    const query = `INSERT INTO pointeuses (device_name, device_ip) VALUES ($1, $2) RETURNING *`;
    const values = [device_name || "Unknown", device_ip];
    const result = await pool.query(query, values); // Execute the query

    // Respond with the newly added device
    return res.status(201).json({
      message: "Device added successfully",
      device: result.rows[0], // Respond with the added device data
    });
  } catch (error) {
    console.error("Error adding device:", error);
    return res.status(500).json({ error: "Failed to add device" });
  }
};
// for plant manager
const getPlantManagerLogs = async (req, res) => {
  const { plantManagerId } = req.params;

  try {
    const logs = await fetchLogsByPlantManager(plantManagerId);

    if (logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for this Plant Manager." });
    }

    res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching logs.", error });
  }
};
module.exports = {
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
};
