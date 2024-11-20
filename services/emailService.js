const fs = require("fs");
const nodemailer = require("nodemailer");
const pool = require("../config/database");
require("dotenv").config();
const axios = require("axios");

// Variables to store the current access token and refresh token
let accessToken = null;
let refreshToken = null;
let tokenExpiry = null;

// Azure OAuth2 authentication to get the access token
async function getAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const data = new URLSearchParams();
  data.append("grant_type", "client_credentials");
  data.append("client_id", clientId);
  data.append("client_secret", clientSecret);
  data.append("scope", "https://graph.microsoft.com/.default");

  try {
    const response = await axios.post(url, data);
    const now = new Date();
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token || refreshToken; // Update only if provided
    tokenExpiry = new Date(now.getTime() + response.data.expires_in * 1000); // Calculate expiry time
    return accessToken;
  } catch (error) {
    console.error("Error getting access token:", error.response ? error.response.data : error.message);
    throw error;
  }
}

// Refresh the access token using the refresh token
async function refreshAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const data = new URLSearchParams();
  data.append("grant_type", "refresh_token");
  data.append("client_id", clientId);
  data.append("client_secret", clientSecret);
  data.append("refresh_token", refreshToken);

  try {
    const response = await axios.post(url, data);
    const now = new Date();
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token || refreshToken; // Update only if provided
    tokenExpiry = new Date(now.getTime() + response.data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error("Error refreshing access token:", error.response ? error.response.data : error.message);
    throw error;
  }
}

// Get a valid access token, refreshing it if needed
async function getValidAccessToken() {
  if (!accessToken || !tokenExpiry || new Date() >= tokenExpiry) {
    console.log("Access token expired or missing. Refreshing...");
    return refreshToken ? await refreshAccessToken() : await getAccessToken();
  }
  return accessToken;
}

let transporter;

// Create Nodemailer transporter using OAuth2
async function createTransporter() {
  const userEmail = process.env.SMTP_USER;
  const validAccessToken = await getValidAccessToken();

  transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      type: "OAuth2",
      user: userEmail,
      accessToken: validAccessToken,
    },
    logger: true,
    debug: true,
  });
}

function generateEmailTemplate(subject, message) {
  const logoBase64 = fs.readFileSync("./emailTemplates/image.png").toString("base64");

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
    await transporter.sendMail({
      from: `"Administration STS"<administration.sts@avocarbon.com>`,
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
  try {
    const result = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
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
    const userEmail = await getUserEmailById(userId);
    await sendEmail(userEmail, subject, message, details);
  } catch (error) {
    console.error("Error sending notification:", error.message);
  }
}

module.exports = { sendEmail, sendEmailNotification };
