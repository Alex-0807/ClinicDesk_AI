interface RetrievedChunk {
  document_name: string;
}

/**
 * Reciprocal rank of the expected document within the retrieved chunks.
 * Returns 0 if the document never appears, or if no document is expected
 * (nothing to rank against).
 */
export function reciprocalRank(
  retrieved: RetrievedChunk[],
  expectedDocumentName: string | null,
): number {
  if (!expectedDocumentName) return 0;
  const rank = retrieved.findIndex((c) => c.document_name === expectedDocumentName);
  return rank === -1 ? 0 : 1 / (rank + 1);
}

export function isHit(
  retrieved: RetrievedChunk[],
  expectedDocumentName: string | null,
): boolean {
  if (!expectedDocumentName) return false;
  return retrieved.some((c) => c.document_name === expectedDocumentName);
}

/**
 * Fraction of expectedFacts (case-insensitive substrings) found in the reply text.
 * Returns null when there are no facts to check (nothing meaningful to score).
 */
export function factCoverage(reply: string, expectedFacts: string[]): number | null {
  if (expectedFacts.length === 0) return null;
  const haystack = reply.toLowerCase();
  const found = expectedFacts.filter((fact) => haystack.includes(fact.toLowerCase()));
  return found.length / expectedFacts.length;
}

const ABSTAIN_KEYWORDS = [
  "don't have",
  "do not have",
  "couldn't find",
  "could not find",
  "no information",
  "not able to find",
  "outside",
  "unrelated",
  "sorry",
];

/**
 * Best-effort, deterministic signal for whether the reply declined to answer
 * rather than hallucinating from irrelevant sources. Informational only —
 * not a scored pass/fail, since wording isn't guaranteed.
 */
export function looksLikeAbstain(reply: string): boolean {
  const lower = reply.toLowerCase();
  return ABSTAIN_KEYWORDS.some((kw) => lower.includes(kw));
}
