const fs = require("fs"); // Add this line
const nodemailer = require("nodemailer");
const pool = require("../config/database");

const transporter = nodemailer.createTransport({
  host: "avocarbon-com.mail.protection.outlook.com",
  port: 25,
  secure: false,
  auth: {
    user: "administration.sts@avocarbon.com", // Your email
    pass: "shnlgdyfbcztbhxn", // Use the app password here
  },
});
// Test the connection
transporter.verify(function (error, success) {
  if (error) {
    console.log("Error connecting to SMTP server:", error);
  } else {
    console.log("Server is ready to take messages");
  }
});
function generateEmailTemplate(subject, message) {
  const logoBase64 = fs
    .readFileSync("./emailTemplates/image.png")
    .toString("base64");
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
          <header style="text-align: center; margin-bottom: 20px;">
            <img src="data:image/png;base64,${logoBase64}" alt="Company Logo" style="max-width: 150px;">
          </header>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">${message}</p>
          <footer style="margin-top: 20px; text-align: center; color: #888; font-size: 10px;">
            <p>&copy; ${new Date().getFullYear()} Administration STS. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  `;
}
// Send an email with optional attachments
async function sendEmail(to, subject, text, attachments = []) {
  const htmlContent = generateEmailTemplate(subject, text);

  console.log("Preparing to send email with the following details:");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Text: ${text}`);
  console.log("HTML Content:");
  console.log(htmlContent);
  console.log("Attachments:", attachments);

  try {
    await transporter.sendMail({
      from: '"Administration STS" <administration.sts@avocarbon.com>', // Sender's email address
      to,
      subject,
      text,
      html: htmlContent, // HTML version
      attachments,
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
async function sendEmailNotification(userId, subject, message, details) {
  try {
    const userEmail = await getUserEmailById(userId); // Fetch email by user ID
    await sendEmail(userEmail, subject, message, details); // Send the email with attachments if available
  } catch (error) {
    console.error("Error sending notification:", error.message);
  }
}

module.exports = { sendEmail, sendEmailNotification };
