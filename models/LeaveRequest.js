const pool = require("../config/database");

// Check if employee exists
const employeeExists = async (employeeId) => {
  try {
    const res = await pool.query("SELECT 1 FROM users WHERE id = $1", [
      employeeId,
    ]);
    return res.rowCount > 0;
  } catch (error) {
    throw new Error(`Error checking employee existence: ${error.message}`);
  }
};
// Create a new leave request
const createLeaveRequest = async (data) => {
  const {
    employeeId,
    phone,
    leaveType,
    requestDate,
    startDate,
    endDate,
    justification,
    justificationFile,
    status = "Pending",
    manager_approval_status = "Pending",
    plant_manager_approval_status = "Pending",
    ceo_approval_status = "Pending",
  } = data;

  try {
    // Check if the employee exists
    const employeeRes = await pool.query("SELECT * FROM users WHERE id = $1", [
      employeeId,
    ]);
    if (employeeRes.rows.length === 0) {
      throw new Error(`Employee with ID ${employeeId} does not exist.`);
    }
    const employee = employeeRes.rows[0];
    let currentApproverId, nextApproverId;
    if (employee.manager_id) {
      currentApproverId = employee.manager_id;
      nextApproverId = employee.plant_manager_id;
    } else if (employee.plant_manager_id) {
      currentApproverId = employee.plant_manager_id;
      nextApproverId = null;
    } else {
      currentApproverId = employee.ceo_id;
      nextApproverId = null;
    }

    // Insert the leave request
    const res = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, request_date, start_date, end_date, justification, justification_file, status, phone, current_approver_id, next_approver_id, manager_approval_status, plant_manager_approval_status, ceo_approval_status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
     RETURNING *`,
      [
        employeeId,
        leaveType,
        requestDate,
        startDate,
        endDate,
        justification,
        justificationFile,
        status,
        phone,
        currentApproverId,
        nextApproverId,
        manager_approval_status,
        plant_manager_approval_status,
        ceo_approval_status,
      ]
    );

    return res.rows[0];
  } catch (error) {
    throw new Error(`Error creating leave request: ${error.message}`);
  }
};

// Fetch all leave requests with employee details
const getLeaveRequests = async (approverId) => {
  try {
    const query = `
      SELECT 
        lr.id AS requestId,
        lr.leave_type AS leaveType,
        lr.start_date AS startDate,
        lr.end_date AS endDate,
        lr.phone,
        lr.justification,
        lr.justification_file AS justificationFile,
        lr.status,
        lr.created_at AS requestDate,
        u.id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department,
        lr.current_approver_id AS currentApproverId,
        lr.next_approver_id AS nextApproverId
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE lr.current_approver_id = $1 OR lr.next_approver_id = $1
      ORDER BY lr.created_at DESC;
    `;
    const res = await pool.query(query, [approverId]);
    return res.rows;
  } catch (error) {
    throw new Error(`Error fetching leave requests: ${error.message}`);
  }
};
const getAllLeaveRequests = async (plant) => {
  try {
    const query = `
      SELECT 
        lr.id AS requestId,
        lr.leave_type AS leaveType,
        lr.start_date AS startDate,
        lr.end_date AS endDate,
        lr.phone,
        lr.justification,
        lr.justification_file AS justificationFile,
        lr.status,
        lr.created_at AS requestDate,
        u.id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department,
        u.plant_connection AS plant
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE u.plant_connection = $1 -- Filter by plant
      ORDER BY lr.created_at DESC;
    `;

    const res = await pool.query(query, [plant]); // Pass plant as a parameter
    return res.rows;
  } catch (error) {
    throw new Error(`Error fetching leave requests: ${error.message}`);
  }
};

// Fetch a leave request by ID
const getLeaveRequestById = async (id) => {
  try {
    const res = await pool.query("SELECT * FROM leave_requests WHERE id = $1", [
      id,
    ]);
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error fetching leave request: ${error.message}`);
  }
};
// Fetch leave requests by employee ID
const getLeaveRequestsByEmployeeId = async (employeeId) => {
  try {
    const res = await pool.query(
      "SELECT * FROM leave_requests WHERE employee_id = $1",
      [employeeId]
    );
    return res.rows;
  } catch (error) {
    throw new Error(
      `Error fetching leave requests by employee ID: ${error.message}`
    );
  }
};
const updateLeaveRequest = async (id, data) => {
  const {
    status,
    manager_approval_status,
    plant_manager_approval_status,
    ceo_approval_status,
    current_approver_id,
  } = data;

  try {
    const query = `
      UPDATE leave_requests
      SET
        status = $1,
        manager_approval_status = $2,
        plant_manager_approval_status = $3,
        ceo_approval_status = $4,
        current_approver_id = $5
      WHERE id = $6
      RETURNING *;
    `;
    const values = [
      status,
      manager_approval_status,
      plant_manager_approval_status,
      ceo_approval_status,
      current_approver_id,
      id,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error updating leave request: ${error.message}`);
  }
};

// Delete a leave request by ID.
const deleteLeaveRequest = async (id) => {
  try {
    const res = await pool.query(
      "DELETE FROM leave_requests WHERE id = $1 RETURNING *",
      [id]
    );
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error deleting leave request: ${error.message}`);
  }
};
const calculateLeavePercentage = async (employeeId) => {
  try {
    // Fetch total allocated leave days for the employee
    const totalLeaveDaysQuery = `
      SELECT total_leave_days 
      FROM leave_types 
      WHERE employee_id = $1
    `;
    const totalLeaveDaysResult = await pool.query(totalLeaveDaysQuery, [
      employeeId,
    ]);
    const totalLeaveDays = totalLeaveDaysResult.rows[0]?.total_leave_days || 0;

    // Fetch leave requests for the employee
    const leaveRequestsQuery = `
      SELECT start_date, end_date 
      FROM leave_requests 
      WHERE employee_id = $1 AND status = 'Approved'
    `;
    const leaveRequestsResult = await pool.query(leaveRequestsQuery, [
      employeeId,
    ]);
    const leaveRequests = leaveRequestsResult.rows;

    // Calculate total leave days taken
    let totalLeaveTaken = 0;
    leaveRequests.forEach((request) => {
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      const daysTaken =
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include start date
      totalLeaveTaken += daysTaken;
    });

    // Calculate leave percentage
    const leavePercentage =
      totalLeaveDays > 0 ? (totalLeaveTaken / totalLeaveDays) * 100 : 0;

    return {
      totalLeaveDays,
      totalLeaveTaken,
      leavePercentage: leavePercentage.toFixed(2), // Fixed to two decimal places
    };
  } catch (error) {
    throw new Error(`Error calculating leave percentage: ${error.message}`);
  }
};
// Fetch percentage of employees with a lot of leave requests in a given month
const getEmployeesWithHighLeavePercentageByMonth = async (
  month,
  year,
  threshold = 5
) => {
  try {
    // Step 1: Count total number of employees
    const totalEmployeesResult = await pool.query(
      "SELECT COUNT(*) AS total FROM users"
    );
    const totalEmployees = parseInt(totalEmployeesResult.rows[0].total, 10);

    // Step 2: Count employees with more than `threshold` leave requests in the specified month and year
    const highLeaveResult = await pool.query(
      `
      SELECT COUNT(DISTINCT employee_id) AS highLeaveEmployees
      FROM leave_requests
      WHERE EXTRACT(MONTH FROM start_date) = $1 
        AND EXTRACT(YEAR FROM start_date) = $2
        AND status = 'Approved'
      GROUP BY employee_id
      HAVING COUNT(*) > $3
    `,
      [month, year, threshold]
    );

    const highLeaveEmployees = parseInt(
      highLeaveResult.rows[0]?.highleaveemployees || 0,
      10
    );

    // Step 3: Calculate the percentage
    const percentage =
      totalEmployees > 0 ? (highLeaveEmployees / totalEmployees) * 100 : 0;

    return {
      totalEmployees,
      highLeaveEmployees,
      percentage: percentage.toFixed(2), // Rounded to two decimal places
    };
  } catch (error) {
    throw new Error(
      `Error calculating high leave percentage for month: ${error.message}`
    );
  }
};

