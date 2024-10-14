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

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
