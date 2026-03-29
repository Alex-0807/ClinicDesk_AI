import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

interface RetrievedChunk {
  id: string;
  content: string;
  document_name: string;
  similarity: number;
}

interface GeneratedReply {
  category: string;
  draftReply: string;
  sources: { chunkId: string; snippet: string; documentName: string }[];
}

/**
 * Given a patient enquiry and retrieved document chunks,
 * ask Claude to generate a category label, draft reply, and source citations.
 */
export async function generateReply(
  question: string,
  chunks: RetrievedChunk[],
): Promise<GeneratedReply> {
  const sourceContext = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1} — ${c.document_name}]\n${c.content}`,
    )
    .join("\n\n");

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a helpful clinic admin assistant for Sunrise Allied Health Clinic.
You help staff draft replies to patient enquiries using ONLY the provided source documents.

Rules:
- ONLY use information from the provided sources. Do not make up information.
- Do NOT give medical advice, diagnoses, or emergency triage.
- Be warm, professional, and concise.
- If the sources don't contain enough information to answer, say so honestly.

You must respond with valid JSON in this exact format:
{
  "category": "<one of: Fees, Referral, Cancellation, Telehealth, Services, General>",
  "draftReply": "<the draft reply text for the patient>"
}`,
    messages: [
      {
        role: "user",
        content: `Here are the relevant clinic documents:

${sourceContext}

---

Patient enquiry:
"${question}"

Generate a category label and draft reply based ONLY on the sources above. Respond with valid JSON only.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse Claude's JSON response
  const parsed = JSON.parse(text);

  return {
    category: parsed.category,
    draftReply: parsed.draftReply,
    sources: chunks.map((c) => ({
      chunkId: c.id,
      snippet: c.content.slice(0, 200),
      documentName: c.document_name,
    })),
  };
}
