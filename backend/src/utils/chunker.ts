/**
 * Splits text into overlapping chunks of roughly `maxChars` characters.
 * It first tries to break at paragraph boundaries.
 * If a paragraph is too long, it aggressively splits it to strictly enforce the size limit.
 */
export function chunkText(
  text: string,
  maxChars = 500,
  overlap = 50,
): string[] {
  const chunks: string[] = [];

  // 1. First, split by paragraphs
  const paragraphs = text.split(/\n\n+/);

  // 2. We need a helper to safely chop down massive blocks of text
  // that don't have natural line breaks into smaller 'pieces'.
  const pieces: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxChars) {
      // If a single paragraph is bigger than our max limit,
      // we brutally chop it into smaller maxChar-sized segments.
      let remaining = trimmed;
      while (remaining.length > 0) {
        pieces.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
    } else {
      pieces.push(trimmed);
    }
  }

  // 3. Now pack the pieces into chunks with overlap
  let current = "";

  for (const piece of pieces) {
    if (current.length + piece.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // We keep the tail for overlap. It is OK if tail + piece slightly
      // exceeds maxChars for this specific new chunk, as long as the base piece is <= maxChars.
      const tail = current.slice(-overlap);
      current = tail + " " + piece;
    } else {
      current = current ? current + "\n\n" + piece : piece;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
