import prisma from "../lib/prisma";

interface RetrievedChunk {
  id: string;
  content: string;
  document_id: string;
  document_name: string;
  similarity: number;
}

/**
 * Find the most relevant chunks for a given query embedding
 * using pgvector cosine similarity search.
 */
export async function retrieveChunks(
  queryEmbedding: number[],
  topK = 5,
): Promise<RetrievedChunk[]> {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    throw new Error("queryEmbedding must be a non-empty number array.");
  }

  if (!queryEmbedding.every((n) => Number.isFinite(n))) {
    throw new Error("queryEmbedding must contain only finite numbers.");
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error("topK must be a positive integer.");
  }

  const vectorStr = `[${queryEmbedding.join(",")}]`;

  try {
    const results = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
      `SELECT
         c.id,
         c.content,
         c.document_id,
         d.name AS document_name,
         1 - (c.embedding <=> $1::vector) AS similarity
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      vectorStr,
      topK,
    );

    return results;
  } catch (error) {
    throw new Error("Failed to retrieve relevant chunks from the database.");
  }
}
