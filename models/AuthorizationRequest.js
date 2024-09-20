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

// Create a new authorization request
const createAuthorizationRequest = async (data) => {
  const {
    employeeId,
    phone,
    authorizationDate,
    departureTime,
    returnTime,
    purposeOfAuthorization,
    status = "Pending",
    manager_approval_status = "Pending",
    plant_manager_approval_status = "Pending",
    ceo_approval_status = "Pending", // Default status if not provided
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
      `INSERT INTO authorization_requests (employee_id, phone, authorization_date, departure_time, return_time, purpose_of_authorization, status, current_approver_id, next_approver_id, manager_approval_status, plant_manager_approval_status, ceo_approval_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [
        employeeId,
        phone,
        authorizationDate,
        departureTime,
        returnTime,
        purposeOfAuthorization,
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
    throw new Error(`Error creating authorization request: ${error.message}`);
  }
};

// Fetch all authorization requests with employee details
const getAuthorizationRequests = async (approverId) => {
  try {
    const query = `
      SELECT 
        ar.id AS requestId,
        ar.phone,
        ar.authorization_date AS authorizationDate,
        ar.departure_time AS departureTime,
        ar.return_time AS returnTime,
        ar.purpose_of_authorization AS purposeOfAuthorization,
        ar.status,
        ar.current_approver_id AS currentApproverId,
        ar.next_approver_id AS nextApproverId,
        ar.created_at AS requestDate,
        u.id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department
      FROM authorization_requests ar
      JOIN users u ON ar.employee_id = u.id
      ORDER BY ar.created_at DESC;
    `;
    const res = await pool.query(query, [approverId]);
    return res.rows;
  } catch (error) {
    throw new Error(`Error fetching authorization requests: ${error.message}`);
  }
};

// Fetch an authorization request by ID
const getAuthorizationRequestById = async (id) => {
  try {
    const res = await pool.query(
      "SELECT * FROM authorization_requests WHERE id = $1",
      [id]
    );
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error fetching authorization request: ${error.message}`);
  }
};

// Fetch authorization requests by employee ID
const getAuthorizationRequestsByEmployeeId = async (employeeId) => {
  try {
    const res = await pool.query(
      "SELECT * FROM authorization_requests WHERE employee_id = $1",
      [employeeId]
    );
    return res.rows;
  } catch (error) {
    throw new Error(
      `Error fetching authorization requests by employee ID: ${error.message}`
    );
  }
};

// Update an authorization request by ID
const updateAuthorizationRequest = async (id, data) => {
  const {
    status,
    manager_approval_status,
    plant_manager_approval_status,
    current_approver_id,
  } = data;

  try {
    const query = `
      UPDATE authorization_requests
      SET
        status = $1,
        manager_approval_status = $2,
        plant_manager_approval_status = $3,
        current_approver_id = $4
      WHERE id = $5
      RETURNING *;
    `;
    const values = [
      status,
      manager_approval_status,
      plant_manager_approval_status,
      current_approver_id,
      id,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error updating leave request: ${error.message}`);
  }
};

// Delete an authorization request by ID
const deleteAuthorizationRequest = async (id) => {
  try {
    const res = await pool.query(
      "DELETE FROM authorization_requests WHERE id = $1 RETURNING *",
      [id]
    );
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error deleting authorization request: ${error.message}`);
  }
};

const getAllAuthorizationRequests = async () => {
  try {
    const query = `
      SELECT 
        ar.id AS requestId,
        ar.phone,
        ar.authorization_date AS authorizationDate,
        ar.departure_time AS departureTime,
        ar.return_time AS returnTime,
        ar.purpose_of_authorization AS purposeOfAuthorization,
        ar.status,
        ar.created_at AS requestDate,
        u.id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department
      FROM authorization_requests ar
      JOIN users u ON ar.employee_id = u.id
      ORDER BY ar.created_at DESC;
    `;
    const res = await pool.query(query);
    return res.rows;
  } catch (error) {
    throw new Error(
      `Error fetching all authorization requests: ${error.message}`
    );
  }
};

module.exports = {
  createAuthorizationRequest,
  getAuthorizationRequests,
  getAllAuthorizationRequests,
  getAuthorizationRequestById,
  getAuthorizationRequestsByEmployeeId,
  updateAuthorizationRequest,
  deleteAuthorizationRequest,
};
