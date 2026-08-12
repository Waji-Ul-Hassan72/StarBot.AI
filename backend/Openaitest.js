require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const path = require("path");
const pdf = require("pdf-parse");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { QdrantClient } = require("@qdrant/js-client-rest");
const { GoogleGenAI } = require("@google/genai");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(cors());

// Import routes
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chats");

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

// Configure rate limiter for chat requests
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 50, // Limit each IP to 50 requests per window
  message: { error: "Too many requests, please wait a few minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/chat", chatLimiter);

// Connect Node.js to Qdrant server
const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// Connect Node.js to Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Load MiniLM Embedding Model
async function loadModel() {
  console.log("Loading MiniLM Embedding Model...");
  const { pipeline } = await import("@huggingface/transformers");

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  return extractor;
}

async function main() {
  const dataFolder = "./data";

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const extractor = await loadModel();

  // -------------------------------------------------------------
  // CHAT GENERATION ENDPOINT
  // -------------------------------------------------------------
  app.post("/api/chat", async (req, res) => {
    try {
      const question = req.body.prompt || req.body.question;
      const history = req.body.history || [];

      if (!question) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Generate Embedding
      const questionOutput = await extractor(question, {
        pooling: "mean",
        normalize: true,
      });
      const questionEmbedding = Array.from(questionOutput.data);

      // Search Qdrant
      const results = await client.query("usa-laws", {
        query: questionEmbedding,
        limit: 5,
        with_payload: true,
      });

      // Build context string from top results
      let context = "";
      if (results.points && results.points.length > 0) {
        results.points.forEach((point, index) => {
          context += `Chunk ${index + 1}:\n${point.payload.text}\n\n`;
        });
      }

      // Format previous messages
      const formattedHistory = history
        .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
        .join("\n");

      // System Instructions with Seamless General Knowledge Fallback
      const systemInstructions = `
You are a polite, helpful legal and general knowledge assistant.

Instructions:
1. If the user's input is a common greeting, respond with a friendly greeting.
2. If the user asks about previous messages or conversation history, answer using the Conversation History.
3. Check the provided Document Context. If the answer is found in the context, answer using the context.
4. If the answer is NOT found in the document context, DO NOT say "I don't know". Instead, start your response explicitly with: "This is not present in your uploaded document context, but based on general knowledge...", and then provide a thorough, accurate answer using your general knowledge.
      `;

      const prompt = `
${systemInstructions}

Conversation History:
${formattedHistory}

Document Context:
${context || "No relevant document context found."}

Current Question:
${question}

Answer:
`;

      // Updated Model Fallback Chain with active current models
      const modelsToTry = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest"
      ];

      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          break; 
        } catch (modelErr) {
          lastError = modelErr;
          console.warn(`Model ${modelName} encountered an issue:`, modelErr.message);
        }
      }

      if (!response) {
        throw lastError || new Error("All fallback models failed to respond.");
      }

      res.json({
        answer: response.text,
      });

    } catch (error) {
      console.error("Error processing request:", error);

      // Gracefully handle Gemini Free Tier Quota Limits (HTTP 429)
      if (error.status === 429 || error.code === 429 || (error.message && error.message.includes("429"))) {
        return res.status(429).json({
          answer: "⚠️ You have temporarily exceeded the free-tier quota limit for the AI service. Please wait a minute and try your request again."
        });
      }

      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // -------------------------------------------------------------
  // QDRANT SETUP & PDF PARSING
  // -------------------------------------------------------------
  try {
    await client.createCollection("usa-laws", {
      vectors: {
        size: 384,
        distance: "Cosine",
      },
    });
    console.log("Collection 'usa-laws' created successfully.");
  } catch (error) {
    if (error.status === 409) {
      console.log("Collection 'usa-laws' already exists. Skipping creation.");
    } else {
      console.error("Qdrant collection error:", error);
    }
  }

  if (fs.existsSync(dataFolder)) {
    const files = fs.readdirSync(dataFolder);

    for (const file of files) {
      if (path.extname(file).toLowerCase() !== ".pdf") {
        continue;
      }

      try {
        const dataBuffer = fs.readFileSync(path.join(dataFolder, file));
        const data = await pdf(dataBuffer);
        await splitter.createDocuments([data.text]);
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  }
}

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

main();