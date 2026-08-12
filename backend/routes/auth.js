// routes/auth.js
// signup, email verification, login, RSA password encryption/decryption, bcrypt password hashing, and JWT creation.
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db"); // Import the database connection
const crypto = require("crypto");
const sendVerificationEmail = require("./sendEmail"); // Import Nodemailer helper

// 1. Generate RSA Key Pair when the server starts
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Helper to decrypt the password from the frontend
const decryptRSAPassword = (encryptedBase64) => {
  const buffer = Buffer.from(encryptedBase64, "base64");
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  );
  return decrypted.toString("utf8");
};

// 2. Create a route for React to grab the Public Key
router.get("/public-key", (req, res) => {
  res.json({ publicKey });
});

// SIGNUP ROUTE (Generates token, saves user as unverified, & sends email)
router.post("/signup", async (req, res) => {
  try {
    // Grab the incoming encrypted password
    const { email, password: encryptedPassword } = req.body;

    // Decrypt it back to plain text
    const plainPassword = decryptRSAPassword(encryptedPassword);

    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const saltRounds = 10;
    // Hash the PLAIN TEXT password with bcrypt before saving
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // Generate email verification token (expires in 24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save user with is_verified = FALSE
    const newUser = await pool.query(
      `INSERT INTO users (email, password, is_verified, verification_token, verification_token_expires) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email`,
      [email, hashedPassword, false, verificationToken, tokenExpires]
    );

    // Send verification email via Nodemailer
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message:
        "User registered successfully! Please check your email to verify your account.",
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// VERIFY EMAIL ROUTE (Triggers when the user clicks the link in their email)
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Missing verification token" });
    }

    // Find user with matching, active token
    const userResult = await pool.query(
      "SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()",
      [token]
    );

    if (userResult.rows.length === 0) {
      return res
        .status(400)
        .send("<h2>Invalid or expired verification link.</h2>");
    }

    const user = userResult.rows[0];

    // Mark user as verified and remove tokens
    await pool.query(
      "UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1",
      [user.id]
    );

    res.send(
      "<h2>Email verified successfully! You can now log in to your account.</h2>"
    );
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ error: "Server error during email verification" });
  }
});

// LOGIN ROUTE (Blocks unverified users)
router.post("/login", async (req, res) => {
  try {
    // Grab the incoming encrypted password
    const { email, password: encryptedPassword } = req.body;

    // Decrypt it back to plain text
    const plainPassword = decryptRSAPassword(encryptedPassword);

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = userResult.rows[0];

    // Compare the PLAIN TEXT password against the bcrypt hash in DB
    const isMatch = await bcrypt.compare(plainPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Block login if email is not verified
    if (!user.is_verified) {
      return res.status(403).json({
        error:
          "Please verify your email address before logging in. Check your inbox.",
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "supersecretkey",
      {
        expiresIn: "24h",
      }
    );

    res.json({ message: "Login successful", token, email: user.email });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;

