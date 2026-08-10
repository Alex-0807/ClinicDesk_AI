import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock external dependencies so tests run without API keys or a database
// ---------------------------------------------------------------------------

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: class {
    bindTools() { return this; }
    invoke() { return Promise.resolve({ content: "" }); }
  },
}));

vi.mock("@langchain/langgraph/prebuilt", () => ({
  createReactAgent: vi.fn(),
}));

vi.mock("../services/knowledge", () => ({
  searchKnowledge: vi.fn(),
}));

vi.mock("../services/reservation", () => ({
  checkAvailability: vi.fn(),
  createReservation: vi.fn(),
  getReservation: vi.fn(),
  listReservations: vi.fn(),
  modifyReservation: vi.fn(),
  cancelReservation: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { runAgent } from "./index";
import { searchKnowledge } from "../services/knowledge";
import { listReservations, checkAvailability } from "../services/reservation";

const mockCreateReactAgent = vi.mocked(createReactAgent);
const mockSearchKnowledge = vi.mocked(searchKnowledge);
const mockListReservations = vi.mocked(listReservations);
const mockCheckAvailability = vi.mocked(checkAvailability);

// ---------------------------------------------------------------------------
// Helper: build a fake agent that immediately returns a canned reply
// ---------------------------------------------------------------------------

function makeFakeAgent(reply: string, toolsInvoked: string[] = []) {
  return {
    invoke: vi.fn().mockResolvedValue({
      messages: [{ content: reply }],
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runAgent", () => {
  const USER_ID = "user-123";
  const USER_NAME = "Alex";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a reply string and empty toolsUsed when agent responds directly", async () => {
    mockCreateReactAgent.mockReturnValue(makeFakeAgent("Hello! How can I help?") as never);

    const result = await runAgent("Hi", [], USER_ID, USER_NAME);

    expect(result.reply).toBe("Hello! How can I help?");
    expect(Array.isArray(result.toolsUsed)).toBe(true);
  });

  it("passes conversation history to the agent as messages", async () => {
    const fakeAgent = makeFakeAgent("The clinic is open Monday to Friday.");
    mockCreateReactAgent.mockReturnValue(fakeAgent as never);

    const history = [
      { role: "human" as const, content: "What are your hours?" },
      { role: "assistant" as const, content: "We are open weekdays." },
    ];

    await runAgent("Can you repeat that?", history, USER_ID, USER_NAME);

    // The agent's invoke should have been called with 3 messages (2 history + 1 new)
    const invokeCall = fakeAgent.invoke.mock.calls[0][0];
    expect(invokeCall.messages).toHaveLength(3);
  });

  it("creates the agent with the correct number of tools", async () => {
    mockCreateReactAgent.mockReturnValue(makeFakeAgent("ok") as never);

    await runAgent("test", [], USER_ID, USER_NAME);

    const callArgs = mockCreateReactAgent.mock.calls[0][0];
    // 7 tools: searchKnowledge, checkAvailability, createReservation,
    //          listReservations, getReservation, modifyReservation, cancelReservation
    expect(callArgs.tools).toHaveLength(7);
  });

  it("injects today's date and user name into the system prompt", async () => {
    mockCreateReactAgent.mockReturnValue(makeFakeAgent("ok") as never);

    await runAgent("test", [], USER_ID, USER_NAME);

    const callArgs = mockCreateReactAgent.mock.calls[0][0];
    const prompt = callArgs.prompt as string;

    expect(prompt).toContain(USER_NAME);
    expect(prompt).toContain(USER_ID);
    // Date format YYYY-MM-DD
    expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("handles empty history without crashing", async () => {
    mockCreateReactAgent.mockReturnValue(makeFakeAgent("Sure!") as never);

    const result = await runAgent("Book me an appointment", [], USER_ID, USER_NAME);

    expect(result.reply).toBe("Sure!");
  });

  it("returns toolsUsed as an empty array when no callbacks fire", async () => {
    mockCreateReactAgent.mockReturnValue(makeFakeAgent("Done.") as never);

    const result = await runAgent("test", [], USER_ID, USER_NAME);

    expect(result.toolsUsed).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tool unit tests — test each tool function independently
// ---------------------------------------------------------------------------

describe("searchKnowledge tool (service layer)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns answer and sources", async () => {
    mockSearchKnowledge.mockResolvedValue({
      answer: "We offer physiotherapy and psychology.",
      category: "Services",
      sources: [{ chunkId: "c1", snippet: "physio...", documentName: "services.pdf" }],
    });

    const result = await searchKnowledge("What services do you offer?");

    expect(result.answer).toContain("physiotherapy");
    expect(result.sources).toHaveLength(1);
  });

  it("returns empty sources when no documents found", async () => {
    mockSearchKnowledge.mockResolvedValue({
      answer: "No information found.",
      category: "General",
      sources: [],
    });

    const result = await searchKnowledge("random question");

    expect(result.sources).toHaveLength(0);
  });
});

describe("checkAvailability tool (service layer)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns available true when slot is free", async () => {
    mockCheckAvailability.mockResolvedValue({ available: true, conflicts: [] });

    const result = await checkAvailability({
      date: "2026-07-14",
      startTime: "09:00",
      endTime: "09:30",
    });

    expect(result.available).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  it("returns available false with conflicts when slot is taken", async () => {
    mockCheckAvailability.mockResolvedValue({
      available: false,
      conflicts: [
        {
          id: "res-1",
          startTime: new Date("2026-07-14T09:00:00Z"),
          endTime: new Date("2026-07-14T09:30:00Z"),
          serviceType: "Physiotherapy",
        },
      ],
    });

    const result = await checkAvailability({
      date: "2026-07-14",
      startTime: "09:00",
      endTime: "09:30",
    });

    expect(result.available).toBe(false);
    expect(result.conflicts).toHaveLength(1);
  });
});

describe("listReservations tool (service layer)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reservations filtered by userId", async () => {
    const fakeReservation = {
      id: "res-abc",
      userId: "user-123",
      date: new Date("2026-07-14T00:00:00Z"),
      startTime: new Date("2026-07-14T09:00:00Z"),
      endTime: new Date("2026-07-14T09:30:00Z"),
      serviceType: "Physiotherapy",
      status: "CONFIRMED" as const,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockListReservations.mockResolvedValue([fakeReservation]);

    const results = await listReservations({ userId: "user-123" });

    expect(results).toHaveLength(1);
    expect(results[0].serviceType).toBe("Physiotherapy");
  });

  it("returns empty array when no reservations match", async () => {
    mockListReservations.mockResolvedValue([]);

    const results = await listReservations({ userId: "user-999" });

    expect(results).toHaveLength(0);
  });
});
