const pool = require("../config/database");
const path = require("path");
const fs = require("fs");

// Function to create a new document request
const createDocumentRequest = async (data) => {
  const { employee_id, document_type } = data;

  try {
    // Fetch employee details, including plant connection
    const employeeRes = await pool.query("SELECT * FROM users WHERE id = $1", [
      employee_id,
    ]);

    // Throw error if employee doesn't exist
    if (employeeRes.rows.length === 0) {
      throw new Error(`Employee with ID ${employee_id} does not exist.`);
    }

    const employee = employeeRes.rows[0];

    // Find the HR Manager for the employee's plant_connection
    const hrManagerRes = await pool.query(
      "SELECT * FROM users WHERE plant_connection = $1 AND role = 'HRMANAGER'",
      [employee.plant_connection]
    );

    // Throw error if no HR Manager is found for the employee's plant
    if (hrManagerRes.rows.length === 0) {
      throw new Error(
        `No HR Manager found for the plant: ${employee.plant_connection}`
      );
    }

    const hrManager = hrManagerRes.rows[0];

    // Insert the new document request and assign it to the HR Manager
    const res = await pool.query(
      `INSERT INTO document_requests (employee_id, document_type, hr_manager_id, status) 
       VALUES ($1, $2, $3, 'Pending') 
       RETURNING *`,
      [employee_id, document_type, hrManager.id]
    );

    // Return the newly created document request
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error creating document request: ${error.message}`);
  }
};

// Fetch a document request by ID
const getDocumentRequestById = async (id) => {
  try {
    const res = await pool.query(
      "SELECT * FROM document_requests WHERE id = $1",
      [id]
    );

    // Check if the request was found
    if (res.rows.length === 0) {
      throw new Error(`Document request with ID ${id} does not exist.`);
    }

    return res.rows[0];
  } catch (error) {
    throw new Error(`Error fetching document request: ${error.message}`);
  }
};

// Function to get document requests for an employee
const getDocumentRequestsByEmployee = async (employee_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM document_requests WHERE employee_id = $1",
      [employee_id]
    );
    return result.rows;
  } catch (error) {
    throw new Error(
      `Error fetching employee document requests: ${error.message}`
    );
  }
};

// Function to get document requests for HR Manager
const getDocumentRequestsForHRManager = async (hr_manager_id) => {
  try {
    // Step 1: Get the plant_connection for the HR Manager
    const hrManagerQuery = await pool.query(
      "SELECT plant_connection FROM users WHERE id = $1 AND role = 'HRMANAGER'",
      [hr_manager_id]
    );

    // Check if HR Manager exists and has a plant_connection
    if (hrManagerQuery.rowCount === 0) {
      throw new Error(
        "HR Manager not found or does not have a plant connection."
      );
    }

    const { plant_connection } = hrManagerQuery.rows[0];

    // Step 2: Fetch document requests for employees in the same plant
    const query = `
      SELECT 
        dr.id AS requestId,
        dr.document_type AS documentType,
        dr.status,
        dr.request_date AS requestDate,
        dr.employee_id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department
      FROM document_requests dr
      JOIN users u ON dr.employee_id = u.id
      WHERE u.plant_connection = $1
      ORDER BY dr.created_at DESC;`;

    const res = await pool.query(query, [plant_connection]);
    return res.rows;
  } catch (error) {
    throw new Error(
      `Error fetching document requests for HR Manager: ${error.message}`
    );
  }
};

// Function to get all document requests
const getAllDocumentRequests = async () => {
  try {
    const query = `SELECT 
      dr.id AS requestId,
      dr.document_type AS documentType,
      dr.status,
      dr.file_path AS filePath,
      dr.request_date AS requestDate,
      u.id AS employeeId,
      u.firstname AS firstName,
      u.lastname AS lastName,
      u.function,
      u.department
      FROM document_requests dr
      JOIN users u ON dr.employee_id = u.id
      ORDER BY dr.created_at DESC;`;

    const res = await pool.query(query);
    return res.rows;
  } catch (error) {
    throw new Error(`Error fetching document requests: ${error.message}`);
  }
};

// Function for HR Manager to upload document and update request
const uploadDocumentForRequest = async (
  documentRequestId,
  file_path,
  hr_manager_id
) => {
  try {
    // First, fetch the document request to ensure the HR Manager is authorized to update it
    const requestRes = await pool.query(
      "SELECT * FROM document_requests WHERE id = $1 AND hr_manager_id = $2",
      [documentRequestId, hr_manager_id]
    );

    if (requestRes.rows.length === 0) {
      throw new Error(
        "Document request not found or not assigned to this HR Manager."
      );
    }

    // Update the request with the uploaded document and change status to 'Completed'
    const updateRes = await pool.query(
      `UPDATE document_requests 
       SET file_path = $1, status = 'Completed', completed_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [file_path, documentRequestId]
    );

    return updateRes.rows[0];
  } catch (error) {
    throw new Error(`Error uploading document: ${error.message}`);
  }
};

// Function to delete a document request
const deleteDocumentRequest = async (id) => {
  try {
    const result = await pool.query(
      "DELETE FROM document_requests WHERE id = $1 RETURNING *",
      [id]
    );

    // Check if the request was deleted
    if (result.rows.length === 0) {
      throw new Error(`Document request with ID ${id} does not exist.`);
    }

    return result.rows[0];
  } catch (error) {
    throw new Error(`Error deleting document request: ${error.message}`);
  }
};

// Function to handle file download
const getDocumentFilePath = (fileName) => {
  return path.join(__dirname, "../uploads", fileName);
};

module.exports = {
  createDocumentRequest,
  getDocumentRequestsByEmployee,
  getAllDocumentRequests,
  getDocumentRequestsForHRManager,
  getDocumentRequestById,
  uploadDocumentForRequest,
  deleteDocumentRequest,
  getDocumentFilePath,
};
