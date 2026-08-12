let extractorInstance = null;

async function loadModel() {
  if (extractorInstance) return extractorInstance;
  //console.log("Loading MiniLM Embedding Model...");
  const { pipeline } = await import("@huggingface/transformers");

  extractorInstance = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  return extractorInstance;
}

async function getEmbedding(text) {
  const extractor = await loadModel();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}

module.exports = { loadModel, getEmbedding };