import { describe, it, expect } from "vitest";
import { chunkText } from "./chunker";

describe("chunkText", () => {
  it("should split multiple short paragraphs into chunks when combined length exceeds maxChars", () => {
    const text =
      "Hello world.\n\nI like cats.\n\nCats are so very cool.\n\nBye!";
    // We expect it to break the text up. We'll use 20 max, 5 overlap.
    // Because "Cats are so very cool." is 22 chars, our new aggressive chopper will split it into [20 chars], [2 chars].
    const result = chunkText(text, 20, 5);

    expect(result.length).toBeGreaterThan(1);
    // ensure no chunk is longer than maxChars + overlap + space (26)
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(26);
    }
  });

  it("should aggressively split a giant paragraph but allow slight maxChars overflow for overlap", () => {
    // 74 characters long.
    const text =
      "This is a massive paragraph with no line breaks that exceeds twenty chars.";
    const result = chunkText(text, 20, 5);

    expect(result.length).toBeGreaterThan(1);

    // We allow a chunk to be `maxChars + overlap + 1 (space)` = 26 max.
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(26);
    }
  });

  it("should handle empty strings without crashing", () => {
    const text = "";
    const result = chunkText(text, 20, 5);

    expect(result).toHaveLength(0);
  });

  it("should ignore extra whitespace and empty paragraphs", () => {
    const text = "Line 1\n\n\n\n   \n\nLine 2";
    // even though max is 50, it combines them
    const result = chunkText(text, 50, 5);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Line 1\n\nLine 2");
  });
});
