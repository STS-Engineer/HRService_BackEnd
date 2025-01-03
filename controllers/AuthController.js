const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const getUsers = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users");
    res.status(200).json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getEmployeesByPlant = async (req, res) => {
  try {
    const { plant } = req.user;

    // Fetch employees that belong to the given plant connection
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE plant_connection = $1 ORDER BY id ASC",
      [plant]
    );

    // Send the filtered employees as the response
    res.json(rows);
  } catch (err) {
    console.error("Error fetching employees by plant connection:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const registerUser = async (req, res) => {
  const {
    id,
    firstname,
    lastname,
    function: userFunction,
    department,
    email,
    password,
    role,
    plant_connection,
  } = req.body;

  try {
    console.log("Email received:", email);

    const emailRegex = /^[a-zA-Z]+(\.[a-zA-Z]+)*@avocarbon\.com$/;
    const trimmedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [trimmedEmail]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (id,firstname, lastname, function, department, email, password, role, plant_connection)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9) RETURNING *`,
      [
        id,
        firstname,
        lastname,
        userFunction,
        department,
        email,
        hashedPassword,
        role,
        plant_connection,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
const loginUser = async (req, res) => {
  const { email, password, plant_connection, rememberMe } = req.body;

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    // Log the query result for debugging
    console.log("Query result:", rows);

    // Check if the user exists
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Adjust based on the correct column name
    const userPlant = rows[0].plant || rows[0].plant_connection;
    console.log("User plant from DB:", userPlant);

    // Ensure plant exists in the returned user object
    if (!userPlant) {
      return res
        .status(401)
        .json({ error: "User not found or no plant assigned." });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Log both values to see what's being compared
    console.log("Requested plant connection:", plant_connection);

    // Case-insensitive comparison
    if (userPlant.toLowerCase() !== plant_connection.toLowerCase()) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this plant." });
    }

    const payload = {
      user: {
        id: rows[0].id,
        email: rows[0].email,
        role: rows[0].role,
        plant: userPlant,
      },
    };
    const tokenExpiry = rememberMe ? "7d" : "24h";

    jwt.sign(payload, "jwtSecret", { expiresIn: tokenExpiry }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: payload.user });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    firstname,
    lastname,
    function: userFunction,
    department,
    email,
    role,
    plant_connection,
  } = req.body;

  console.log(id, req.body);

  try {
    const { rows } = await pool.query(
      `UPDATE users 
       SET firstname = $1, lastname = $2, function = $3, department = $4, email = $5, role = $6 ,  plant_connection = $7
       WHERE id = $8 RETURNING *`,
      [
        firstname,
        lastname,
        userFunction,
        department,
        email,
        role,
        plant_connection,
        id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const uploadProfilePhoto = async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Define the allowed file types (e.g., images only)
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimeType = allowedTypes.test(file.mimetype);

    if (!mimeType) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    // Generate a unique filename and save the file
    const fileExtension = path.extname(file.originalname);
    const fileName = `${id}-profile${fileExtension}`;
    const imagePath = path.join(__dirname, "..", "uploads", fileName);

    fs.writeFileSync(imagePath, file.buffer);

    // Save file path in the database
    const fileUrl = `/uploads/${fileName}`;
    const { rows } = await pool.query(
      "UPDATE users SET profile_photo = $1 WHERE id = $2 RETURNING *",
      [fileUrl, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile photo updated", user: rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getProfilePhoto = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      "SELECT profile_photo FROM users WHERE id = $1",
      [id]
    );

    if (rows.length === 0 || !rows[0].profile_photo) {
      return res.status(404).json({ error: "Profile photo not found" });
    }

    const photoPath = path.join(__dirname, "..", rows[0].profile_photo);

    if (!fs.existsSync(photoPath)) {
      return res
        .status(404)
        .json({ error: "Profile photo not found on server" });
    }

    res.sendFile(photoPath);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ message: "New password and confirmation do not match." });
  }

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: "New password must be at least 8 characters long." });
  }

  try {
    const result = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};
const updateUserDetails = async (req, res) => {
  const { id } = req.params;
  const {
    firstname,
    lastname,
    function: userFunction,
    department,
    email,
    role,
    plant_connection,
  } = req.body;
  const loggedInUserId = req.user.id;
  const loggedInUserRole = req.user.role;
  try {
    // Verify that the logged-in user is an HR Manager
    if (loggedInUserRole !== "HR Manager") {
      return res.status(403).json({ message: "Access denied." });
    }

    // Proceed with updating employee's information
    await pool.query(
      `UPDATE users 
       SET firstname = $1, lastname = $2, function = $3, department = $4, email = $5, role = $6 ,  plant_connection = $7
       WHERE id = $8 RETURNING *`,
      [
        firstname,
        lastname,
        userFunction,
        department,
        email,
        role,
        plant_connection,
        id,
      ]
    );

    res
      .status(200)
      .json({ message: "Employee information updated successfully." });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

module.exports = {
  registerUser,
  getUsers,
  getEmployeesByPlant,
  loginUser,
  getUserById,
  updateUser,
  uploadProfilePhoto,
  getProfilePhoto,
  updatePassword,
  updateUserDetails,
};
