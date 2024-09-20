const nodemailer = require("nodemailer");
const pool = require("../config/database");

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "avocarbontest@outlook.com",
    pass: "fddfkbwyeoymhxqs",
  },
});

// Send an email // configuration smtp app pwd
async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: '"Administration STS"<avocarbontest@outlook.com>', // Sender's email address
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email", error);
  }
}

// Fetch user email by user ID
async function getUserEmailById(userId) {
  try {
    const result = await pool.query("SELECT email FROM users WHERE id = $1", [
      userId,
    ]);
    if (result.rows.length === 0) {
      throw new Error(`No user found with ID ${userId}`);
    }
    return result.rows[0].email;
  } catch (error) {
    console.error("Error fetching user email:", error.message);
    throw error;
  }
}

// Dynamically send an email notification to the approver or employee
async function sendEmailNotification(userId, subject, message) {
  try {
    const userEmail = await getUserEmailById(userId); // Fetch email by user ID
    await sendEmail(userEmail, subject, message); // Send the email
  } catch (error) {
    console.error("Error sending notification:", error.message);
  }
}

module.exports = { sendEmail, sendEmailNotification };
