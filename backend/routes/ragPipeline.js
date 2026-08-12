const { CohereClient } = require("cohere-ai");
const { client } = require("../config/qdrant");
const { getEmbedding } = require("../services/embeddingService");

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

/**
 * Executes Two-Stage Retrieval: Qdrant Vector Search (Top 25) + Cohere Rerank (Top 5)
 * @param {string} question - User question string
 * @returns {Promise<{ finalPoints: Array, bestScore: number, isReranked: boolean }>}
 */
async function getRerankedContext(question) {
  // 1) Generate mbedding for the question
  const questionEmbedding = await getEmbedding(question);

  // 2) Stage 1: Pre-ranking (Fetch Top 30 candidates from Qdrant)
  const candidateResults = await client.query("usa-laws", {
    query: questionEmbedding,
    limit: 30,
    with_payload: true,
  });

  const candidatePoints = candidateResults.points || [];

  if (candidatePoints.length === 0) {
    return { finalPoints: [], bestScore: 0, isReranked: false };
  }

  // 3) Stage 2: Cohere Cross-Encoder Reranking
  try {
    const documentsToRank = candidatePoints.map((point) => point.payload.text);

    const rerankResponse = await cohere.rerank({
      model: "rerank-english-v3.0",
      query: question,
      documents: documentsToRank,
      topN: 5, // Select top 5 after re-scoring
    });

    // Map reranked results back to original document objects
    const finalPoints = rerankResponse.results.map((result) => ({
      ...candidatePoints[result.index],
      rerankScore: result.relevanceScore,
    }));

    const bestScore = finalPoints.length > 0 ? finalPoints[0].rerankScore : 0;
    console.log(`[RAG Pipeline] Reranked ${candidatePoints.length} docs -> Top Score: ${bestScore.toFixed(2)}`);

    return { finalPoints, bestScore, isReranked: true };

  } catch (error) {
    console.warn("[RAG Pipeline] Cohere Rerank failed, falling back to raw vector search:", error.message);
    
    // Fallback: Return Top 5 raw Qdrant vector results
    const finalPoints = candidatePoints.slice(0, 5);
    const bestScore = finalPoints.length > 0 ? finalPoints[0].score : 0;

    return { finalPoints, bestScore, isReranked: false };
  }
}

module.exports = { getRerankedContext };