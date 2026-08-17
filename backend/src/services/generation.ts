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

type AnswerReason = "ANSWERED" | "OUT_OF_SCOPE" | "INSUFFICIENT_CONTEXT";

interface GeneratedReply {
  category: string;
  answered: boolean;
  reason: AnswerReason;
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
    .map((c, i) => `[Source ${i + 1} — ${c.document_name}]\n${c.content}`)
    .join("\n\n");

  const response = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are a helpful clinic admin assistant for Sunrise Allied Health Clinic.
You help staff draft replies to patient enquiries using ONLY the provided source documents.

Rules:
- ONLY use information from the provided sources. Do not make up information.
- Do NOT give medical advice, diagnoses, or emergency triage.
- Be warm, professional, and concise.
- First decide whether the enquiry can be answered from the clinic knowledge base.
- If the enquiry is unrelated to Sunrise Allied Health Clinic, its services, appointments, fees, referrals, policies, or other clinic-related matters:
  - set "answered" to false
  - set "reason" to "OUT_OF_SCOPE"
  - briefly explain that you can only help with clinic-related enquiries
- If the enquiry is clinic-related but the provided sources do not contain enough information to answer it:
  - set "answered" to false
  - set "reason" to "INSUFFICIENT_CONTEXT"
  - say that the available clinic information does not contain enough information to answer
- If the provided sources support an answer:
  - set "answered" to true
  - set "reason" to "ANSWERED"
  - answer using only the provided sources
- The category and answerability decision are separate. A "General" category does not automatically mean the question is out of scope.

You must respond with valid JSON in this exact format:
{
  "category": "<one of: Fees, Referral, Cancellation, Telehealth, Services, General>",
  "answered": <true or false>,
  "reason": "<one of: ANSWERED, OUT_OF_SCOPE, INSUFFICIENT_CONTEXT>",
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

Decide the category and whether the enquiry is answerable, then generate the draft reply based ONLY on the sources above. Respond with valid JSON only.`,
      },
    ],
  });

  let text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code block formatting if Claude included it
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\n/, "").replace(/\n```$/, "");
  }

  // Parse Claude's JSON response
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Claude's response as JSON. Raw text:", text);
    throw new Error("AI response was not valid JSON");
  }

  const validCategories = [
    "Fees",
    "Referral",
    "Cancellation",
    "Telehealth",
    "Services",
    "General",
  ];
  const validReasons: AnswerReason[] = [
    "ANSWERED",
    "OUT_OF_SCOPE",
    "INSUFFICIENT_CONTEXT",
  ];

  if (
    !validCategories.includes(parsed.category) ||
    typeof parsed.answered !== "boolean" ||
    !validReasons.includes(parsed.reason) ||
    typeof parsed.draftReply !== "string"
  ) {
    console.error("Claude returned an unexpected response shape:", parsed);
    throw new Error("AI response had an invalid structure");
  }

  if (
    (parsed.answered && parsed.reason !== "ANSWERED") ||
    (!parsed.answered && parsed.reason === "ANSWERED")
  ) {
    console.error("Claude returned inconsistent answerability fields:", parsed);
    throw new Error("AI response had inconsistent answerability fields");
  }

  return {
    category: parsed.category,
    answered: parsed.answered,
    reason: parsed.reason,
    draftReply: parsed.draftReply,
    sources: chunks.map((c) => ({
      chunkId: c.id,
      snippet: c.content.slice(0, 200),
      documentName: c.document_name,
    })),
  };
}
