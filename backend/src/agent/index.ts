import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import {
  searchKnowledgeTool,
  checkAvailabilityTool,
  createReservationTool,
  listReservationsTool,
  getReservationTool,
  modifyReservationTool,
  cancelReservationTool,
} from "./tools";

export interface ChatMessage {
  role: "human" | "assistant";
  content: string;
}

export interface AgentResponse {
  reply: string;
  toolsUsed: string[];
}

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

export async function runAgent(
  message: string,
  history: ChatMessage[],
  userId: string,
  userName: string
): Promise<AgentResponse> {
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

  const agent = createReactAgent({
    llm: model,
    tools,
    prompt: buildSystemPrompt(userId, userName),
  });

  // Convert history to LangChain message format
  const historyMessages: BaseMessage[] = history.map((m) =>
    m.role === "human" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const toolsUsed: string[] = [];

  const result = await agent.invoke(
    { messages: [...historyMessages, new HumanMessage(message)] },
    {
      callbacks: [
        {
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
        },
      ],
    }
  );

  const lastMessage = result.messages[result.messages.length - 1];
  const reply =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  return { reply, toolsUsed };
}
