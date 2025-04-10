const Zkteco = require("zkteco-js");
const moment = require("moment-timezone");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const { sendEmailNotification } = require("../services/emailService");
const { Workbook } = require("exceljs");
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
const syncDeviceLog = async (req, res) => {
  const device = new Zkteco("192.168.1.16", 4370, 5200, 5000);
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
  const syncDeviceLogsU = async (req, res) => {
    const device = new Zkteco("192.168.1.40", 4370, 5200, 5000);

    const normalizeUserId = (deviceUserId) => {
      const id = parseInt(deviceUserId, 10);
      return id >= 40000 ? id % 10000 : id; // Remove the "400" prefix if it exists
    };

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

          // Parse timestamp
          const logTime = moment
            .tz(rawTimestamp, "ddd MMM DD YYYY HH:mm:ss [GMT]Z", "Africa/Tunis")
            .utc()
            .toDate();

          if (!logTime || isNaN(logTime.getTime())) {
            throw new Error(`Invalid timestamp format: ${rawTimestamp}`);
          }

          // Extract the date part only (YYYY-MM-DD) for comparison
          const logDate = moment(logTime).format("YYYY-MM-DD");

          // Check if an "IN" log already exists for this employee on this date
          const checkQuery = `
            SELECT COUNT(*) 
            FROM pointing 
            WHERE employee_id = $1 AND DATE(log_time) = $2 AND status = 'IN'
          `;
          const checkValues = [employeeId, logDate];
          const checkResult = await pool.query(checkQuery, checkValues);

          let status = "IN"; // Default status

          if (parseInt(checkResult.rows[0].count) > 0) {
            status = "OUT"; // If an "IN" log already exists, mark this as "OUT"
          }

          // Check if the exact log already exists
          const existsQuery = `
            SELECT COUNT(*) 
            FROM pointing 
            WHERE employee_id = $1 AND log_time = $2
          `;
          const existsValues = [employeeId, logTime];
          const existsResult = await pool.query(existsQuery, existsValues);

          if (parseInt(existsResult.rows[0].count) > 0) {
            results.skipped++;
            continue;
          }

          // Insert the log with the determined status
          const insertQuery = `
            INSERT INTO pointing (employee_id, log_time, status)
            VALUES ($1, $2, $3)
          `;
          const insertValues = [employeeId, logTime, status];
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

    // Call the database function
    const logs = await getPointingLogs({ employeeId, startDate, endDate });

    if (!logs.length) {
      return res.status(404).json({ message: "No pointing logs found." });
    }

    res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch pointing logs." });
  }
};
//Function to fetch with filters from the databse
const fetchPointingLogsFilter = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    let start, end;

    if (startDate && !endDate) {
      // Single date: from start of day to end of day
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${startDate}T23:59:59`);
    } else if (startDate && endDate) {
      // Date range: inclusive range
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T23:59:59`);
    } else {
      return res
        .status(400)
        .json({ message: "Please provide at least startDate." });
    }

    // Call your service or database function and pass the normalized dates
    const logs = await getPointingLogs({
      employeeId,
      startDate: start,
      endDate: end,
    });

    if (!logs.length) {
      return res.status(404).json({ message: "No pointing logs found." });
    }

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
    // Insert device using the addDevice function
    const newDevice = await addDevice(device_ip, device_name);
    return res.status(201).json({
      message: "Device added successfully",
      device: newDevice, // Respond with the added device data
    });
  } catch (error) {
    // Log the error with a more detailed message
    console.error("Error in addNewDevice:", error.message);
    return res.status(500).json({
      error: `Failed to add device: ${error.message}`, // Include error message from the try-catch
    });
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
const getFilteredLogs = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Please provide valid dates." });
    }

    const startDate = moment(fromDate).startOf("day").toISOString();
    const endDate = moment(toDate).endOf("day").toISOString();

    // Fetch logs within the date range
    const logs = await getPointingLogs({ startDate, endDate });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified dates." });
    }

    // Group logs by employee and calculate working hours
    const groupedLogs = {};
    logs.forEach((log) => {
      const key = `${log.employee_id}-${moment(log.log_time).format(
        "YYYY-MM-DD"
      )}`;
      if (!groupedLogs[key]) {
        groupedLogs[key] = {
          employee_id: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          totalWorkingHours: 0, // Initialize total working hours
          in: null,
          out: null,
        };
      }

      if (log.status.toLowerCase() === "in") {
        groupedLogs[key].in = log.log_time;
      } else if (log.status.toLowerCase() === "out") {
        groupedLogs[key].out = log.log_time;
      }
    });

    // Calculate total working hours (deducting 1 hour for lunch)
    const results = Object.values(groupedLogs).map((entry) => {
      const checkIn = moment(entry.in);
      const checkOut = moment(entry.out);
      let workingHours = 0;

      if (checkIn.isValid() && checkOut.isValid()) {
        // Calculate the time difference between check-in and check-out
        workingHours = checkOut.diff(checkIn, "hours", true);
        // Deduct 1 hour for lunch
        workingHours -= 1;
      }

      // Round to 2 decimal places for the final working hours
      return { ...entry, totalWorkingHours: workingHours.toFixed(2) };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Error processing request." });
  }
};
const exportFilteredLogsToExcel = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Please provide valid dates." });
    }

    const startDate = moment(fromDate).startOf("day").toISOString();
    const endDate = moment(toDate).endOf("day").toISOString();

    // Fetch logs from the helper function
    const logs = await getPointingLogs({ startDate, endDate });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified dates." });
    }

    const groupedLogs = {};
    logs.forEach((log) => {
      const key = `${log.employee_id}-${moment(log.log_time).format(
        "YYYY-MM-DD"
      )}`;
      if (!groupedLogs[key]) {
        groupedLogs[key] = {
          employee_id: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          date: moment(log.log_time).format("YYYY-MM-DD"),
          in: null,
          out: null,
        };
      }
      if (log.status.toLowerCase() === "in") {
        groupedLogs[key].in = log.log_time;
      } else if (log.status.toLowerCase() === "out") {
        groupedLogs[key].out = log.log_time;
      }
    });

    const results = Object.values(groupedLogs).map((entry) => {
      const checkIn = moment(entry.in);
      const checkOut = moment(entry.out);
      const workingHours =
        checkIn.isValid() && checkOut.isValid()
          ? checkOut.diff(checkIn, "hours", true)
          : 0;
      return { ...entry, workingHours: workingHours.toFixed(2) };
    });

    // Generate Excel file
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Logs Report");

    sheet.columns = [
      { header: "Employee ID", key: "employee_id", width: 15 },
      { header: "First Name", key: "firstname", width: 20 },
      { header: "Last Name", key: "lastname", width: 20 },
      { header: "Date", key: "date", width: 15 },
      // { header: "Check In", key: "in", width: 20 },
      // { header: "Check Out", key: "out", width: 20 },
      { header: "Working Hours", key: "workingHours", width: 15 },
    ];

    results.forEach((log) => {
      sheet.addRow(log);
    });

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="LogsReport_${fromDate}_to_${toDate}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ message: "Failed to generate Excel report." });
  }
};
const getSummarizedWorkingHours = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Please provide valid dates." });
    }

    const startDate = moment(fromDate).startOf("day").toISOString();
    const endDate = moment(toDate).endOf("day").toISOString();

    // Fetch logs within the date range
    const logs = await getPointingLogs({ startDate, endDate });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified dates." });
    }

    // Group logs by employee and by date
    const groupedLogs = {};
    logs.forEach((log) => {
      const key = `${log.employee_id}-${moment(log.log_time).format(
        "YYYY-MM-DD"
      )}`;
      if (!groupedLogs[key]) {
        groupedLogs[key] = {
          employee_id: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          date: moment(log.log_time).format("YYYY-MM-DD"),
          in: null,
          out: null,
        };
      }
      if (log.status.toLowerCase() === "in") {
        groupedLogs[key].in = groupedLogs[key].in
          ? moment.min(moment(groupedLogs[key].in), moment(log.log_time))
          : moment(log.log_time); // Take the earliest "in"
      } else if (log.status.toLowerCase() === "out") {
        groupedLogs[key].out = groupedLogs[key].out
          ? moment.max(moment(groupedLogs[key].out), moment(log.log_time))
          : moment(log.log_time); // Take the latest "out"
      }
    });

    // Calculate total working hours for the range
    const summarizedData = {};
    Object.values(groupedLogs).forEach((entry) => {
      const checkIn = entry.in;
      const checkOut = entry.out;
      let dailyHours = 0;

      if (checkIn && checkOut) {
        const workedHours = checkOut.diff(checkIn, "hours", true); // Calculate exact hours
        if (workedHours >= 9) {
          dailyHours = workedHours - 1; // Deduct 1 hour for lunch
        } else if (workedHours >= 0) {
          dailyHours = workedHours; // Actual worked hours if less than 9
        }
      }

      if (!summarizedData[entry.employee_id]) {
        summarizedData[entry.employee_id] = {
          matricule: entry.employee_id,
          firstname: entry.firstname,
          lastname: entry.lastname,
          duration: `From ${moment(fromDate).format("YYYY-MM-DD")} To ${moment(
            toDate
          ).format("YYYY-MM-DD")}`,
          totalWorkingHours: 0,
        };
      }

      summarizedData[entry.employee_id].totalWorkingHours += dailyHours;
    });

    // Prepare the final response
    const results = Object.values(summarizedData).map((employee) => ({
      matricule: employee.matricule,
      firstname: employee.firstname,
      lastname: employee.lastname,
      duration: employee.duration,
      workingHours: employee.totalWorkingHours.toFixed(2),
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error("Error calculating summarized working hours:", error);
    res.status(500).json({ message: "Error processing request." });
  }
  const exportWorkingHoursToExcel = async (req, res) => {
    try {
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({ message: "Please provide valid dates." });
      }

      const startDate = moment(fromDate).startOf("day").toISOString();
      const endDate = moment(toDate).endOf("day").toISOString();

      // Fetch logs within the date range
      const logs = await getPointingLogs({ startDate, endDate });

      if (!logs || logs.length === 0) {
        return res
          .status(404)
          .json({ message: "No logs found for the specified dates." });
      }

      // Group logs by employee and by date
      const groupedLogs = {};
      logs.forEach((log) => {
        const key = `${log.employee_id}-${moment(log.log_time).format(
          "YYYY-MM-DD"
        )}`;
        if (!groupedLogs[key]) {
          groupedLogs[key] = {
            employee_id: log.employee_id,
            firstname: log.firstname,
            lastname: log.lastname,
            date: moment(log.log_time).format("YYYY-MM-DD"),
            in: null,
            out: null,
          };
        }
        if (log.status.toLowerCase() === "in") {
          groupedLogs[key].in = groupedLogs[key].in
            ? moment.min(moment(groupedLogs[key].in), moment(log.log_time))
            : moment(log.log_time); // Take the earliest "in"
        } else if (log.status.toLowerCase() === "out") {
          groupedLogs[key].out = groupedLogs[key].out
            ? moment.max(moment(groupedLogs[key].out), moment(log.log_time))
            : moment(log.log_time); // Take the latest "out"
        }
      });

      // Calculate total working hours for the range
      const summarizedData = {};
      Object.values(groupedLogs).forEach((entry) => {
        const checkIn = entry.in;
        const checkOut = entry.out;
        let dailyHours = 0;

        if (checkIn && checkOut) {
          const workedHours = checkOut.diff(checkIn, "hours", true); // Calculate exact hours
          if (workedHours >= 9) {
            dailyHours = workedHours - 1; // Deduct 1 hour for lunch
          } else if (workedHours >= 0) {
            dailyHours = workedHours; // Actual worked hours if less than 9
          }
        }

        if (!summarizedData[entry.employee_id]) {
          summarizedData[entry.employee_id] = {
            matricule: entry.employee_id,
            firstname: entry.firstname,
            lastname: entry.lastname,
            duration: `From ${moment(fromDate).format(
              "YYYY-MM-DD"
            )} To ${moment(toDate).format("YYYY-MM-DD")}`,
            totalWorkingHours: 0,
          };
        }

        summarizedData[entry.employee_id].totalWorkingHours += dailyHours;
      });

      const results = Object.values(summarizedData).map((employee) => ({
        matricule: employee.matricule,
        firstname: employee.firstname,
        lastname: employee.lastname,
        duration: employee.duration,
        workingHours: employee.totalWorkingHours.toFixed(2),
      }));

      // Create an Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Working Hours");

      // Add header row
      worksheet.columns = [
        { header: "Matricule", key: "matricule", width: 12 },
        { header: "Firstname", key: "firstname", width: 20 },
        { header: "Lastname", key: "lastname", width: 20 },
        { header: "Duration", key: "duration", width: 30 },
        { header: "Working Hours", key: "workingHours", width: 15 },
      ];

      // Add rows with data
      results.forEach((employee) => {
        worksheet.addRow({
          matricule: employee.matricule,
          firstname: employee.firstname,
          lastname: employee.lastname,
          duration: employee.duration,
          workingHours: employee.workingHours,
        });
      });

      // Add styling (optional)
      worksheet.getRow(1).font = { bold: true };
      worksheet.eachRow((row, rowNumber) => {
        row.height = 30;
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Send the file as response
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=working_hours_${moment().format(
          "YYYY-MM-DD"
        )}.xlsx`
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Error processing request." });
    }
  };
}; // this is the api with summarizing the working hours:  by selected parameters date p
const exportWorkingHoursToExcel = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Please provide valid dates." });
    }

    const startDate = moment(fromDate).startOf("day").toISOString();
    const endDate = moment(toDate).endOf("day").toISOString();

    // Fetch logs within the date range
    const logs = await getPointingLogs({ startDate, endDate });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified dates." });
    }

    // Group logs by employee and by date
    const groupedLogs = {};
    logs.forEach((log) => {
      const key = `${log.employee_id}-${moment(log.log_time).format(
        "YYYY-MM-DD"
      )}`;
      if (!groupedLogs[key]) {
        groupedLogs[key] = {
          employee_id: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          date: moment(log.log_time).format("YYYY-MM-DD"),
          in: null,
          out: null,
        };
      }
      if (log.status.toLowerCase() === "in") {
        groupedLogs[key].in = groupedLogs[key].in
          ? moment.min(moment(groupedLogs[key].in), moment(log.log_time))
          : moment(log.log_time); // Take the earliest "in"
      } else if (log.status.toLowerCase() === "out") {
        groupedLogs[key].out = groupedLogs[key].out
          ? moment.max(moment(groupedLogs[key].out), moment(log.log_time))
          : moment(log.log_time); // Take the latest "out"
      }
    });

    // Calculate total working hours for the range
    const summarizedData = {};
    Object.values(groupedLogs).forEach((entry) => {
      const checkIn = entry.in;
      const checkOut = entry.out;
      let dailyHours = 0;

      if (checkIn && checkOut) {
        const workedHours = checkOut.diff(checkIn, "hours", true); // Calculate exact hours
        if (workedHours >= 9) {
          dailyHours = workedHours - 1; // Deduct 1 hour for lunch
        } else if (workedHours >= 0) {
          dailyHours = workedHours; // Actual worked hours if less than 9
        }
      }

      if (!summarizedData[entry.employee_id]) {
        summarizedData[entry.employee_id] = {
          matricule: entry.employee_id,
          firstname: entry.firstname,
          lastname: entry.lastname,
          duration: `From ${moment(fromDate).format("YYYY-MM-DD")} To ${moment(
            toDate
          ).format("YYYY-MM-DD")}`,
          totalWorkingHours: 0,
        };
      }

      summarizedData[entry.employee_id].totalWorkingHours += dailyHours;
    });

    const results = Object.values(summarizedData).map((employee) => ({
      matricule: employee.matricule,
      firstname: employee.firstname,
      lastname: employee.lastname,
      duration: employee.duration,
      workingHours: employee.totalWorkingHours.toFixed(2),
    }));

    // Create an Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Working Hours");

    // Add header row
    worksheet.columns = [
      { header: "Matricule", key: "matricule", width: 12 },
      { header: "Firstname", key: "firstname", width: 20 },
      { header: "Lastname", key: "lastname", width: 20 },
      { header: "Duration", key: "duration", width: 30 },
      { header: "Working Hours", key: "workingHours", width: 15 },
    ];

    // Add rows with data
    results.forEach((employee) => {
      worksheet.addRow({
        matricule: employee.matricule,
        firstname: employee.firstname,
        lastname: employee.lastname,
        duration: employee.duration,
        workingHours: employee.workingHours,
      });
    });

    // Add styling (optional)
    worksheet.getRow(1).font = { bold: true };
    worksheet.eachRow((row, rowNumber) => {
      row.height = 30;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Send the file as response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=working_hours_${moment().format("YYYY-MM-DD")}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    res.status(500).json({ message: "Error processing request." });
  }
};
const WorkingHoursToExcel = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Validate input dates
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Please provide valid dates." });
    }

    const startDate = moment(fromDate).startOf("day").toISOString();
    const endDate = moment(toDate).endOf("day").toISOString();

    // Fetch logs within the specified date range
    const logs = await getPointingLogs({ startDate, endDate });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified dates." });
    }

    // Group logs by employee and date
    const groupedLogs = {};
    logs.forEach((log) => {
      const key = `${log.employee_id}-${moment(log.log_time).format(
        "YYYY-MM-DD"
      )}`;
      if (!groupedLogs[key]) {
        groupedLogs[key] = {
          employee_id: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          date: moment(log.log_time).format("YYYY-MM-DD"),
          in: null,
          out: null,
        };
      }
      if (log.status.toLowerCase() === "in") {
        groupedLogs[key].in = groupedLogs[key].in
          ? moment.min(moment(groupedLogs[key].in), moment(log.log_time))
          : moment(log.log_time);
      } else if (log.status.toLowerCase() === "out") {
        groupedLogs[key].out = groupedLogs[key].out
          ? moment.max(moment(groupedLogs[key].out), moment(log.log_time))
          : moment(log.log_time);
      }
    });

    // Calculate total working hours
    const summarizedData = {};
    Object.values(groupedLogs).forEach((entry) => {
      const checkIn = entry.in;
      const checkOut = entry.out;
      let dailyHours = 0;

      if (checkIn && checkOut) {
        const workedHours = checkOut.diff(checkIn, "hours", true); // Exact hours
        dailyHours = workedHours >= 9 ? workedHours - 1 : workedHours; // Deduct 1 hour if >= 9
      }

      if (!summarizedData[entry.employee_id]) {
        summarizedData[entry.employee_id] = {
          matricule: entry.employee_id,
          firstname: entry.firstname,
          lastname: entry.lastname,
          duration: `From ${moment(fromDate).format("YYYY-MM-DD")} To ${moment(
            toDate
          ).format("YYYY-MM-DD")}`,
          totalWorkingHours: 0,
        };
      }

      summarizedData[entry.employee_id].totalWorkingHours += dailyHours;
    });

    const results = Object.values(summarizedData).map((employee) => ({
      matricule: employee.matricule,
      firstname: employee.firstname,
      lastname: employee.lastname,
      duration: employee.duration,
      workingHours: employee.totalWorkingHours.toFixed(2),
    }));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Working Hours");

    // Define header
    worksheet.columns = [
      { header: "Matricule", key: "matricule", width: 12 },
      { header: "Firstname", key: "firstname", width: 20 },
      { header: "Lastname", key: "lastname", width: 20 },
      { header: "Duration", key: "duration", width: 30 },
      { header: "Working Hours", key: "workingHours", width: 15 },
    ];

    // Populate rows
    worksheet.addRows(results);

    // Apply styles
    worksheet.getRow(1).font = { bold: true };
    worksheet.eachRow((row) => {
      row.height = 30;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Send Excel file as a response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=working_hours_${moment().format("YYYY-MM-DD")}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting working hours to Excel:", error);
    res
      .status(500)
      .json({ message: "An error occurred while processing your request." });
  }
};
const getSummarizedWorkingHoursByWeek = async (req, res) => {
  try {
    const { year, week } = req.query;

    if (!year || isNaN(year)) {
      return res.status(400).json({ message: "Please provide a valid year." });
    }

    const startDate = moment(`${year}-01-01`).startOf("year").toISOString();
    const endDate = moment(`${year}-12-31`).endOf("year").toISOString();

    let logs = await getPointingLogs({ startDate, endDate });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified year." });
    }

    const groupedLogs = {};

    logs.forEach((log) => {
      const logWeek = moment(log.log_time).isoWeek();
      const logYear = moment(log.log_time).year();

      if (logYear != year) return;
      if (week && parseInt(week) !== logWeek) return;

      const weekStart = moment(log.log_time).startOf("isoWeek"); // Get Monday of the week
      const weekDates = {
        Monday: weekStart.format("YYYY-MM-DD"),
        Tuesday: weekStart.add(1, "days").format("YYYY-MM-DD"),
        Wednesday: weekStart.add(1, "days").format("YYYY-MM-DD"),
        Thursday: weekStart.add(1, "days").format("YYYY-MM-DD"),
        Friday: weekStart.add(1, "days").format("YYYY-MM-DD"),
        Saturday: weekStart.add(1, "days").format("YYYY-MM-DD"),
        Sunday: weekStart.add(1, "days").format("YYYY-MM-DD"),
      };

      const weekKey = `${log.employee_id}-${logYear}-W${logWeek}`;

      if (!groupedLogs[weekKey]) {
        groupedLogs[weekKey] = {
          matricule: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          year: logYear,
          week: `W${logWeek}`,
          weekDates, // Store the mapped dates
          days: {
            Monday: 0,
            Tuesday: 0,
            Wednesday: 0,
            Thursday: 0,
            Friday: 0,
            Saturday: "REPOS",
            Sunday: "ANOMALIE",
          },
          dailyLogs: {},
          totalWorkingHours: 0,
        };
      }

      const logDate = moment(log.log_time).format("YYYY-MM-DD");
      const dayName = Object.keys(weekDates).find(
        (d) => weekDates[d] === logDate
      );

      if (!groupedLogs[weekKey].dailyLogs[logDate]) {
        groupedLogs[weekKey].dailyLogs[logDate] = { in: null, out: null };
      }

      if (log.status.toLowerCase() === "in") {
        if (
          !groupedLogs[weekKey].dailyLogs[logDate].in ||
          moment(log.log_time).isBefore(
            groupedLogs[weekKey].dailyLogs[logDate].in
          )
        ) {
          groupedLogs[weekKey].dailyLogs[logDate].in = moment(log.log_time);
        }
      } else if (log.status.toLowerCase() === "out") {
        if (
          !groupedLogs[weekKey].dailyLogs[logDate].out ||
          moment(log.log_time).isAfter(
            groupedLogs[weekKey].dailyLogs[logDate].out
          )
        ) {
          groupedLogs[weekKey].dailyLogs[logDate].out = moment(log.log_time);
        }
      }
    });

    // Calculate total hours per day
    Object.values(groupedLogs).forEach((employee) => {
      Object.entries(employee.dailyLogs).forEach(([date, times]) => {
        const day = Object.keys(employee.weekDates).find(
          (d) => employee.weekDates[d] === date
        );

        if (times.in && times.out) {
          let workedHours = times.out.diff(times.in, "hours", true);
          if (workedHours >= 9) workedHours -= 1;

          employee.days[day] = workedHours.toFixed(2);
          employee.totalWorkingHours += workedHours;
        }
      });
    });

    // Format results
    const results = Object.values(groupedLogs).map((employee) => ({
      matricule: employee.matricule,
      firstname: employee.firstname,
      lastname: employee.lastname,
      week: employee.week,
      ...Object.fromEntries(
        Object.entries(employee.days).map(([day, hours]) => [
          `${day} (${employee.weekDates[day]})`,
          hours,
        ])
      ),
      total: employee.totalWorkingHours.toFixed(2),
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error("Error calculating working hours by year/week:", error);
    res.status(500).json({ message: "Error processing request." });
  }
};
const getSummarizedWorkingHoursByMonth = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Please provide valid start and end dates." });
    }

    const start = moment.utc(startDate, "YYYY-MM-DD").startOf("day");
    const end = moment.utc(endDate, "YYYY-MM-DD").endOf("day");

    if (!start.isValid() || !end.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    let logs = await getPointingLogs({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified period." });
    }

    const groupedLogs = {};

    logs.forEach((log) => {
      const logDate = moment.utc(log.log_time);
      console.log("Original Log:", log.log_time, "| UTC:", logDate.format());
      const formattedDate = logDate.format("dddd DD-MM-YYYY"); // Format as 'Monday 25-11-2024'
      const employeeKey = log.employee_id;

      // Determine the week number (divide month into 4 weeks)
      const monthStart = moment(startDate).startOf("month");
      const weekNumber = Math.ceil(logDate.diff(monthStart, "days") / 7);
      const weekLabel = `W${weekNumber}`;

      if (!groupedLogs[employeeKey]) {
        groupedLogs[employeeKey] = {
          matricule: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          weeks: {
            W1: {},
            W2: {},
            W3: {},
            W4: {},
          },
          total: 0,
        };
      }

      const weekData = groupedLogs[employeeKey].weeks[weekLabel];
      if (!weekData) return;

      if (!weekData[formattedDate]) {
        weekData[formattedDate] = { in: null, out: null };
      }

      if (log.status.toLowerCase() === "in") {
        if (
          !weekData[formattedDate].in ||
          logDate.isBefore(weekData[formattedDate].in)
        ) {
          weekData[formattedDate].in = logDate;
        }
      } else if (log.status.toLowerCase() === "out") {
        if (
          !weekData[formattedDate].out ||
          logDate.isAfter(weekData[formattedDate].out)
        ) {
          weekData[formattedDate].out = logDate;
        }
      }
    });

    // Calculate total working hours per day and per week
    Object.values(groupedLogs).forEach((employee) => {
      Object.entries(employee.weeks).forEach(([week, days]) => {
        let weekTotal = 0;
        Object.entries(days).forEach(([date, logs]) => {
          if (logs.in && logs.out) {
            let workedHours = moment
              .utc(logs.out)
              .diff(moment.utc(logs.in), "hours", true);
            if (workedHours >= 9) workedHours -= 1; // Deduct lunch break
            employee.weeks[week][date] = workedHours.toFixed(2);
            weekTotal += workedHours;
          }
        });
        employee.weeks[week].total = weekTotal.toFixed(2);
        employee.total += weekTotal;
      });
      employee.total = employee.total.toFixed(2);
    });

    // Format results to match Excel structure
    const results = Object.values(groupedLogs).map((employee) => ({
      matricule: employee.matricule,
      firstname: employee.firstname,
      lastname: employee.lastname,
      W1: employee.weeks.W1,
      W2: employee.weeks.W2,
      W3: employee.weeks.W3,
      W4: employee.weeks.W4,
      total: employee.total,
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error("Error calculating working hours by month:", error);
    res.status(500).json({ message: "Error processing request." });
  }
};
const getSummarizedWorkingHoursByMonthExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Please provide valid start and end dates." });
    }

    const start = moment(startDate, "YYYY-MM-DD").startOf("day");
    const end = moment(endDate, "YYYY-MM-DD").endOf("day");

    if (!start.isValid() || !end.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    let logs = await getPointingLogs({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified period." });
    }

    const groupedLogs = {};

    logs.forEach((log) => {
      const logDate = moment(log.log_time);
      const formattedDate = logDate.format("dddd DD-MM-YYYY"); // Example: 'Monday 25-11-2024'
      const employeeKey = log.employee_id;

      // Determine the week number
      const monthStart = moment(startDate).startOf("month");
      const weekNumber = Math.ceil(logDate.diff(monthStart, "days") / 7);
      const weekLabel = `W${weekNumber}`;

      if (!groupedLogs[employeeKey]) {
        groupedLogs[employeeKey] = {
          matricule: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          weeks: {
            W1: {},
            W2: {},
            W3: {},
            W4: {},
          },
          total: 0,
        };
      }

      const weekData = groupedLogs[employeeKey].weeks[weekLabel];
      if (!weekData) return;

      if (!weekData[formattedDate]) {
        weekData[formattedDate] = { in: null, out: null };
      }

      if (log.status.toLowerCase() === "in") {
        if (
          !weekData[formattedDate].in ||
          logDate.isBefore(weekData[formattedDate].in)
        ) {
          weekData[formattedDate].in = logDate;
        }
      } else if (log.status.toLowerCase() === "out") {
        if (
          !weekData[formattedDate].out ||
          logDate.isAfter(weekData[formattedDate].out)
        ) {
          weekData[formattedDate].out = logDate;
        }
      }
    });

    // Calculate working hours per day and week
    Object.values(groupedLogs).forEach((employee) => {
      Object.entries(employee.weeks).forEach(([week, days]) => {
        let weekTotal = 0;
        Object.entries(days).forEach(([date, logs]) => {
          if (logs.in && logs.out) {
            let workedHours = logs.out.diff(logs.in, "hours", true);
            if (workedHours >= 9) workedHours -= 1; // Deduct lunch break
            employee.weeks[week][date] = workedHours.toFixed(2);
            weekTotal += workedHours;
          }
        });
        employee.weeks[week].total = weekTotal.toFixed(2);
        employee.total += weekTotal;
      });
      employee.total = employee.total.toFixed(2);
    });

    // Create an Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Working Hours");

    // Define headers
    const headers = [
      "Matricule",
      "Firstname",
      "Lastname",
      "W1",
      "W2",
      "W3",
      "W4",
      "Total",
    ];
    worksheet.addRow(headers);

    // Populate data
    Object.values(groupedLogs).forEach((employee) => {
      worksheet.addRow([
        employee.matricule,
        employee.firstname,
        employee.lastname,
        employee.weeks.W1.total || "0",
        employee.weeks.W2.total || "0",
        employee.weeks.W3.total || "0",
        employee.weeks.W4.total || "0",
        employee.total,
      ]);
    });

    // Apply styling
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Write and send the file
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=working_hours.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error("Error calculating working hours by month:", error);
    res.status(500).json({ message: "Error processing request." });
  }
};
// Calculate for the file Horaire
const insertAttendance = async (req, res) => {
  try {
    const query = `
          INSERT INTO pointage_finale (
              employee_id, date, start_time, end_time, arrival_time, departure_time,
              working_hours, working_hours_decimal, department, heure_min, heure_max
          )
          SELECT 
              p.employee_id, 
              DATE(p.log_time) AS date, 
              '08:00:00'::TIME AS start_time,
              '17:00:00'::TIME AS end_time,
              MIN(CASE WHEN p.status = 'IN' THEN p.log_time END)::TIME AS arrival_time,
              MAX(CASE WHEN p.status = 'OUT' THEN p.log_time END)::TIME AS departure_time,
              (MAX(CASE WHEN p.status = 'OUT' THEN p.log_time END) 
               - MIN(CASE WHEN p.status = 'IN' THEN p.log_time END)) AS working_hours,
              (EXTRACT(EPOCH FROM 
                  (MAX(CASE WHEN p.status = 'OUT' THEN p.log_time END) 
                   - MIN(CASE WHEN p.status = 'IN' THEN p.log_time END))
              ) / 3600)::NUMERIC(5,2) AS working_hours_decimal,
              (EXTRACT(EPOCH FROM (MAX(p.logtime::TIME) - MIN(p.logtime::TIME))) / 3600) - 1 AS motif, -- Simply subtract 1 hour for lunch
              d.name AS department,
              MIN(CASE WHEN p.status = 'IN' THEN p.log_time END)::TIME AS heure_min,
              MAX(CASE WHEN p.status = 'OUT' THEN p.log_time END)::TIME AS heure_max
          FROM 
              pointing p
          JOIN 
              users u ON p.employee_id = u.id
          JOIN 
              departments d ON u.department_id = d.id
          GROUP BY 
              p.employee_id, DATE(p.log_time), d.name;
      `;
    await pool.query(query);
    res
      .status(201)
      .json({ message: "Attendance records inserted successfully" });
  } catch (error) {
    console.error("Error inserting attendance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const getAttendance = async (req, res) => {
  try {
    const { employee_id, date } = req.query;
    let query = "SELECT * FROM pointage_finale WHERE 1=1";
    let values = [];

    if (employee_id) {
      query += ` AND employee_id = $${values.length + 1}`;
      values.push(employee_id);
    }
    if (date) {
      query += ` AND date = $${values.length + 1}`;
      values.push(date);
    }

    query += " ORDER BY date ASC"; // Order by date ascending

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const query = `
      SELECT pf.*, u.firstname, u.lastname 
      FROM pointage_finale pf
      JOIN users u ON pf.employee_id = u.id
      WHERE pf.date = $1
      ORDER BY pf.date ASC
    `;
    const result = await pool.query(query, [date]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance by date:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const getAllAttendance = async (req, res) => {
  try {
    const { employee_id, date } = req.query;
    let query = `
      SELECT pointage_finale.*, users.firstname, users.lastname
      FROM pointage_finale
      LEFT JOIN users ON pointage_finale.employee_id = users.id
    `;
    let values = [];
    let conditions = [];

    if (employee_id) {
      conditions.push(`pointage_finale.employee_id = $${values.length + 1}`);
      values.push(employee_id);
    }
    if (date) {
      conditions.push(`pointage_finale.date = $${values.length + 1}`);
      values.push(date);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY pointage_finale.date ASC"; // Order by date ascending

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const updateMotifColumn = async (req, res) => {
  try {
    const query = `
      UPDATE pointage_finale
      SET motif = (
          CASE 
              WHEN working_hours IS NOT NULL THEN 
                  ROUND((EXTRACT(EPOCH FROM working_hours) / 3600) - 1, 2)
              ELSE NULL
          END
      )
      WHERE motif IS NULL;
    `;

    await pool.query(query);
    res.status(200).json({ message: "Motif values updated successfully" });
  } catch (error) {
    console.error("Error updating motif column:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const getAttendanceByEmployeeId = async (req, res) => {
  try {
    const { employee_id } = req.query;
    if (!employee_id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const query = `
      SELECT pf.*, u.firstname, u.lastname 
      FROM pointage_finale pf
      JOIN users u ON pf.employee_id = u.id
      WHERE pf.employee_id = $1
      ORDER BY pf.date ASC
    `;
    const result = await pool.query(query, [employee_id]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance by employee ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const getAttendanceByEmployeeName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: "Employee name is required" });
    }

    const query = `
      SELECT pf.*, u.firstname, u.lastname 
      FROM pointage_finale pf
      JOIN users u ON pf.employee_id = u.id
      WHERE LOWER(u.firstname || ' ' || u.lastname) LIKE LOWER($1)
      ORDER BY pf.date ASC
    `;
    const result = await pool.query(query, [`%${name}%`]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance by employee name:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const exportAttendanceExcel = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pointage_finale ORDER BY date ASC"
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Data");

    // Set column headers dynamically based on the table columns
    const columns = Object.keys(result.rows[0]); // Get all column names
    worksheet.columns = columns.map((column) => ({
      header: column.replace(/_/g, " ").toUpperCase(), // Formatting headers for better readability
      key: column,
      width: 20, // Set width for better presentation
    }));

    // Apply styles to the header row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } }; // Make headers bold with white font color
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4F81BD" },
    }; // Header background color
    worksheet.getRow(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    }; // Center align headers

    // Apply alternating row colors for better readability
    result.rows.forEach((row, index) => {
      const rowIndex = worksheet.addRow(row);

      // Apply alternating colors for rows
      const rowColor = index % 2 === 0 ? "E6F0F7" : "FFFFFF";
      rowIndex.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" }; // Center align cells
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      rowIndex.eachCell((cell, colNumber) => {
        if (colNumber === 1) {
          cell.font = { bold: true }; // Make employee ID bold for emphasis
        }
      });

      rowIndex.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowColor },
      };
    });

    // Set the header row height for better visibility
    worksheet.getRow(1).height = 25;

    // Set the overall row height for a better design
    worksheet.eachRow((row, rowNumber) => {
      row.height = 25;
    });

    // Set content type and file name for the response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance.xlsx"
    );

    // Write the Excel file to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting Excel:", error);
    res.status(500).json({ error: "Failed to export Excel" });
  }
};
// Get all Pointeuses
const getPointeuses = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pointeuses");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching pointeuses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Function to delete a pointeuse
const deletePointeuse = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM pointeuses WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pointeuse not found" });
    }
    res.json({
      message: "Pointeuse deleted successfully",
      deletedPointeuse: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting pointeuse:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const updatePointeuse = async (req, res) => {
  const { id } = req.params;
  const { device_name, device_ip } = req.body; // Fields that can be updated

  try {
    const result = await pool.query(
      "UPDATE pointeuses SET device_name = $1, device_ip = $2 WHERE id = $3 RETURNING *",
      [device_name, device_ip, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pointeuse not found" });
    }

    res.json({
      message: "Pointeuse updated successfully",
      updatedPointeuse: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating pointeuse:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const getEmployeesByPointeuse = async (req, res) => {
  const { id } = req.params; // Pointeuse ID

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE pointeuse_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No employees found for this Pointeuse" });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching employees by Pointeuse:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const syncDeviceLogsU = async (req, res) => {
  const device = new Zkteco("192.168.1.40", 4370, 5200, 5000);

  const normalizeUserId = (deviceUserId) => {
    const id = parseInt(deviceUserId, 10);
    return id >= 40000 ? id % 10000 : id; // Remove the "400" prefix if it exists
  };

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

    // Group logs by employee and date
    const logsByEmployee = {};

    for (const log of logsArray) {
      try {
        const employeeId = normalizeUserId(log.user_id);
        const rawTimestamp = log.record_time;
        // Parse timestamp
        const logTime = moment
          .tz(rawTimestamp, "ddd MMM DD YYYY HH:mm:ss [GMT]Z", "Africa/Tunis")
          .utc()
          .toDate();

        if (!logTime || isNaN(logTime.getTime())) {
          throw new Error(`Invalid timestamp format: ${rawTimestamp}`);
        }

        const logDate = moment(logTime).format("YYYY-MM-DD");

        if (!logsByEmployee[employeeId]) logsByEmployee[employeeId] = {};
        if (!logsByEmployee[employeeId][logDate])
          logsByEmployee[employeeId][logDate] = [];

        logsByEmployee[employeeId][logDate].push({ logTime, rawTimestamp });
      } catch (err) {
        results.errors.push({ log, error: err.message });
      }
    }

    // Process logs for each employee per day
    for (const [employeeId, logsByDate] of Object.entries(logsByEmployee)) {
      for (const [date, logs] of Object.entries(logsByDate)) {
        logs.sort((a, b) => new Date(a.logTime) - new Date(b.logTime)); // Sort logs chronologically

        let firstLog = logs[0]; // First log of the day
        let lastLog = logs[logs.length - 1]; // Last log of the day

        // Determine correct IN/OUT status
        let statusFirst = "IN";
        let statusLast = "OUT";

        // If the first log is at the end of the day (afternoon/evening), assume it's OUT
        if (moment(firstLog.logTime).hour() >= 12) {
          statusFirst = "OUT";
        }

        // Check if the exact log already exists
        const existsQuery = `
          SELECT COUNT(*) FROM pointing WHERE employee_id = $1 AND log_time = $2
        `;
        const existsValues1 = [employeeId, firstLog.logTime];
        const existsValues2 = [employeeId, lastLog.logTime];

        const [existsResult1, existsResult2] = await Promise.all([
          pool.query(existsQuery, existsValues1),
          pool.query(existsQuery, existsValues2),
        ]);

        if (parseInt(existsResult1.rows[0].count) === 0) {
          const insertQuery = `INSERT INTO pointing (employee_id, log_time, status) VALUES ($1, $2, $3)`;
          await pool.query(insertQuery, [
            employeeId,
            firstLog.logTime,
            statusFirst,
          ]);
          results.added++;
        } else {
          results.skipped++;
        }

        if (
          firstLog.logTime !== lastLog.logTime &&
          parseInt(existsResult2.rows[0].count) === 0
        ) {
          const insertQuery = `INSERT INTO pointing (employee_id, log_time, status) VALUES ($1, $2, $3)`;
          await pool.query(insertQuery, [
            employeeId,
            lastLog.logTime,
            statusLast,
          ]);
          results.added++;
        } else {
          results.skipped++;
        }
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
const getSummarizedWorkingHoursupdate = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Please provide valid dates." });
    }

    const startDate = moment(fromDate).startOf("day");
    const endDate = moment(toDate).endOf("day");

    // Fetch logs within the date range
    const logs = await getPointingLogs({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified dates." });
    }

    // Group logs by employee and date
    const groupedLogs = {};
    logs.forEach((log) => {
      const key = `${log.employee_id}-${moment(log.log_time).format(
        "YYYY-MM-DD"
      )}`;
      if (!groupedLogs[key]) {
        groupedLogs[key] = {
          employee_id: log.employee_id,
          firstname: log.firstname,
          lastname: log.lastname,
          date: moment(log.log_time).format("YYYY-MM-DD"),
          weekNumber: moment(log.log_time).isoWeek(),
          in: null,
          out: null,
        };
      }
      if (log.status.toLowerCase() === "in") {
        groupedLogs[key].in = groupedLogs[key].in
          ? moment.min(moment(groupedLogs[key].in), moment(log.log_time))
          : moment(log.log_time);
      } else if (log.status.toLowerCase() === "out") {
        groupedLogs[key].out = groupedLogs[key].out
          ? moment.max(moment(groupedLogs[key].out), moment(log.log_time))
          : moment(log.log_time);
      }
    });

    // Calculate daily and weekly working hours per employee
    const summarizedData = {};
    Object.values(groupedLogs).forEach((entry) => {
      const checkIn = entry.in;
      const checkOut = entry.out;
      let dailyHours = 0;

      if (checkIn && checkOut) {
        const workedHours = checkOut.diff(checkIn, "hours", true);
        dailyHours = workedHours >= 9 ? workedHours - 1 : workedHours; // Deduct 1h if >=9h
      }

      if (!summarizedData[entry.employee_id]) {
        summarizedData[entry.employee_id] = {
          matricule: entry.employee_id,
          firstname: entry.firstname,
          lastname: entry.lastname,
          duration: `From ${startDate.format("YYYY-MM-DD")} To ${endDate.format(
            "YYYY-MM-DD"
          )}`,
          totalWorkingHours: 0,
          dailyHours: [],
          weeklyHours: {},
        };
      }

      summarizedData[entry.employee_id].totalWorkingHours += dailyHours;
      summarizedData[entry.employee_id].dailyHours.push({
        date: entry.date,
        weekNumber: entry.weekNumber,
        hoursWorked: dailyHours.toFixed(2),
      });

      if (!summarizedData[entry.employee_id].weeklyHours[entry.weekNumber]) {
        summarizedData[entry.employee_id].weeklyHours[entry.weekNumber] = 0;
      }
      summarizedData[entry.employee_id].weeklyHours[entry.weekNumber] +=
        dailyHours;
    });

    // Transform weekly hours into an array
    Object.values(summarizedData).forEach((employee) => {
      employee.weeklyHours = Object.entries(employee.weeklyHours).map(
        ([week, hours]) => ({
          weekNumber: week,
          hoursWorked: hours.toFixed(2),
        })
      );
    });

    // Apply caps based on the period type
    const results = Object.values(summarizedData).map((employee) => {
      let finalHours = employee.totalWorkingHours;
      let isCapped = false;

      // Monthly cap (173.33h)
      if (finalHours > 173.33) {
        finalHours = 173.33;
        isCapped = true;
      }

      return {
        matricule: employee.matricule,
        firstname: employee.firstname,
        lastname: employee.lastname,
        duration: employee.duration,
        workingHours: finalHours.toFixed(2),
        isCapped,
        dailyHours: employee.dailyHours,
        weeklyHours: employee.weeklyHours, // Correct weekly split
      };
    });

    res.status(200).json({
      results,
      totalCappedHours: 173.33,
    });
  } catch (error) {
    console.error("Error calculating working hours:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
const generateExcelFileWorkingHoursupdate = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Please provide valid dates." });
    }

    // ✅ Call getSummarizedWorkingHoursupdate **without passing res**
    const summarizedData = await getSummarizedWorkingHours(req.query);

    if (!summarizedData || !summarizedData.results) {
      return res
        .status(404)
        .json({ message: "No data found for the given dates." });
    }

    const results = summarizedData.results;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Working Hours Report");

    // Add title
    worksheet.mergeCells("A1:H1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `Working Hours Summary from ${fromDate} to ${toDate}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };

    // Define headers
    worksheet.columns = [
      { header: "Matricule", key: "matricule", width: 15 },
      { header: "First Name", key: "firstname", width: 15 },
      { header: "Last Name", key: "lastname", width: 15 },
      { header: "Duration", key: "duration", width: 20 },
      { header: "Daily Hours", key: "dailyHours", width: 25 },
      { header: "Weekly Hours", key: "weeklyHours", width: 25 },
      { header: "Total Working Hours", key: "workingHours", width: 20 },
      { header: "Capped?", key: "isCapped", width: 10 },
    ];
    // Add data
    results.forEach((employee) => {
      worksheet.addRow({
        matricule: employee.matricule,
        firstname: employee.firstname,
        lastname: employee.lastname,
        duration: employee.duration,
        dailyHours: employee.dailyHours
          .map((day) => `${day.date}: ${day.hoursWorked} hours`)
          .join(", "),
        weeklyHours: employee.weeklyHours
          .map((week) => `Week ${week.weekNumber}: ${week.hoursWorked} hours`)
          .join(", "),
        workingHours: employee.workingHours,
        isCapped: employee.isCapped ? "Yes" : "No",
      });
    });

    // Apply styles
    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(2).alignment = { horizontal: "center" };

    // ✅ Ensure headers are set before writing the file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=WorkingHours_${fromDate}_to_${toDate}.xlsx`
    );

    // ✅ Stream the file properly
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel file:", error);

    // ✅ Only send error response if headers haven't been sent
    if (!res.headersSent) {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
};
// Similar changes would be made to the exportWorkingHoursToExcel function
// const checkAndNotifyImpairPointing = async () => {
//   try {
//     // Get yesterday's date (J-1)
//     const yesterday = new Date();
//     yesterday.setDate(yesterday.getDate() - 1);
//     const formattedDate = yesterday.toISOString().split("T")[0];

//     console.log(`🔍 Checking impair pointing for: ${formattedDate}`);

//     // Fetch all employees
//     const employees = await pool.query(
//       "SELECT id, email, firstname, lastname FROM users"
//     );

//     for (const employee of employees.rows) {
//       const { id: employeeId, email, firstname, lastname } = employee;

//       // Skip if the email is fethi.chaouachi@avocarbon.com
//       if (email === "fethi.chaouachi@avocarbon.com") {
//         console.log(`🚫 Skipping notification for ${email}`);
//         continue; // Skip this iteration and move to the next employee
//       }

//       // Get all badge logs for the employee on J-1
//       const result = await pool.query(
//         `SELECT id, log_time, status FROM pointing
//          WHERE employee_id = $1
//          AND DATE(log_time) = $2`,
//         [employeeId, formattedDate]
//       );

//       const badgeLogs = result.rows;
//       const inLogs = badgeLogs.filter((log) => log.status === "IN");
//       const outLogs = badgeLogs.filter((log) => log.status === "OUT");

//       // If the employee didn't badge both IN & OUT, flag as impair
//       if (inLogs.length === 0 || outLogs.length === 0) {
//         await pool.query(
//           `UPDATE pointing
//            SET status = 'IMPAIR'
//            WHERE employee_id = $1 AND DATE(log_time) = $2`,
//           [employeeId, formattedDate]
//         );

//         // Send notification email
//         await sendEmailNotification(
//           employeeId,
//           "⚠ Impair Pointing Detected",
//           `Dear ${firstname} ${lastname},\n\n
//           We detected an anomaly in your badge logs for ${formattedDate}.
//           Please verify your attendance and request a correction if necessary.\n\n
//           Best regards,\nHR Team`
//         );

//         console.log(`📧 Notification sent to ${email}`);
//       }
//     }

//     console.log("✅ Daily impair pointing check completed.");
//   } catch (error) {
//     console.error("❌ Error checking impair pointing:", error);
//   }
// };
// const updateImpairPointing = async () => {};
// // Schedule the function to run **every day at 8:00 AM**
// cron.schedule("0 8 * * 1-5", () => {
//   console.log("⏳ Running daily impair pointing check (Weekdays Only).....");
//   checkAndNotifyImpairPointing();
// });
module.exports = {
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
  exportWorkingHoursToExcel,
  WorkingHoursToExcel,
  getSummarizedWorkingHoursByWeek,
  getSummarizedWorkingHoursByMonth,
  getSummarizedWorkingHoursByMonthExcel,
  getAttendance,
  getAttendanceByDate,
  insertAttendance,
  getAllAttendance,
  getAttendanceByEmployeeId,
  getAttendanceByEmployeeName,
  exportAttendanceExcel,
  updateMotifColumn,
  getPointeuses,
  deletePointeuse,
  updatePointeuse,
  getEmployeesByPointeuse,
  syncDeviceLogsU,
  getSummarizedWorkingHoursupdate,
  // checkAndNotifyImpairPointing,
  generateExcelFileWorkingHoursupdate,
  fetchPointingLogsFilter,
};
