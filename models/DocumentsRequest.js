const pool = require("../config/database");
const path = require("path");
const fs = require("fs");

// Function to create a new document request
const createDocumentRequest = async (data) => {
  const { employeeId, documentType } = data;

  try {
    // Check if the employee exists
    const employeeRes = await pool.query("SELECT * FROM users WHERE id = $1", [
      employeeId,
    ]);
    if (employeeRes.rows.length === 0) {
      throw new Error(`Employee with ID ${employeeId} does not exist.`);
    }
    const employee = employeeRes.rows[0];

    // Determine the current and next approver
    let currentApproverId, nextApproverId;
    if (employee.manager_id) {
      currentApproverId = employee.manager_id;
      nextApproverId = employee.plant_manager_id;
    } else if (employee.plant_manager_id) {
      currentApproverId = employee.plant_manager_id;
      nextApproverId = employee.ceo_id;
    } else {
      currentApproverId = employee.ceo_id;
      nextApproverId = null; // If CEO is the final approver, no next approver
    }

    // Insert the document request with currentApproverId and nextApproverId
    const res = await pool.query(
      `INSERT INTO document_requests (employee_id, document_type, current_approver_id, next_approver_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [employeeId, documentType, currentApproverId, nextApproverId]
    );

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
    return res.rows[0];
  } catch (error) {
    throw new Error(`Error fetching document request: ${error.message}`);
  }
};

// Function to get document requests for an employee
const getDocumentRequestsByEmployee = async (employee_id) => {
  const result = await pool.query(
    "SELECT * FROM document_requests WHERE employee_id = $1",
    [employee_id]
  );
  return result.rows;
};

// Function to get all document requests
const getDocumentRequests = async (approverId) => {
  try {
    const query = `SELECT 
        dr.id AS requestId,
        dr.document_type AS documentType,
        dr.status,
        dr.file_path AS filePath,
        dr.request_date AS requestDate,
        dr.current_approver_id AS currentApproverId,
        dr.next_approver_id AS nextApproverId
        u.id AS employeeId,
        u.firstname AS firstName,
        u.lastname AS lastName,
        u.function,
        u.department
     FROM document_requests dr
     JOIN users u ON dr.employee_id = u.id
     WHERE dr.current_approver_id = $1 OR dr.next_approver_id = $1
     ORDER BY dr.created_at DESC;`;
    const res = await pool.query(query, [approverId]);
    return res.rows;
  } catch (error) {
    throw new Error(`Error fetching document requests: ${error.message}`);
  }
};

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

// Function to update a document request with the uploaded file (with approver validation)
const uploadDocument = async (id, approverId, fileName) => {
  try {
    // Check if the approver is the current approver
    const requestCheck = await pool.query(
      "SELECT current_approver_id FROM document_requests WHERE id = $1",
      [id]
    );

    if (requestCheck.rows.length === 0) {
      throw new Error("Document request not found.");
    }

    const { current_approver_id } = requestCheck.rows[0];
    if (current_approver_id !== approverId) {
      throw new Error("You are not authorized to upload this document.");
    }

    // Proceed with file upload if the approver is authorized
    const result = await pool.query(
      "UPDATE document_requests SET file_path = $1, status = $2 WHERE id = $3 RETURNING *",
      [fileName, "Completed", id]
    );

    return result.rows[0];
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
  getDocumentRequests,
  getDocumentRequestById,
  uploadDocument,
  deleteDocumentRequest,
  getDocumentFilePath,
};
