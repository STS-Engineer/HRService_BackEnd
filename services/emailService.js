const fs = require("fs");
const nodemailer = require("nodemailer");
const pool = require("../config/database");
require("dotenv").config();
const axios = require("axios");

// Cache token to avoid redundant API calls
let cachedToken = null;
let tokenExpiryTime = null;

// Function to get the Azure OAuth2 access token
async function getAccessToken() {
  // Use cached token if it's still valid
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const data = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  try {
    const response = await axios.post(url, data);
    cachedToken = response.data.access_token;
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000; // Set expiry time
    return cachedToken;
  } catch (error) {
    console.error("Error fetching access token:", error.response?.data || error.message);
    throw new Error("Failed to fetch Azure access token.");
  }
}

let transporter = null;

// Function to create the Nodemailer transporter
async function createTransporter() {
  if (!transporter) {
    const accessToken = await getAccessToken();
    transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        type: "OAuth2",
        user: process.env.SMTP_USER,
        accessToken: accessToken,
      },
    });
  }
}

// Function to generate an email template
function generateEmailTemplate(subject, message) {
  try {
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
  } catch (error) {
    console.error("Error generating email template:", error.message);
    throw new Error("Failed to generate email template.");
  }
}

// Function to send an email
async function sendEmail(to, subject, text, attachments = []) {
  try {
    const htmlContent = generateEmailTemplate(subject, text);
    
    if (!transporter) {
      await createTransporter();
    }

    await transporter.sendMail({
      from: `"Administration STS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: htmlContent,
      attachments,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Failed to send email.");
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
    throw new Error("Failed to fetch user email.");
  }
}

// Dynamically send an email notification
async function sendEmailNotification(userId, subject, message, attachments = []) {
  try {
    const userEmail = await getUserEmailById(userId);
    await sendEmail(userEmail, subject, message, attachments);
  } catch (error) {
    console.error("Error sending email notification:", error.message);
    throw new Error("Failed to send email notification.");
  }
}

module.exports = { sendEmail, sendEmailNotification };
