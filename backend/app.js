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
// ... existing imports ...
const authRoutes = require("./routes/auth"); // Import the new auth routes
const chatRoutes = require("./routes/chats");
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);


// Configure the rate limiter
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 50, // Limit each IP to 50 requests per window
  message: { error: "Too many requests, please wait a few minutes and try again." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Apply the rate limiter specifically to your chat route
app.use("/api/chat", chatLimiter);

// Connect node.js to qdrant server
const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// Connect node.js to gemini
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
  // Folder containing PDFs
  const dataFolder = "./data";

  // Create text splitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  // Load embedding model once
  const extractor = await loadModel();

  // -------------------------------------------------------------
  // FIXED CHAT ENDPOINT
  // -------------------------------------------------------------
  app.post("/api/chat", async (req, res) => {
    try {
      // 1) Read prompt and history from React frontend payload
      const question = req.body.prompt || req.body.question;
      const history = req.body.history || [];

      if (!question) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // 2) Generate Embedding
      const questionOutput = await extractor(question, {
        pooling: "mean",
        normalize: true,
      });
      const questionEmbedding = Array.from(questionOutput.data);

      // 3) Search Qdrant
      const results = await client.query("usa-laws", {
        query: questionEmbedding,
        limit: 5,
        with_payload: true,
      });

      // 4) Build context string from top results
      let context = "";
      results.points.forEach((point, index) => {
        context += `Chunk ${index + 1}:\n${point.payload.text}\n\n`;
      });

      // 5) Format previous messages into a readable string
      const formattedHistory = history
        .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
        .join("\n");

     // 6) Build the prompt for Gemini
      const prompt = `
You are a polite and helpful legal assistant.

Instructions:
1. If the user's input is a common greeting, respond with a friendly greeting.
2. If the user asks about previous messages or conversation history (such as what they previously asked or discussed), answer using the Conversation History.
3. For all other questions, answer ONLY from the provided context.
4. If the answer to a legal or factual question is not in the context, say "I don't know".

Conversation History:
${formattedHistory}

Context:
${context}

Current Question:
${question}

Answer:
`;
      // 7) Send prompt to Gemini
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
      });
      
      // 8) Print final answer
     // console.log("\n================ FINAL ANSWER ================\n");
      results.points.forEach((point, index) => {
      //  console.log("\n==============================");
      //  console.log(`Result ${index + 1}`);
      //  console.log("==============================");
      //  console.log("Score:", point.score);
      //  console.log("File:", point.payload.file);
      //  console.log("\nChunk:\n");
      //  console.log(point.payload.text);
      });

      // 9) Return Answer to React
      res.json({
        answer: response.text,
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // -------------------------------------------------------------
  // QDRANT SETUP & PDF PARSING (Unchanged)
  // -------------------------------------------------------------
  // Safely check and create the Qdrant collection
  try {
    await client.createCollection("usa-laws", {
      vectors: {
        size: 384,
        distance: "Cosine",
      },
    });
    console.log("Collection 'usa-laws' created successfully.");
  } catch (error) {
    // A 409 status means it already exists, which is perfectly fine!
    if (error.status === 409) {
      console.log("Collection 'usa-laws' already exists. Skipping creation.");
    } else {
      console.error("Qdrant collection error:", error);
    }
  }

  // Get all files
  const files = fs.readdirSync(dataFolder);

  let pointId = 1;
  // Process each PDF
  for (const file of files) {
    if (path.extname(file).toLowerCase() !== ".pdf") {
      continue;
    }

    try {
      const dataBuffer = fs.readFileSync(path.join(dataFolder, file));
      const data = await pdf(dataBuffer);
      const chunks = await splitter.createDocuments([data.text]);

      for (const chunk of chunks) {
        const output = await extractor(chunk.pageContent, {
          pooling: "mean",
          normalize: true,
        });
        const embedding = Array.from(output.data);
        
        // Uncomment below to run Upsert logic
        /* 
        await client.upsert("usa-laws", {
          wait: true,
          points: [
            {
              id: pointId,
              vector: embedding,
              payload: {
                file: file,
                text: chunk.pageContent,
              },
            },
          ],
        });
        */
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

// Run the application
main();