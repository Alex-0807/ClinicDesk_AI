import "dotenv/config";
import { test, expect, vi, afterEach } from "vitest";
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
import { runAgent, runAgentResume } from "../../src/agent/index";
import {
  checkAvailability,
  getReservation,
  createReservation,
  modifyReservation,
  cancelReservation,
} from "../../src/services/reservation";

const fakeReservation: Awaited<ReturnType<typeof getReservation>> = {
  id: "abc-123",
  userId: "eval-user",
  date: new Date("2026-09-22T00:00:00.000Z"),
  startTime: new Date("2026-09-22T10:00:00.000Z"),
  endTime: new Date("2026-09-22T10:30:00.000Z"),
  serviceType: "Physiotherapy",
  status: "CONFIRMED",
  notes: null,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

// Every mockResolvedValueOnce() below is scoped to a single call, but clear
// call history between tests so `.not.toHaveBeenCalled()` in one test can't
// pass because of a leftover call recorded by a previous test.
afterEach(() => {
  vi.clearAllMocks();
});

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

test("Complete booking request pauses for confirmation, does not write", async () => {
  // Arrange: the agent needs checkAvailability to succeed so it can reach
  // the createReservation step. createReservation stays blocked — if the
  // confirmation gate were bypassed, this test would fail loudly instead of
  // silently creating a real reservation.
  vi.mocked(checkAvailability).mockResolvedValueOnce({
    available: true,
    conflicts: [],
  });

  const message =
    "Book me a Physiotherapy appointment on 2026-09-22 at 10:00.";

  // Act
  const result = await runAgent(message, [], "eval-user", "Alex");

  // Assert: paused for confirmation, not completed, and no write happened.
  expect(result.status).toBe("pending_confirmation");
  if (result.status === "pending_confirmation") {
    expect(result.description).toContain("2026-09-22");
  }
  expect(createReservation).not.toHaveBeenCalled();
}, 90_000);

test("Cancel-by-ID request pauses for confirmation, does not write", async () => {
  // Arrange: stub getReservation for however many times the agent looks the
  // reservation up (mockResolvedValue, not -Once, since it may re-check).
  vi.mocked(getReservation).mockResolvedValue(fakeReservation);

  // A single "cancel X" message tends to make the agent ask "are you sure?"
  // in plain chat before ever calling the cancel tool — sensible, but not
  // what this test needs. Model the realistic follow-up turn instead: the
  // user already confirmed, so the agent should now actually call the tool,
  // which is what the interrupt-based gate is there to catch.
  const history: ChatMessage[] = [
    { role: "human", content: "Cancel reservation abc-123." },
    {
      role: "assistant",
      content:
        "I found that reservation — Physiotherapy on 2026-09-22 at 10:00, status CONFIRMED. Are you sure you'd like to cancel it?",
    },
  ];
  const message = "Yes, please go ahead and cancel it.";

  // Act
  const result = await runAgent(message, history, "eval-user", "Alex");

  // Assert: paused for confirmation, no cancellation happened.
  expect(result.status).toBe("pending_confirmation");
  expect(cancelReservation).not.toHaveBeenCalled();
}, 90_000);

test("Approving a paused booking completes the write exactly once", async () => {
  // Arrange: same setup as the booking test above.
  vi.mocked(checkAvailability).mockResolvedValueOnce({
    available: true,
    conflicts: [],
  });

  const message =
    "Book me a Physiotherapy appointment on 2026-09-22 at 10:00.";

  const paused = await runAgent(message, [], "eval-user", "Alex");
  expect(paused.status).toBe("pending_confirmation");
  if (paused.status !== "pending_confirmation") return;

  // Now allow the write to succeed so we can prove approval reaches it.
  vi.mocked(createReservation).mockResolvedValueOnce(fakeReservation);

  // Act: approve the paused action on the same conversation.
  const result = await runAgentResume(
    paused.conversationId,
    "eval-user",
    true
  );

  // Assert: the agent finished, and the write happened exactly once.
  expect(result.status).toBe("done");
  expect(createReservation).toHaveBeenCalledTimes(1);
}, 180_000);