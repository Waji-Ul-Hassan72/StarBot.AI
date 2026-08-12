
//connecting your Node.js backend to Qdrant Cloud and creating a collection
const { QdrantClient } = require("@qdrant/js-client-rest");

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.Qdrant_API_KEY,
});

async function initQdrantCollection() {
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
}

module.exports = { client, initQdrantCollection };