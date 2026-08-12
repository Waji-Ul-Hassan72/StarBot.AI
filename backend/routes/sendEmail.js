// utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Change if using another service like SendGrid or Mailtrap
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `http://localhost:5000/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"Support Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email Address",
    html: `
      <h2>Welcome!</h2>
      <p>Please click the button below to verify your email address and activate your account:</p>
      <a href="${verifyUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
      <p>Or click this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This verification link will expire in 24 hours.</p>
    `,
  });
};

module.exports = sendVerificationEmail;