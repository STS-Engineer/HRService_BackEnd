const pool = require("../config/database"); // Assuming you've set up a PostgreSQL connection pool
const moment = require("moment");

// Get total requests per employee
exports.getRequestsPerEmployee = async (req, res) => {
  try {
    const { plant } = req.user;
    const { employeeID } = req.query; // Get employeeID from query parameters

    // Base condition for WHERE clause
    let employeeCondition = "";
    const queryParams = [plant];

    if (employeeID) {
      // Add employeeID condition if provided
      employeeCondition = " AND u.id = $2";
      queryParams.push(employeeID);
    }

    // Query to count total leave requests per employee
    const leaveQuery = `
      SELECT u.id AS employee_id, u.firstname, u.lastname, COUNT(lr.id) AS total_requests
      FROM users u
      LEFT JOIN leave_requests lr ON u.id = lr.employee_id
      WHERE u.plant_connection = $1${employeeCondition}
      GROUP BY u.id;
    `;
    const leaveRequests = await pool.query(leaveQuery, queryParams);

    // Query to count total mission requests per employee
    const missionQuery = `
      SELECT u.id AS employee_id, u.firstname, u.lastname, COUNT(mr.id) AS total_requests
      FROM users u
      LEFT JOIN mission_requests mr ON u.id = mr.employee_id
      WHERE u.plant_connection = $1${employeeCondition}
      GROUP BY u.id;
    `;
    const missionRequests = await pool.query(missionQuery, queryParams);

    // Query to count total authorization requests per employee
    const authorizationQuery = `
      SELECT u.id AS employee_id, u.firstname, u.lastname, COUNT(ar.id) AS total_requests
      FROM users u
      LEFT JOIN authorization_requests ar ON u.id = ar.employee_id
      WHERE u.plant_connection = $1${employeeCondition}
      GROUP BY u.id;
    `;
    const authorizationRequests = await pool.query(
      authorizationQuery,
      queryParams
    );

    // Combine all results
    const allRequests = [
      ...leaveRequests.rows,
      ...missionRequests.rows,
      ...authorizationRequests.rows,
    ];

    // Create an object to accumulate total requests per employee
    const requestsPerEmployee = {};
    for (const req of allRequests) {
      const { employee_id, firstname, lastname, total_requests } = req;
      if (!requestsPerEmployee[employee_id]) {
        requestsPerEmployee[employee_id] = {
          total_requests: 0,
          firstname,
          lastname,
        };
      }
      requestsPerEmployee[employee_id].total_requests +=
        parseInt(total_requests);
    }

    // Return the result as JSON
    res.status(200).json(requestsPerEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching requests per employee" });
  }
};

// Get employees on leave today
exports.getEmployeesOnLeaveToday = async (req, res) => {
  try {
    const { plant } = req.user;
    const today = moment().format("YYYY-MM-DD");

    // Query to get employees on leave today
    const onLeaveQuery = `
      SELECT u.id, u.firstname, u.lastname 
      FROM users u 
      JOIN leave_requests lr ON u.id = lr.employee_id 
      WHERE u.plant_connection = $1 
        AND lr.start_date <= $2 
        AND lr.end_date >= $2 
        AND lr.status = 'Approved';
    `;
    const employeesOnLeave = await pool.query(onLeaveQuery, [plant, today]);

    // Return the result as JSON
    res.status(200).json(employeesOnLeave.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching employees on leave today" });
  }
};

// Get general statistics for the dashboard
exports.getGeneralStatistics = async (req, res) => {
  try {
    const { plant } = req.user;
    const today = moment().format("YYYY-MM-DD");

    // Query to count the total number of requests (leave, mission, and authorization)
    const totalRequestsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM leave_requests lr JOIN users u ON lr.employee_id = u.id WHERE u.plant_connection = $1) AS total_leave_requests,
        (SELECT COUNT(*) FROM mission_requests mr JOIN users u ON mr.employee_id = u.id WHERE u.plant_connection = $1) AS total_mission_requests,
        (SELECT COUNT(*) FROM authorization_requests ar JOIN users u ON ar.employee_id = u.id WHERE u.plant_connection = $1) AS total_authorization_requests
    `;
    const totalRequests = await pool.query(totalRequestsQuery, [plant]);

    // Query to get the total number of employees
    const totalEmployeesQuery = `
      SELECT COUNT(*) as total_employees 
      FROM users u 
      WHERE u.plant_connection = $1;
    `;
    const totalEmployees = await pool.query(totalEmployeesQuery, [plant]);

    // Query to get the number of employees currently on leave
    const employeesOnLeaveQuery = `
      SELECT COUNT(*) as total_on_leave 
      FROM leave_requests lr 
      JOIN users u ON lr.employee_id = u.id 
      WHERE u.plant_connection = $1 
        AND lr.start_date <= $2 
        AND lr.end_date >= $2 
        AND lr.status = 'Approved';
    `;
    const employeesOnLeave = await pool.query(employeesOnLeaveQuery, [
      plant,
      today,
    ]);

    // Combine the statistics into a single object
    const statistics = {
      total_leave_requests: totalRequests.rows[0].total_leave_requests,
      total_mission_requests: totalRequests.rows[0].total_mission_requests,
      total_authorization_requests:
        totalRequests.rows[0].total_authorization_requests,
      total_employees: totalEmployees.rows[0].total_employees,
      total_on_leave: employeesOnLeave.rows[0].total_on_leave,
    };

    // Return the result as JSON
    res.status(200).json(statistics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching general statistics" });
  }
};
