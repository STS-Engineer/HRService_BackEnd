const fs = require("fs");
const nodemailer = require("nodemailer");
const axios = require("axios");
require("dotenv").config();
const axios = require("axios");

// Variables to store tokens and expiration
let accessToken = null;
let refreshToken = null;
let tokenExpiry = null;

// Function to get the initial access and refresh tokens
async function getTokens() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const authCode = process.env.AUTHORIZATION_CODE;
  const redirectUri = process.env.REDIRECT_URI;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: authCode,
    redirect_uri: redirectUri,
  });

  try {
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    const now = new Date();
    tokenExpiry = new Date(now.getTime() + response.data.expires_in * 1000);

    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken);

    return { accessToken, refreshToken };
  } catch (error) {
    console.error(
      "Error getting tokens:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Function to refresh the access token
async function refreshAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  try {
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token || refreshToken;
    const now = new Date();
    tokenExpiry = new Date(now.getTime() + response.data.expires_in * 1000);

    console.log("Access Token Refreshed:", accessToken);

    return accessToken;
  } catch (error) {
    console.error(
      "Error refreshing access token:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Function to ensure a valid access token
async function getValidAccessToken() {
  const now = new Date();
  if (!accessToken || !tokenExpiry || now >= tokenExpiry) {
    console.log("Access token expired or missing. Refreshing...");
    return refreshToken ? await refreshAccessToken() : await getTokens();
  }
  return accessToken;
}

// Create the Nodemailer transporter
async function createTransporter() {
  const userEmail = process.env.SMTP_USER;
  const validAccessToken = await getValidAccessToken();

  return nodemailer.createTransport({
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

// Generate an email template
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

// Function to send a general email
async function sendEmail(to, subject, text, attachments = []) {
  const htmlContent = generateEmailTemplate(subject, text);

  try {
    const transporter = await createTransporter();
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
    const userEmail = await getUserEmailById(userId);
    await sendEmail(userEmail, subject, message, details);
  } catch (error) {
    console.error("Error sending notification:", error.message);
  }
}

// Export the functions
module.exports = { sendEmail, sendEmailNotification };
