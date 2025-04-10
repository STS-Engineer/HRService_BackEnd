const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const salaryCertificateRoutes = require("./routes/certificateRoutes");
const authRoutes = require("./routes/authRoutes");
const leaveRequestsRouter = require("./routes/leaveRequests");
const missionRequestsRouter = require("./routes/missionRequests");
const authorizationRouter = require("./routes/authorizationRequests");
const docRequestsRouter = require("./routes/docRequets");
const userRoutes = require("./routes/UserRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const languageMiddleware = require("./middleware/languageMiddleware");
const pointingRoutes = require("./routes/pointingRoutes");
const horairesRoutes = require("./routes/horairesRoutes");
const nodemailer = require("nodemailer"); // Add nodemailer for SMTP connection
const router = express.Router();

const app = express();

// Your transporter setup for FastMail or any SMTP service
const transporter = nodemailer.createTransport({
  host: "smtp.fastmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "your_email@fastmail.com",
    pass: "your_app_password",
  },
});

// Function to verify the SMTP connection
async function verifyConnection() {
  try {
    // Verify the connection to the SMTP server
    await transporter.verify();
    console.log("SMTP server is ready to take messages.");
    return { success: true, message: "Server is ready to take messages" };
  } catch (error) {
    console.error("Error connecting to SMTP server:", error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
}

// Define the /verify-smtp route in the router
router.get("/verify-smtp", async (req, res) => {
  const result = await verifyConnection();

  if (result.success) {
    res.status(200).json(result); // 200 OK if the connection is successful
  } else {
    res.status(500).json(result); // 500 Internal Server Error if there is a connection issue
  }
});

// Register your router for this endpoint
app.use("/", router);

// Middleware and other routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(languageMiddleware);
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));
app.use("/auth", authRoutes);
app.use("/", userRoutes);
app.use("/leave-requests", leaveRequestsRouter);
app.use("/mission-requests", missionRequestsRouter);
app.use("/authorization-requests", authorizationRouter);
app.use("/document-requests", docRequestsRouter);
app.use("/salary-certificates", salaryCertificateRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/pointing", pointingRoutes);
app.use("/horaires", horairesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
