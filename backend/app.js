require("dotenv").config();

const express = require("express");

const cors = require("cors");

const rateLimit = require("express-rate-limit");



const { initQdrantCollection } = require("./config/qdrant");

const { loadModel } = require("./services/embeddingService");

const { processPdfs } = require("./services/pdfService");



// Import routes

const authRoutes = require("./routes/auth");

const chatRoutes = require("./routes/chats");

const adminRoutes = require("./routes/admin");

const chatExecutionRoute = require("./routes/chatExecution");



const app = express();

app.use(cors());

app.use(express.json());



// Mount existing routes

app.use("/api/auth", authRoutes);

app.use("/api/chats", chatRoutes);

app.use("/admin", adminRoutes);

// Configure rate limiter for chat requests

const chatLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 50,

  message: { error: "Too many requests, please wait a few minutes and try again." },

  standardHeaders: true,

  legacyHeaders: false,

});



// Mount the modularized chat execution route with rate limiting

app.use("/api/chat", chatLimiter, chatExecutionRoute);



async function startServer() {

  try {

    console.log("Initializing application services...");

   

    // 1. Initialize Qdrant collection

    await initQdrantCollection();



    // 2. Pre-load the embedding model

    await loadModel();



    // 3. Process PDF files in data folder

    await processPdfs("./data");



    // 4. Start Express Server

    app.listen(5000, () => {

      console.log("Server running smoothly on port 5000 🚀");

    });

  } catch (error) {

    console.error("Failed to start server:", error);

  }

}



startServer(); 