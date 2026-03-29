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
  const vectorStr = `[${queryEmbedding.join(",")}]`;

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
}
