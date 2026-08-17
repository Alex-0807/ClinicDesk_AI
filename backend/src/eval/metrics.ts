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
