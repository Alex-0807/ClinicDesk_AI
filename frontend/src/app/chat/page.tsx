"use client";

import { useState, useRef, useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import { sendMessage, ChatMessage } from "@/lib/agent";

const TOOL_LABELS: Record<string, string> = {
  searchKnowledge: "Searched knowledge base",
  checkAvailability: "Checked availability",
  createReservation: "Created reservation",
  listReservations: "Listed reservations",
  getReservation: "Looked up reservation",
  modifyReservation: "Modified reservation",
  cancelReservation: "Cancelled reservation",
};

const SUGGESTIONS = [
  "What services does the clinic offer?",
  "Book me a physiotherapy session this Friday at 9am",
  "What are the clinic's cancellation fees?",
  "Show me my upcoming reservations",
];

interface Message {
  role: "human" | "assistant";
  content: string;
  toolsUsed?: string[];
  loading?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Sunrise Allied Health assistant. I can answer questions about our clinic or help you manage your appointments. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setInput("");
    const history: ChatMessage[] = messages
      .filter((m) => !m.loading)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { role: "human", content: message },
      { role: "assistant", content: "", loading: true },
    ]);
    setLoading(true);

    try {
      const response = await sendMessage(message, history);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: response.reply,
          toolsUsed: response.toolsUsed,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Clinic Assistant</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ask about clinic services or manage your appointments.
          </p>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "human" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "human"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                }`}
              >
                {msg.loading ? (
                  <span className="flex gap-1 items-center text-gray-400">
                    <span className="animate-bounce">•</span>
                    <span className="animate-bounce [animation-delay:0.15s]">•</span>
                    <span className="animate-bounce [animation-delay:0.3s]">•</span>
                  </span>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                        {msg.toolsUsed.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600 font-medium"
                          >
                            {TOOL_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (only shown when only the welcome message exists) */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 py-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="pt-3 border-t border-gray-200 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask something or describe what you'd like to do…"
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </RequireAuth>
  );
}
