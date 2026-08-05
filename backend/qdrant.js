const { QdrantClient } = require("@qdrant/js-client-rest");

//coonect node.js to qdrant server
const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

module.exports = client;