const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const leaveRequestsRouter = require("./routes/leaveRequests");
const missionRequestsRouter = require("./routes/missionRequests");
const authorizationRouter = require("./routes/authorizationRequests");
const docRequestsRouter = require("./routes/docRequets");
const userRoutes = require("./routes/UserRoutes");

const app = express();

app.use(cors());
app.use(express.json()); // Replaces bodyParser.json()
app.use(express.urlencoded({ extended: true })); // Replaces bodyParser.urlencoded()

app.use("/uploads", express.static("uploads"));
app.use("/auth", authRoutes);
app.use("/", userRoutes);
app.use("/leave-requests", leaveRequestsRouter);
app.use("/mission-requests", missionRequestsRouter);
app.use("/authorization-requests", authorizationRouter);
app.use("/document-requests", docRequestsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
