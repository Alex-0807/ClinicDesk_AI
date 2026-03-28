import OpenAI from "openai";

// Lazy init — only created when first needed, so the server can start without a key
let openai: OpenAI;
function getClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

/**
 * Generate an embedding vector for a single text string.
 * Returns a 1536-dimensional array (text-embedding-3-small).
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * More efficient than calling embedText() in a loop.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  // Sort by index to ensure order matches input
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
