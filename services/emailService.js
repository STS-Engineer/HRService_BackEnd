const fs = require("fs"); // Add this line
const nodemailer = require("nodemailer");
const pool = require("../config/database");
require("dotenv").config();
const axios = require("axios");

// Azure OAuth2 authentication to get the access token
async function getAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID; // Use environment variable
  const clientId = process.env.AZURE_CLIENT_ID; // Use environment variable
  const clientSecret = process.env.AZURE_CLIENT_SECRET; // Use environment variable

  // The token URL for Azure AD
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  // Set the data to be sent in the POST request body
  const data = new URLSearchParams();
  data.append("grant_type", "client_credentials");
  data.append("client_id", clientId);
  data.append("client_secret", clientSecret);
  data.append("scope", "https://graph.microsoft.com/.default"); // This gives permission to send emails via Outlook

  try {
    // Send the POST request to Azure AD to obtain the access token
    const response = await axios.post(url, data);
    return response.data.access_token; // Return the access token
  } catch (error) {
    console.error("Error getting access token:", error.response ? error.response.data : error.message);
    throw error;
  }
}


let transporter;
// Create Nodemailer transporter using OAuth2
async function createTransporter() {
  const accessToken = await getAccessToken();  // Obtain the access token using the getAccessToken function
  const userEmail = process.env.SMTP_USER;  
  transporter = nodemailer.createTransport({
    service: "hotmail",  // For Outlook (Office365) use 'hotmail'
    auth: {
      type: "OAuth2",    // Specify that we are using OAuth2 for authentication
      user: userEmail,   // Sender's email address
      accessToken: accessToken,  // Use the access token for authentication
    },
  });
}
function generateEmailTemplate(subject, message) {
  const logoBase64 = fs
    .readFileSync(
      "./emailTemplates/image.png"
    )
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

  try {
   if (!transporter) {
      await createTransporter();
    }
    if (transporter) {
      await transporter.sendMail({
        from: `"Administration STS"<administration.sts@avocarbon.com>`,
        to,
        subject,
        text,
        html: htmlContent,
        attachments,
      });
      console.log(`Email sent to ${to}`);
    } else {
      throw new Error("Failed to initialize email transporter");
    }
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
