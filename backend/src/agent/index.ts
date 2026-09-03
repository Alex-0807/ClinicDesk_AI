import { randomUUID } from "crypto";
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Command, INTERRUPT, MemorySaver, isInterrupted } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import {
  searchKnowledgeTool,
  checkAvailabilityTool,
  createReservationTool,
  listReservationsTool,
  getReservationTool,
  modifyReservationTool,
  cancelReservationTool,
  PendingAction,
} from "./tools";

export interface ChatMessage {
  role: "human" | "assistant";
  content: string;
}

export type AgentResponse =
  | { status: "done"; conversationId: string; reply: string; toolsUsed: string[] }
  | { status: "pending_confirmation"; conversationId: string; description: string };

interface ThreadOwner {
  userId: string;
  userName: string;
}

// In-memory checkpointer + thread ownership map. Both reset on server restart —
// acceptable for this MVP, but it means a paused confirmation won't survive a redeploy.
const checkpointer = new MemorySaver();
const threadOwners = new Map<string, ThreadOwner>();

function buildSystemPrompt(userId: string, userName: string): string {
  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-AU", { weekday: "long" });
  return `You are a helpful assistant for Sunrise Allied Health Clinic.
You help patients and staff with two things:
1. Answering questions about the clinic (services, fees, policies, hours) using the knowledge base.
2. Managing appointment reservations (check availability, book, view, modify, cancel).

Current context:
- Today is ${dayName}, ${today}
- You are assisting: ${userName} (user ID: ${userId})
- Clinic hours: Monday–Friday, 08:00–18:00
- All appointments are 30 minutes

Guidelines:
- For any question about clinic information, always use searchKnowledge — never answer from memory.
- For booking requests, always check availability before creating a reservation.
- When the user wants to cancel or modify but doesn't give an ID, use listReservations to find it first.
- Be concise and friendly.
- Do not give medical advice or diagnoses.`;
}

function buildAgent(userId: string, userName: string) {
  const model = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const tools = [
    searchKnowledgeTool,
    checkAvailabilityTool,
    createReservationTool(userId),
    listReservationsTool(userId),
    getReservationTool,
    modifyReservationTool,
    cancelReservationTool,
  ];

  return createReactAgent({
    llm: model,
    tools,
    prompt: buildSystemPrompt(userId, userName),
    checkpointer,
  });
}

function toAgentResponse(
  result: unknown,
  conversationId: string,
  toolsUsed: string[]
): AgentResponse {
  if (isInterrupted<PendingAction>(result)) {
    return {
      status: "pending_confirmation",
      conversationId,
      description: result[INTERRUPT][0].value!.summary,
    };
  }

  const messages = (result as { messages: BaseMessage[] }).messages;
  const lastMessage = messages[messages.length - 1];
  const reply =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  return { status: "done", conversationId, reply, toolsUsed };
}

function toolTrackingCallback(toolsUsed: string[]) {
  return {
    handleToolStart(
      _tool: unknown,
      _input: string,
      _runId: string,
      _parentRunId?: string,
      _tags?: string[],
      _metadata?: Record<string, unknown>,
      name?: string
    ) {
      if (name) toolsUsed.push(name);
    },
  };
}

export async function runAgent(
  message: string,
  history: ChatMessage[],
  userId: string,
  userName: string,
  conversationId: string = randomUUID()
): Promise<AgentResponse> {
  threadOwners.set(conversationId, { userId, userName });
  const agent = buildAgent(userId, userName);

  const historyMessages: BaseMessage[] = history.map((m) =>
    m.role === "human" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const toolsUsed: string[] = [];

  const result = await agent.invoke(
    { messages: [...historyMessages, new HumanMessage(message)] },
    {
      configurable: { thread_id: conversationId },
      callbacks: [toolTrackingCallback(toolsUsed)],
    }
  );

  return toAgentResponse(result, conversationId, toolsUsed);
}

export async function runAgentResume(
  conversationId: string,
  userId: string,
  approved: boolean
): Promise<AgentResponse> {
  const owner = threadOwners.get(conversationId);
  if (!owner || owner.userId !== userId) {
    throw new Error("No pending confirmation found for this user.");
  }

  const agent = buildAgent(owner.userId, owner.userName);
  const toolsUsed: string[] = [];

  const result = await agent.invoke(new Command({ resume: { approved } }), {
    configurable: { thread_id: conversationId },
    callbacks: [toolTrackingCallback(toolsUsed)],
  });

  return toAgentResponse(result, conversationId, toolsUsed);
}
