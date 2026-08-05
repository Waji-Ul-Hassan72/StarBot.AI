// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db"); // Import the database connection
const crypto = require('crypto');

// 1. Generate RSA Key Pair when the server starts
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Helper to decrypt the password from the frontend
const decryptRSAPassword = (encryptedBase64) => {
  const buffer = Buffer.from(encryptedBase64, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    buffer
  );
  return decrypted.toString('utf8');
};

// 2. Create a route for React to grab the Public Key
router.get('/public-key', (req, res) => {
  res.json({ publicKey });
});

// SIGNUP ROUTE
router.post("/signup", async (req, res) => {
    try {
        // Grab the incoming encrypted password
        const { email, password: encryptedPassword } = req.body;
        
        // Decrypt it back to plain text
        const plainPassword = decryptRSAPassword(encryptedPassword);
        
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const saltRounds = 10;
        // Hash the PLAIN TEXT password with bcrypt before saving
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        const newUser = await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );

        res.status(201).json({ message: "User registered successfully", user: newUser.rows[0] });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Server error during signup" });
    }
});

// LOGIN ROUTE
router.post("/login", async (req, res) => {
    try {
        // Grab the incoming encrypted password
        const { email, password: encryptedPassword } = req.body;

        // Decrypt it back to plain text
        const plainPassword = decryptRSAPassword(encryptedPassword);

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const user = userResult.rows[0];

        // Compare the PLAIN TEXT password against the bcrypt hash in DB
        const isMatch = await bcrypt.compare(plainPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "supersecretkey", {
            expiresIn: "24h",
        });

        res.json({ message: "Login successful", token, email: user.email });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
});

module.exports = router;