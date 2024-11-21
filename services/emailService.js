const fs = require("fs"); // Add this line
const nodemailer = require("nodemailer");
const pool = require("../config/database");
require("dotenv").config();
const axios = require("axios");

// Azure OAuth2 authentication to get the access token
async function getAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID; // Use environment variable
  const clientId = process.env.AZURE_CLIENT_ID; // Use environment variable
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  console.log("Azure Credentials:");
  console.log("Tenant ID:", tenantId);
  console.log("Client ID:", clientId);
  console.log("Client Secret:", clientSecret ? "Present" : "Missing");

  // The token URL for Azure AD
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  console.log("Token URL:", url);

  // Set the data to be sent in the POST request body
  const data = new URLSearchParams();
  data.append("grant_type", "client_credentials");
  data.append("client_id", clientId);
  data.append("client_secret", clientSecret);
  data.append("scope", "https://graph.microsoft.com/.default");

  console.log("Data to send in POST request:", Object.fromEntries(data.entries()));

  try {
    // Send the POST request to Azure AD to obtain the access token
    const response = await axios.post(url, data);
    console.log("Access Token Response:", response.data);
   // Check if the access token is returned
    if (response.data && response.data.access_token) {
      console.log("Access Token Generated Successfully:", response.data.access_token);
      return response.data.access_token; // Return the access token
    } else {
      console.error("Access token not found in response.");
      throw new Error("Access token not found in response.");
    }
  } catch (error) {
    console.error("Error getting access token:", error.response ? error.response.data : error.message);
    throw error;
  }
}

let transporter;

// Create Nodemailer transporter using OAuth2
async function createTransporter() {
  console.log("Initializing transporter...");
  const accessToken = await getAccessToken(); // Obtain the access token using the getAccessToken function
  const userEmail = process.env.SMTP_USER;

  console.log("SMTP User:", userEmail);
  console.log("Access Token for Transporter:", accessToken);

  transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      type: "OAuth2", // Specify that we are using OAuth2 for authentication
      user: userEmail, // Sender's email address
      accessToken: accessToken, // Use the access token for authentication
    },
    logger: true,
    debug: true,
  });

  console.log("Transporter created successfully!");
}

function generateEmailTemplate(subject, message) {
  console.log("Generating email template...");
  const logoBase64 = fs.readFileSync("./emailTemplates/image.png").toString("base64");
  console.log("Logo read successfully!");

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
  console.log("Preparing to send email...");
  const htmlContent = generateEmailTemplate(subject, text);

  console.log("Email HTML content generated!");

  try {
    if (!transporter) {
      console.log("Transporter not initialized. Creating transporter...");
      await createTransporter();
    }
    console.log("Sending email...");
    await transporter.sendMail({
      from: `"Administration" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: htmlContent,
      attachments,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
}

// Fetch user email by user ID
async function getUserEmailById(userId) {
  console.log("Fetching user email by ID:", userId);
  try {
    const result = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      console.error(`No user found with ID ${userId}`);
      throw new Error(`No user found with ID ${userId}`);
    }
    console.log("User email fetched successfully:", result.rows[0].email);
    return result.rows[0].email;
  } catch (error) {
    console.error("Error fetching user email:", error.message);
    throw error;
  }
}

// Dynamically send an email notification to the approver or employee
async function sendEmailNotification(userId, subject, message, details) {
  console.log("Preparing to send email notification...");
  console.log("User ID:", userId);
  console.log("Subject:", subject);
  console.log("Message:", message);

  try {
    const userEmail = await getUserEmailById(userId); // Fetch email by user ID
    console.log("User email for notification:", userEmail);
    await sendEmail(userEmail, subject, message, details); // Send the email with attachments if available
  } catch (error) {
    console.error("Error sending notification:", error.message);
  }
}

module.exports = { sendEmail, sendEmailNotification };
