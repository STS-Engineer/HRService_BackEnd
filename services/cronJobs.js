const cron = require("node-cron");
const {
  syncDeviceLogsU,
  updatePointingStatusController,
} = require("../controllers/PointingController"); // Adjust path if needed

// Schedule job to run every day at 6 AM
cron.schedule("0 10 * * *", async () => {
  console.log("Running scheduled pointing synchronization...");

  try {
    await syncDeviceLogsU();
    await updatePointingStatusController();
    console.log("✅ Pointing sync completed successfully.");
  } catch (error) {
    console.error("❌ Error running scheduled sync:", error);
  }
});

module.exports = cron;
