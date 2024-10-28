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

// Create a new mission request
const createMissionRequest = async (data) => {
  const {
    employeeId,
    phone,
    startDate,
    endDate,
    missionBudget,
    purposeOfTravel,
    destination,
    departureTime,
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

    const res = await pool.query(
      `INSERT INTO mission_requests (
        employee_id, phone, start_date, end_date, mission_budget, purpose_of_travel, destination, departure_time, status, request_date,current_approver_id, next_approver_id,manager_approval_status, plant_manager_approval_status,ceo_approval_status
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 ,NOW(), $10,$11,$12,$13,$14) 
       RETURNING *`,
      [
        employeeId,
        phone,
        startDate,
        endDate,
        missionBudget,
        purposeOfTravel,
        destination,
        departureTime,
        status,
        currentApproverId,
        nextApproverId,
        manager_approval_status,
        plant_manager_approval_status,
        ceo_approval_status,
      ]
    );
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error creating mission request: ${error.message}`);
  }
};

// Fetch all mission requests with employee details
const getMissionRequests = async (approverId) => {
  try {
    const query = `
      SELECT 
        mr.id AS requestId,
        mr.phone,
        mr.start_date AS startDate,
        mr.end_date AS endDate,
        mr.mission_budget AS missionBudget,
        mr.purpose_of_travel AS purposeOfTravel,
        mr.destination,
        mr.status,
        mr.request_date AS requestDate,
        mr.current_approver_id AS currentApproverId,
        mr.next_approver_id AS nextApproverId,
        u.id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department
      FROM mission_requests mr
      JOIN users u ON mr.employee_id = u.id
      WHERE mr.current_approver_id = $1 OR mr.next_approver_id = $1 
      ORDER BY mr.request_date DESC;
    `;
    const res = await pool.query(query, [approverId]);
    return res.rows;
  } catch (error) {
    throw new Error(`Error fetching mission requests: ${error.message}`);
  }
};

// Fetch a leave request by ID
const getMissionRequestById = async (id) => {
  try {
    const res = await pool.query(
      "SELECT * FROM mission_requests WHERE id = $1",
      [id]
    );
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error fetching mission request: ${error.message}`);
  }
};

// Fetch leave requests by employee ID
const getMissionRequestsByEmployeeId = async (employeeId) => {
  try {
    const res = await pool.query(
      "SELECT * FROM mission_requests WHERE employee_id = $1",
      [employeeId]
    );
    return res.rows;
  } catch (error) {
    throw new Error(
      `Error fetching mission requests by employee ID: ${error.message}`
    );
  }
};

// Update a mission request by ID
const updateMissionRequest = async (id, data) => {
  const {
    status,
    manager_approval_status,
    plant_manager_approval_status,
    ceo_approval_status,
    current_approver_id,
  } = data;

  try {
    const query = `
      UPDATE mission_requests
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
const getAllMissionRequests = async (plant) => {
  try {
    const query = `
      SELECT 
        mr.id AS requestId,
        mr.phone,
        mr.start_date AS startDate,
        mr.end_date AS endDate,
        mr.mission_budget AS missionBudget,
        mr.purpose_of_travel AS purposeOfTravel,
        mr.destination,
        mr.status,
        mr.request_date AS requestDate,
        u.id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department,
        u.plant_connection as plant
      FROM mission_requests mr
      JOIN users u ON mr.employee_id = u.id
      WHERE u.plant_connection = $1
      ORDER BY mr.request_date DESC;
    `;
    const res = await pool.query(query, [plant]);
    return res.rows;
  } catch (error) {
    throw new Error(`Error fetching mission requests: ${error.message}`);
  }
};

// Delete a mission request by ID
const deleteMissionRequest = async (id) => {
  try {
    const res = await pool.query(
      "DELETE FROM mission_requests WHERE id = $1 RETURNING *",
      [id]
    );
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error deleting mission request: ${error.message}`);
  }
};

module.exports = {
  createMissionRequest,
  getMissionRequests,
  getMissionRequestById,
  getMissionRequestsByEmployeeId,
  updateMissionRequest,
  getAllMissionRequests,
  deleteMissionRequest,
};
