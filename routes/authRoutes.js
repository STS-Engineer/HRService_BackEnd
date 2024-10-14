const express = require("express");
const multer = require("multer");
const {
  registerUser,
  getUsers,
  loginUser,
  getUserById,
  updateUser,
  uploadProfilePhoto,
  getProfilePhoto,
  updatePassword,
  getEmployeesByPlant,
  updateUserDetails,
} = require("../controllers/AuthController");
const validateEmail = require("../middleware/validateEmail");
const upload = multer({ storage: multer.memoryStorage() });
const { authenticate } = require("../middleware/authenticateToken");

const router = express.Router();

router.get("/users", getUsers);
router.post("/register", validateEmail, registerUser);
router.post("/login", loginUser);
router.get("/user/:id", getUserById);
router.get("/user/", getEmployeesByPlant);
router.put("/user/:id", updateUser);
router.post(
  "/user/:id/photo",
  upload.single("profile_photo"),
  uploadProfilePhoto
);
router.put("/user/:id", authenticate, updateUserDetails);
router.get("/user/:id/photo", getProfilePhoto);
router.patch("/update-password", authenticate, updatePassword);
router.get("/employees-by-plant", authenticate, getEmployeesByPlant);

module.exports = router;
