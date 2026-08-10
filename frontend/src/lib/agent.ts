import { apiFetch } from "./api";

export interface ChatMessage {
  role: "human" | "assistant";
  content: string;
}

export interface AgentResponse {
  reply: string;
  toolsUsed: string[];
}

export function sendMessage(
  message: string,
  history: ChatMessage[]
): Promise<AgentResponse> {
  return apiFetch<AgentResponse>("/agent/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}
