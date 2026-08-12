const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const { getRerankedContext } = require("../routes/ragPipeline");

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const question = req.body.prompt || req.body.question;
    const history = req.body.history || [];

    // 1) Prompt Validation
    if (!question) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (question.length > 1000) {
      return res.status(400).json({
        error: "Your question exceeds the maximum allowed limit of 1000 characters."
      });
    }

    // 2) Call RAG & Reranking Pipeline
    let ragResult = { finalPoints: [], bestScore: 0, isReranked: false };
    try {
      ragResult = await getRerankedContext(question);
    } catch (ragErr) {
      console.warn("RAG Pipeline warning:", ragErr.message);
    }
  
    const { finalPoints = [], bestScore = 0, isReranked = false } = ragResult;
    const SIMILARITY_THRESHOLD = isReranked ? 0.35 : 0.70;

    let context = "";
    let systemInstruction = "";
    const temperature = 0.1;

    const formattedHistory = history
      .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
      .join("\n");

    // COMMON STRICT RULES FOR BOTH BRANCHES
    const formattingRules = `
CRITICAL RESPONSE RULES:
1. NO PREAMBLE / NO INTRO FLUFF: Jump DIRECTLY into answering the user's question on the very first sentence.
2. NEVER start with filler greetings like "Hello again", "Good day", "I'm here to help", or "Sure, here is".
3. ONLY respond with a greeting if the user explicitly greets you first (e.g., "Hi", "Hello", "Hey").
4. Keep the response direct, professional, and logical.
`;

    if (bestScore >= SIMILARITY_THRESHOLD && finalPoints.length > 0) {
      finalPoints.forEach((point, index) => {
        context += `Chunk ${index + 1}:\n${point.payload?.text || ""}\n\n`;
      });

      systemInstruction = `
You are a professional US Legal & Constitutional AI Assistant.

${formattingRules}

SPECIFIC INSTRUCTIONS:
- Answer the question clearly and accurately using ONLY the provided document context.
- DO NOT use system metadata terms like "based on context". Speak naturally.
      `;
    } else {
      systemInstruction = `
You are a professional US Legal & Constitutional AI Assistant.

${formattingRules}

SPECIFIC INSTRUCTIONS:
1. LEGAL QUESTIONS: Answer accurately using general US legal knowledge.
2. OUT-OF-DOMAIN TOPICS: Gracefully decline non-legal questions.
      `;
    }

    const fullPrompt = `
Conversation History:
${formattedHistory}

Document Context:
${context || "No relevant document context found."}

Current Question:
${question}

Answer:
`;

    // 3) Groq Fast Models to Attempt (Fallback order)
    const modelsToTry = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama3-70b-8192"
    ];

    let textResponse = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Groq API] Attempting generation with model: ${modelName}`);

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: systemInstruction
            },
            {
              role: "user",
              content: fullPrompt
            }
          ],
          model: modelName,
          temperature: temperature,
          max_tokens: 1024,
        });

        textResponse = completion.choices[0]?.message?.content || "";
        if (textResponse) {
          console.log(`[Groq API] Success using model: ${modelName}`);
          break; // Exit model loop instantly on success
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Groq API] Model ${modelName} failed:`, err.message);
      }
    }

    if (!textResponse) {
      throw lastError || new Error("All Groq models failed to generate a response.");
    }

    return res.json({ answer: textResponse });

  } catch (error) {
    console.error("Unhandled server error in Groq chat execution:", error);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});

module.exports = router;