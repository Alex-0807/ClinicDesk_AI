import { apiFetch } from "./api";

export interface ChatMessage {
  role: "human" | "assistant";
  content: string;
}

export type AgentResponse =
  | { status: "done"; conversationId: string; reply: string; toolsUsed: string[] }
  | { status: "pending_confirmation"; conversationId: string; description: string };

export function sendMessage(
  message: string,
  history: ChatMessage[],
  conversationId?: string
): Promise<AgentResponse> {
  return apiFetch<AgentResponse>("/agent/chat", {
    method: "POST",
    body: JSON.stringify({ message, history, conversationId }),
  });
}

export function resumeAction(
  conversationId: string,
  approved: boolean
): Promise<AgentResponse> {
  return apiFetch<AgentResponse>("/agent/resume", {
    method: "POST",
    body: JSON.stringify({ conversationId, approved }),
  });
}
