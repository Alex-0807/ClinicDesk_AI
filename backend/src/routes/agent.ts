import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { runAgent, runAgentResume, ChatMessage, AgentResponse } from "../agent/index";
import prisma from "../lib/prisma";

const router = Router();

// Logging must never break the response the user is waiting on, so failures
// are reported and swallowed here.
async function logChat(
  userId: string,
  userMessage: string,
  result: AgentResponse,
  latencyMs: number
): Promise<void> {
  try {
    await prisma.chatLog.create({
      data: {
        userId,
        conversationId: result.conversationId,
        userMessage,
        agentReply: result.status === "done" ? result.reply : result.description,
        toolsUsed: result.status === "done" ? result.toolsUsed : [],
        latencyMs,
      },
    });
  } catch (err) {
    console.error("Failed to write chat log:", err);
  }
}

// POST /api/agent/chat
// Body: { message: string, history?: { role: "human"|"assistant", content: string }[], conversationId?: string }
router.post("/chat", authenticate, async (req: Request, res: Response) => {
  try {
    const { message, history = [], conversationId } = req.body as {
      message: string;
      history: ChatMessage[];
      conversationId?: string;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const start = Date.now();
    const result = await runAgent(
      message,
      history,
      req.user!.userId,
      req.user!.name,
      conversationId,
    );
    await logChat(req.user!.userId, message, result, Date.now() - start);

    res.json(result);
  } catch (err) {
    console.error("Agent error:", err);
    res.status(500).json({ error: "Agent failed to process the request" });
  }
});

// POST /api/agent/resume
// Body: { conversationId: string, approved: boolean }
// Continues an agent run that paused for write-action confirmation.
router.post("/resume", authenticate, async (req: Request, res: Response) => {
  try {
    const { conversationId, approved } = req.body as {
      conversationId: string;
      approved: boolean;
    };

    if (!conversationId || typeof approved !== "boolean") {
      res.status(400).json({ error: "conversationId and approved are required" });
      return;
    }

    const start = Date.now();
    const result = await runAgentResume(conversationId, req.user!.userId, approved);
    await logChat(
      req.user!.userId,
      approved ? "[Approved]" : "[Denied]",
      result,
      Date.now() - start
    );

    res.json(result);
  } catch (err) {
    console.error("Agent resume error:", err);
    res.status(500).json({ error: "Agent failed to resume the request" });
  }
});

export default router;
