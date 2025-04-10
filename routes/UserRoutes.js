const express = require("express");
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersByDevice,
  addEmployeeToPointeuse,
  deleteEmployeeFromPointeuse,
} = require("../controllers/UserController");
const { authenticate } = require("../middleware/authenticateToken");
const router = express.Router();

router.get("/users", authenticate, getAllUsers);
router.get("/users/:id", authenticate, getUserById);
router.post("/users", authenticate, createUser);
router.put("/users/:id", authenticate, updateUser);
router.delete("/users/:id", authenticate, deleteUser);
// Route to get users by pointeuse device ID
router.get("/device/:pointeuse_id", getUsersByDevice);
// Route to add an employee to a pointeuse
router.post("/", addEmployeeToPointeuse);
// Route to remove an employee from a pointeuse
router.delete("/:employeeId", deleteEmployeeFromPointeuse);

module.exports = router;
