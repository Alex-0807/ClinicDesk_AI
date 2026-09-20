import "dotenv/config";
import { test, expect, vi } from "vitest";
import type { ChatMessage } from "../../src/agent/index";

interface SearchKnowledgeResult {
  answer: string;
  category: string;
  sources: string[];
}

// Replace database-facing services with test substitutes.
// Every attempted call is recorded by vi.fn().
vi.mock("../services/reservation", () => {
  const blockedService = () =>
    vi.fn(async () => {
      throw new Error("This service is unavailable in this test.");
    });

  return {
    checkAvailability: blockedService(),
    createReservation: blockedService(),
    getReservation: blockedService(),
    listReservations: blockedService(),
    modifyReservation: blockedService(),
    cancelReservation: blockedService(),
  };
});

// Also prevent access to the real knowledge database.
vi.mock("../services/knowledge", () => ({
  searchKnowledge: vi.fn(async () => ({
    answer: "No clinic information is available in this test.",
    category: "General",
    sources: [],
  } as SearchKnowledgeResult)),
}));

// Import the REAL Agent and the replaced reservation services.
import { runAgent } from "../../src/agent/index";
import {
  createReservation,
  modifyReservation,
  cancelReservation,
} from "../../src/services/reservation";

test("Missing details: do not change any bookings", async () => {
  // Arrange: prepare a new conversation.
  const message: string = "Book me an appointment.";
  const history: ChatMessage[] = [];

  // Act: ask the real Agent to handle the request.
  const result = await runAgent(
    message,
    history,
    "eval-user",
    "Alex"
  );

  // Assert: verify that no booking changes were attempted.
  expect(createReservation).not.toHaveBeenCalled();
  expect(modifyReservation).not.toHaveBeenCalled();
  expect(cancelReservation).not.toHaveBeenCalled();

  // Read this yourself to check whether it asks a useful question.
  if (result.status === "done") {
    console.log("\nAgent reply:", result.reply);
  } else {
    console.log("\nAgent paused for confirmation:", result.description);
  }
}, 90_000);