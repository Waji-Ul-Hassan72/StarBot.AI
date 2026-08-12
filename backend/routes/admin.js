require("dotenv").config();
const express = require("express");
const router = express.Router();
const { XMLParser } = require("fast-xml-parser");

const { getTitleXml } = require("../services/ecfrService");
const { getEmbedding } = require("../services/embeddingService");
const { client } = require("../config/qdrant");

// Key Title 21 Parts (Food, Drugs, Dietary Supplements, Medical Devices)
const TITLE_21_MAJOR_PARTS = [
  1, 7, 11, 101, 102, 106, 111, 117, 130, 201, 210, 211, 310, 312, 314, 500, 600, 820
];

/**
 * Helper: Recursively parses eCFR XML DOM to extract all sections and paragraphs
 */
function extractXmlChunks(node, titleNumber, part, chunks = []) {
  if (!node || typeof node !== "object") return chunks;

  // Check if current node is a Regulation Section (DIV8 or SECTION in eCFR XML)
  const isSectionNode =
    node["@_TYPE"] === "SECTION" ||
    node["@_TYPE"] === "SUBSECTION" ||
    node.HEAD ||
    node.SECTNO;

  if (isSectionNode && (node.P || node.HEAD || node.SECTNO)) {
    const headText = node.HEAD ? (typeof node.HEAD === "string" ? node.HEAD : node.HEAD["#text"] || "") : "";
    const sectNo = node.SECTNO ? (typeof node.SECTNO === "string" ? node.SECTNO : node.SECTNO["#text"] || "") : "";
    
    // Extract paragraph texts
    let paragraphs = [];
    if (Array.isArray(node.P)) {
      paragraphs = node.P.map(p => (typeof p === "string" ? p : p["#text"] || JSON.stringify(p)));
    } else if (typeof node.P === "string") {
      paragraphs = [node.P];
    } else if (node.P && node.P["#text"]) {
      paragraphs = [node.P["#text"]];
    }

    const fullSectionText = `${sectNo} ${headText}\n${paragraphs.join("\n")}`.trim();

    // Split large regulation sections into ~1,000 character chunks for optimal RAG embeddings
    if (fullSectionText.length > 40) {
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < fullSectionText.length; i += CHUNK_SIZE) {
        const textChunk = fullSectionText.substring(i, i + CHUNK_SIZE);
        chunks.push({
          text: `[CFR Title ${titleNumber} Part ${part}] ${textChunk}`,
          section: headText || sectNo || `Part ${part}`,
          titleNumber: titleNumber,
          part: part,
        });
      }
    }
  }

  // Recursively process child nodes
  for (const key of Object.keys(node)) {
    if (key.startsWith("@_")) continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(item => extractXmlChunks(item, titleNumber, part, chunks));
    } else if (typeof child === "object") {
      extractXmlChunks(child, titleNumber, part, chunks);
    }
  }

  return chunks;
}

/**
 * Ingests a single part with full section-level chunking
 */
async function ingestSinglePart(date, titleNumber, part) {
  console.log(`\n⏳ [Admin] Fetching & parsing Title ${titleNumber} - Part ${part}...`);

  // 1. Fetch XML
  const rawXml = await getTitleXml(date, titleNumber, { part });

  // 2. Parse XML into DOM Object
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsedObj = parser.parse(rawXml);

  // 3. Extract hundreds/thousands of individual section text chunks
  const chunks = extractXmlChunks(parsedObj, titleNumber, part);

  if (chunks.length === 0) {
    console.log(`⚠️ No sections extracted for Part ${part}`);
    return 0;
  }

  console.log(`📦 Part ${part}: Extracted ${chunks.length} granular text chunks. Generating embeddings...`);

  // 4. Generate embeddings and build Qdrant points
  const pointsToUpsert = [];
  for (let i = 0; i < chunks.length; i++) {
    const item = chunks[i];
    try {
      const vector = await getEmbedding(item.text);

      pointsToUpsert.push({
        id: Date.now() + Math.floor(Math.random() * 1000000),
        vector: vector,
        payload: {
          text: item.text,
          section: item.section,
          titleNumber: item.titleNumber,
          part: item.part,
          source: "eCFR",
        },
      });
    } catch (err) {
      console.error(`Skipping chunk ${i} due to embedding error:`, err.message);
    }
  }

  // 5. Upsert to Qdrant in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < pointsToUpsert.length; i += BATCH_SIZE) {
    const batch = pointsToUpsert.slice(i, i + BATCH_SIZE);
    await client.upsert("usa-laws", { points: batch });
  }

  console.log(`✅ [Admin] Part ${part} complete! Stored ${pointsToUpsert.length} vectors in Qdrant.`);
  return pointsToUpsert.length;
}

/**
 * Background runner that loops through all parts automatically
 */
async function runAutoIngestion(date, titleNumber, partsList) {
  let totalStored = 0;
  console.log(`🚀 Starting deep ingestion for Title ${titleNumber} across ${partsList.length} parts...`);

  for (let i = 0; i < partsList.length; i++) {
    const part = partsList[i];
    try {
      console.log(`👉 Progress: Part ${i + 1} of ${partsList.length}`);
      const count = await ingestSinglePart(date, titleNumber, part);
      totalStored += count;
    } catch (err) {
      console.error(`❌ Failed Part ${part}:`, err.message);
    }
  }

  console.log(`\n🎉 [COMPLETE] Finished ingesting Title ${titleNumber}! Total vectors added: ${totalStored}`);
}

/**
 * POST /admin/ingest-ecfr
 */
router.post("/ingest-ecfr", (req, res) => {
  const titleNumber = req.body.titleNumber || 21;
  const date = req.body.date || "2026-01-01";
  const singlePart = req.body.part || null;
  const customParts = req.body.parts || null;

  let partsToProcess = [];
  if (singlePart) {
    partsToProcess = [singlePart];
  } else if (customParts && Array.isArray(customParts)) {
    partsToProcess = customParts;
  } else if (titleNumber === 21) {
    partsToProcess = TITLE_21_MAJOR_PARTS;
  } else {
    partsToProcess = [1];
  }

  res.json({
    status: "In Progress",
    message: `Deep ingestion started for Title ${titleNumber} (${partsToProcess.length} parts). Check terminal logs!`,
    partsTargeted: partsToProcess,
  });

  runAutoIngestion(date, titleNumber, partsToProcess).catch((err) => {
    console.error("[Background Ingestion Failed]:", err.message);
  });
});

module.exports = router;