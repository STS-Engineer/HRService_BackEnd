const pool = require("../config/database");

const getEmployeeById = async (employeeId) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      employeeId,
    ]); // Assuming 'id' is the primary key for users
    if (rows.length === 0) {
      throw new Error("Employee not found");
    }
    return rows[0]; // Return the first row (the employee)
  } catch (error) {
    console.error("Error fetching employee:", error.message);
    throw new Error("Failed to retrieve employee details");
  }
};

// Get all users (employees)
const getAllUsers = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a user (employee) by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a new user (employee)
const createUser = async (req, res) => {
  const {
    firstname,
    lastname,
    function: userFunction,
    department,
    email,
    role,
  } = req.body;
  const password = "defaultPassword"; // Set a default password for new employees

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (firstname, lastname, function, department, email, password, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        firstname,
        lastname,
        userFunction,
        department,
        email,
        hashedPassword,
        role,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a user (employee)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    firstname,
    lastname,
    function: userFunction,
    department,
    email,
    role,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE users 
       SET firstname = $1, lastname = $2, function = $3, department = $4, email = $5, role = $6 
       WHERE id = $7 RETURNING *`,
      [firstname, lastname, userFunction, department, email, role, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a user (employee)
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllUsers,
  getEmployeeById,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
