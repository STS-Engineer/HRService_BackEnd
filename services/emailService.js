const fs = require("fs"); // Add this line
const nodemailer = require("nodemailer");
const pool = require("../config/database");

//Configure Nodemailer transporter

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: "sakouhihadil3@gmail.com",
//     pass: "uupm wrml rklh bugg", // Use the app password "uupm wrml rklh bugg"
//   },
// });
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "administration.sts@avocarbon.com",
    pass: "nztpjywqclxkkncn",
  },
  tls: {
    rejectUnauthorized: false,
  },
});
// const transporter = nodemailer.createTransport({
//   host: "avocarbon-com.mail.protection.outlook.com",
//   port: 25,
//   secure: false,
//   auth: {
//     user: "administration.sts@avocarbon.com", // Your email
//     pass: "shnlgdyfbcztbhxn", // Use the app password here
//   },
// });
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
  github;

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

// const fs = require("fs"); // For handling logo in email templates
// const { FastMailer } = require("fast-mailer");
// const pool = require("../config/database");

// // Configure FastMailer
// const transporter = new FastMailer({
//   host: "avocarbon-com.mail.protection.outlook.com",
//   port: 25,
//   secure: false, // Use TLS
//   auth: {
//     user: "administration.STS@avocarbon.com", // Your email address
//     pass: "shnlgdyfbcztbhxn", // Your app password
//   },
//   from: "administration.STS@avocarbon.com",
// });

// // Function to test the connection
// // async function verifyConnection() {
// //   try {
// //     await transporter.verify();
// //     console.log("Server is ready to take messages");
// //   } catch (error) {
// //     console.error("Error connecting to SMTP server:", error.message);
// //   }
// // }

// // Generate an HTML email template
// function generateEmailTemplate(subject, message) {
//   const logoBase64 = fs
//     .readFileSync("./emailTemplates/image.png")
//     .toString("base64");
//   return `
//     <html>
//       <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
//         <div style="max-width: 600px; margin: auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
//           <header style="text-align: center; margin-bottom: 20px;">
//             <img src="data:image/png;base64,${logoBase64}" alt="Company Logo" style="max-width: 150px;">
//           </header>
//           <p style="font-size: 16px; line-height: 1.6; color: #555;">${message}</p>
//           <footer style="margin-top: 20px; text-align: center; color: #888; font-size: 10px;">
//             <p>&copy; ${new Date().getFullYear()} Administration STS. All rights reserved.</p>
//           </footer>
//         </div>
//       </body>
//     </html>
//   `;
// }

// // Send an email with optional attachments
// async function sendEmail(to, subject, text, attachments = []) {
//   const htmlContent = generateEmailTemplate(subject, text);

//   try {
//     await transporter.sendMail({
//       from: '"Administration STS" <administration.STS@avocarbon.com>', // Sender's email address
//       to,
//       subject,
//       text,
//       html: htmlContent, // HTML version
//       attachments, // Optional attachments
//     });
//     console.log(`Email sent to ${to}`);
//   } catch (error) {
//     console.error("Error sending email:", error.message);
//   }
// }

// // Fetch user email by user ID
// async function getUserEmailById(userId) {
//   try {
//     const result = await pool.query("SELECT email FROM users WHERE id = $1", [
//       userId,
//     ]);
//     if (result.rows.length === 0) {
//       throw new Error(`No user found with ID ${userId}`);
//     }
//     return result.rows[0].email;
//   } catch (error) {
//     console.error("Error fetching user email:", error.message);
//     throw error;
//   }
// }

// // Dynamically send an email notification to the approver or employee
// async function sendEmailNotification(userId, subject, message, details) {
//   try {
//     const userEmail = await getUserEmailById(userId); // Fetch email by user ID
//     await sendEmail(userEmail, subject, message, details); // Send the email with attachments if available
//   } catch (error) {
//     console.error("Error sending notification:", error.message);
//   }
// }

// // // Verify the connection to the mail server on startup
// // verifyConnection();

// module.exports = { sendEmail, sendEmailNotification };
