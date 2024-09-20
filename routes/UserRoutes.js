const express = require("express");
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/UserController");
const { authenticate } = require("../middleware/authenticateToken");

const router = express.Router();

router.get("/users", authenticate, getAllUsers); // Get all users (employees)
router.get("/users/:id", authenticate, getUserById); // Get a specific user by ID
router.post("/users", authenticate, createUser); // Create a new user (employee)
router.put("/users/:id", authenticate, updateUser); // Update an existing user (employee)
router.delete("/users/:id", authenticate, deleteUser); // Delete a user (employee)

module.exports = router;
