// routes/chats.js
const express = require("express");
const router = express.Router();
const pool = require("../db"); // Import database connection
const jwt = require("jsonwebtoken");

// JWT Authentication Middleware (Verifies the logged-in user)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. Token missing." });
    }

    jwt.verify(token, process.env.JWT_SECRET || "supersecretkey", (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        req.user = decoded; // Contains userId and email from login token
        next();
    });
};

// 1. GET ALL CHATS FOR THE LOGGED-IN USER (For Sidebar List)
// Route: GET /api/chats
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            "SELECT id, title, created_at FROM chats WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching chats:", err);
        res.status(500).json({ error: "Server error fetching chat history" });
    }
});

// 2. GET ALL MESSAGES FOR A SPECIFIC CHAT SESSION
// Route: GET /api/chats/:id
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const chatId = req.params.id;

        // Verify the chat belongs to the user making the request
        const chatCheck = await pool.query(
            "SELECT * FROM chats WHERE id = $1 AND user_id = $2",
            [chatId, userId]
        );

        if (chatCheck.rows.length === 0) {
            return res.status(404).json({ error: "Chat not found or unauthorized" });
        }

        // Fetch all messages for this chat ordered chronologically
        const messagesResult = await pool.query(
            "SELECT id, sender, text, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
            [chatId]
        );

        res.json({
            chatId: chatCheck.rows[0].id,
            title: chatCheck.rows[0].title,
            messages: messagesResult.rows
        });
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ error: "Server error fetching messages" });
    }
});

// 3. CREATE A NEW CHAT SESSION
// Route: POST /api/chats
router.post("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title } = req.body;

        const newChat = await pool.query(
            "INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at",
            [userId, title || "New Conversation"]
        );

        res.status(201).json(newChat.rows[0]);
    } catch (err) {
        console.error("Error creating chat:", err);
        res.status(500).json({ error: "Server error creating new chat" });
    }
});

// Change 'app.patch' and '/api/chats/:id/pin' to 'router.patch' and '/:id/pin'
router.patch('/:id/pin', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  // Verify your JWT middleware populates req.user correctly
  // Use req.user.id, req.user.userId, or req.user.user_id based on your token payload
  const userId = req.user?.id || req.user?.userId || req.user?.user_id;

  if (!userId) {
    return res.status(401).json({ error: 'User ID missing from auth token' });
  }

  try {
    // Replace 'pool' or 'db' with whatever database module variable name you imported in this file
    const result = await pool.query(
      `UPDATE chats 
       SET is_pinned = NOT COALESCE(is_pinned, false) 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling pin status:', err);
    res.status(500).json({ error: 'Failed to update pin status', details: err.message });
  }
});

// 4. SAVE A MESSAGE TO AN EXISTING CHAT
// Route: POST /api/chats/:id/message
router.post("/:id/message", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const chatId = req.params.id;
        const { sender, text } = req.body; // sender: 'user' or 'bot'

        // Verify ownership
        const chatCheck = await pool.query(
            "SELECT * FROM chats WHERE id = $1 AND user_id = $2",
            [chatId, userId]
        );

        if (chatCheck.rows.length === 0) {
            return res.status(404).json({ error: "Chat not found" });
        }

        const newMessage = await pool.query(
            "INSERT INTO messages (chat_id, sender, text) VALUES ($1, $2, $3) RETURNING id, sender, text, created_at",
            [chatId, sender, text]
        );

        res.status(201).json(newMessage.rows[0]);
    } catch (err) {
        console.error("Error saving message:", err);
        res.status(500).json({ error: "Server error saving message" });
    }
});

// 5. DELETE A CHAT SESSION AND ITS MESSAGES
// Route: DELETE /api/chats/:id
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const chatId = req.params.id;

        // Verify that the chat exists and belongs to the authenticated user
        const chatCheck = await pool.query(
            "SELECT * FROM chats WHERE id = $1 AND user_id = $2",
            [chatId, userId]
        );

        if (chatCheck.rows.length === 0) {
            return res.status(404).json({ error: "Chat not found or unauthorized" });
        }

        // Delete all messages associated with this chat session first
        await pool.query("DELETE FROM messages WHERE chat_id = $1", [chatId]);

        // Delete the chat row itself
        await pool.query("DELETE FROM chats WHERE id = $1 AND user_id = $2", [chatId, userId]);

        res.json({ message: "Chat session deleted successfully" });
    } catch (err) {
        console.error("Error deleting chat:", err);
        res.status(500).json({ error: "Server error deleting chat session" });
    }
});

module.exports = router;