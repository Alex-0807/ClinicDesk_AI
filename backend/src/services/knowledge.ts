import { embedText } from "./embedding";
import { retrieveChunks } from "./retrieval";
import { generateReply } from "./generation";

export interface KnowledgeResult {
  answer: string;
  category: string;
  sources: { chunkId: string; snippet: string; documentName: string }[];
}

/**
 * Full RAG pipeline as a plain callable function.
 * Embeds the question, retrieves relevant chunks, generates a reply.
 * Used by both the /api/enquiries route and the LangChain agent tool.
 */
export async function searchKnowledge(question: string): Promise<KnowledgeResult> {
  const queryEmbedding = await embedText(question);
  const chunks = await retrieveChunks(queryEmbedding, 5);

  if (chunks.length === 0) {
    return {
      answer: "I couldn't find any relevant information in the clinic documents. Please make sure documents have been uploaded.",
      category: "General",
      sources: [],
    };
  }

  const { category, draftReply, sources } = await generateReply(question, chunks);

  return { answer: draftReply, category, sources };
}
