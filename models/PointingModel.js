const pool = require("../config/database");

// Function to insert logs into the database
const insertPointingLog = async (employeeId, logTime, status) => {
  try {
    const query = `
        INSERT INTO pointing (employee_id, log_time, status)
        VALUES ($1, $2, $3)
      `;
    const values = [employeeId, logTime, status];
    await pool.query(query, values);
  } catch (err) {
    console.error("Error inserting pointing log:", err.message);
    throw err;
  }
};
// Function to retrieve logs from the database
const getPointingLogs = async ({ employeeId, startDate, endDate }) => {
  const filters = [];
  const params = [];
  let paramIndex = 1;

  if (employeeId) {
    filters.push(`employee_id = $${paramIndex}`);
    params.push(employeeId);
    paramIndex++;
  }
  if (startDate) {
    filters.push(`log_time >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    filters.push(`log_time <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const query = `
    SELECT 
      p.*, 
      u.firstname, 
      u.lastname,
      CASE 
        WHEN p.status = 'IN' AND (DATE_PART('hour', p.log_time) > 8 OR (DATE_PART('hour', p.log_time) = 8 AND DATE_PART('minute', p.log_time) > 30))
        THEN 'Late' 
        ELSE 'On Time' 
      END AS late_status
    FROM pointing p
    INNER JOIN users u ON p.employee_id = u.id
    ${whereClause}
    ORDER BY p.log_time DESC;
  `;

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Database error in getPointingLogs:", error);
    throw new Error("Failed to fetch pointing logs from the database.");
  }
};

const updatePointingStatuses = async () => {
  const query = `
    WITH time_comparison AS (
        SELECT 
            employee_id,
            log_time::DATE AS date,  
            MIN(log_time) AS in_time,  
            MAX(log_time) AS out_time  
        FROM pointing
        GROUP BY employee_id, log_time::DATE  
    )
    UPDATE pointing p
    SET status = CASE 
        WHEN p.log_time = t.in_time THEN 'IN'
        WHEN p.log_time = t.out_time THEN 'OUT'
        ELSE p.status  -- Keep existing status for other records
    END
    FROM time_comparison t
    WHERE p.employee_id = t.employee_id
    AND p.log_time::DATE = t.date;
    `;
  try {
    await pool.query(query);
    console.log("Statuses updated successfully.");
  } catch (err) {
    console.error("Error updating statuses: ", err);
  }
};
const getLogs = async (employeeId, period, date) => {
  try {
    let query;
    let params = [employeeId];

    if (period === "day") {
      query = `
          SELECT *, 
             TO_CHAR(log_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS formatted_log_time
          FROM pointing
          WHERE employee_id = $1
            AND DATE(log_time AT TIME ZONE 'UTC') = $2
          ORDER BY log_time DESC
        `;
      params.push(date);
    } else if (period === "week") {
      const [year, week] = date.split("-W");
      if (!year || !week) {
        throw new Error(
          "Invalid date format for week period. Expected format: YYYY-WXX."
        );
      }
      query = `
          SELECT *, 
                 TO_CHAR(log_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS formatted_log_time
          FROM pointing
          WHERE employee_id = $1
            AND EXTRACT(ISO_WEEK FROM log_time::TIMESTAMP) = $2
            AND EXTRACT(YEAR FROM log_time::TIMESTAMP) = $3
          ORDER BY log_time DESC
        `;
      params.push(week, year);
    } else if (period === "month") {
      const [year, month] = date.split("-");
      if (!year || !month) {
        throw new Error(
          "Invalid date format for month period. Expected format: YYYY-MM."
        );
      }
      query = `
          SELECT *, 
                 TO_CHAR(log_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS formatted_log_time
          FROM pointing
          WHERE employee_id = $1
            AND EXTRACT(MONTH FROM log_time AT TIME ZONE 'UTC') = $2
            AND EXTRACT(YEAR FROM log_time AT TIME ZONE 'UTC') = $3
          ORDER BY log_time DESC
        `;
      params.push(month, year);
    } else {
      throw new Error(
        "Invalid period. Accepted values are 'day', 'week', or 'month'."
      );
    }

    // Execute the query
    const result = await pool.query(query, params);

    // Map the result to include formatted log_time only
    return result.rows.map((row) => ({
      ...row,
      log_time: row.formatted_log_time, // Override log_time with the formatted version
    }));
  } catch (error) {
    console.error("Database error in getLogs:", error.message);
    throw new Error(`Failed to retrieve logs: ${error.message}`);
  }
};

const getLogsByEmployeeId = async (employeeId) => {
  try {
    const query = `
        SELECT *, 
               TO_CHAR(log_time AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS log_date,
               TO_CHAR(log_time AT TIME ZONE 'UTC', 'HH24:MI:SS') AS log_hour
        FROM pointing
        WHERE employee_id = $1
        ORDER BY log_time DESC
      `;
    const result = await pool.query(query, [employeeId]);

    return result.rows.map((row) => ({
      ...row,
      log_date: row.log_date, // Date part
      log_hour: row.log_hour, // Hour part
    }));
  } catch (error) {
    console.error("Database error in getLogsByEmployeeId:", error.message);
    throw new Error(`Failed to retrieve logs: ${error.message}`);
  }
};

const calculateWorkingHoursForDay = async (employeeId, date) => {
  const query = `
      WITH time_comparison AS (
        SELECT 
          employee_id,
          log_time::DATE AS date,
          MIN(log_time) AS in_time,
          MAX(log_time) AS out_time
        FROM pointing
        WHERE employee_id = $1 AND log_time::DATE = $2
        GROUP BY employee_id, log_time::DATE
      )
      SELECT 
        t.employee_id,
        GREATEST(EXTRACT(EPOCH FROM (t.out_time - t.in_time)) / 3600 - 1, 0) AS total_hours
      FROM time_comparison t
    `;
  const result = await pool.query(query, [employeeId, date]);
  return result.rows[0]; // Return total hours worked on the specific date
};
const getWorkingHoursSummary = async ({ employeeId, startDate, endDate }) => {
  const query = `
      WITH time_comparison AS (
        SELECT 
          employee_id,
          log_time::DATE AS date,
          MIN(log_time) AS in_time,
          MAX(log_time) AS out_time
        FROM pointing
        WHERE employee_id = $1 AND log_time::DATE BETWEEN $2 AND $3
        GROUP BY employee_id, log_time::DATE
      )
      SELECT 
        t.employee_id,
        SUM(EXTRACT(EPOCH FROM (t.out_time - t.in_time)) / 3600) AS total_hours
      FROM time_comparison t
      GROUP BY t.employee_id;
    `;
  const result = await pool.query(query, [employeeId, startDate, endDate]);
  return result.rows[0]; // Return total hours worked within the date range
};
// pointing api's for rh
const getAllDevices = async () => {
  const query = `SELECT * FROM pointeuses`;
  const result = await pool.query(query);
  return result.rows;
};
const getDeviceById = async (id) => {
  const query = "SELECT * FROM pointeuses WHERE id = $1";
  const result = await pool.query(query, [id]);
  return result.rows[0];
};
const addDevice = async (deviceIp, deviceName = "Unknown") => {
  const query =
    "INSERT INTO pointeuses (device_name, device_ip) VALUES ($1, $2) RETURNING *";
  try {
    const result = await pool.query(query, [deviceName, deviceIp]);
    return result.rows[0]; // Return the added device
  } catch (error) {
    // Log the detailed error
    console.error("Database Error in addDevice:", error.message);
    throw new Error("Database query failed");
  }
};
const fetchLogsByPlantManager = async (plantManagerId) => {
  const query = `
      SELECT pointing.*, users.email, users.role, users.profile_photo 
      FROM pointing 
      JOIN users ON pointing.employee_id = users.id
      WHERE users.plant_manager_id = $1
  `;

  const { rows } = await db.query(query, [plantManagerId]);
  return rows;
};
const getLogsByPointeuse = async (pointeuseId) => {
  const query = `
    SELECT pointing.*, users.email, users.role, pointeuses.device_name 
    FROM pointing
    JOIN users ON pointing.employee_id = users.id
    JOIN pointeuses ON pointing.pointeuse_id = pointeuses.id
    WHERE pointeuses.id = $1
  `;
  const result = await pool.query(query, [pointeuseId]);
  return result.rows;
};

module.exports = {
  insertPointingLog,
  getPointingLogs,
  getLogsByEmployeeId,
  updatePointingStatuses,
  getLogs,
  calculateWorkingHoursForDay,
  getWorkingHoursSummary,
  getAllDevices,
  getDeviceById,
  addDevice,
  fetchLogsByPlantManager,
  getLogsByPointeuse,
};