// Fetch percentage of employees with a lot of leave requests in a year
const getEmployeesWithHighLeavePercentageByYear = async (
  year,
  threshold = 12
) => {
  try {
    // Step 1: Count total number of employees
    const totalEmployeesResult = await pool.query(
      "SELECT COUNT(*) AS total FROM users"
    );
    const totalEmployees = parseInt(totalEmployeesResult.rows[0].total, 10);

    // Step 2: Count employees with more than `threshold` leave requests in the specified year
    const highLeaveResult = await pool.query(
      `
      SELECT COUNT(DISTINCT employee_id) AS highLeaveEmployees
      FROM leave_requests
      WHERE EXTRACT(YEAR FROM start_date) = $1 
        AND status = 'Approved'
      GROUP BY employee_id
      HAVING COUNT(*) > $2
    `,
      [year, threshold]
    );

    const highLeaveEmployees = parseInt(
      highLeaveResult.rows[0]?.highleaveemployees || 0,
      10
    );

    // Step 3: Calculate the percentage
    const percentage =
      totalEmployees > 0 ? (highLeaveEmployees / totalEmployees) * 100 : 0;

    return {
      totalEmployees,
      highLeaveEmployees,
      percentage: percentage.toFixed(2),
    };
  } catch (error) {
    throw new Error(
      `Error calculating high leave percentage for year: ${error.message}`
    );
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  getLeaveRequestsByEmployeeId,
  updateLeaveRequest,
  deleteLeaveRequest,
  getAllLeaveRequests,
  calculateLeavePercentage,
  getEmployeesWithHighLeavePercentageByYear,
  getEmployeesWithHighLeavePercentageByMonth,
};
