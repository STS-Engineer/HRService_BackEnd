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

router.get("/users", authenticate, getAllUsers);
router.get("/users/:id", authenticate, getUserById);
router.post("/users", authenticate, createUser);
router.put("/users/:id", authenticate, updateUser);
router.delete("/users/:id", authenticate, deleteUser);

module.exports = router;
