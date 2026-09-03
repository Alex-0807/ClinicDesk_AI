import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { runAgent, runAgentResume, ChatMessage } from "../agent/index";

const router = Router();

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

    const result = await runAgent(
      message,
      history,
      req.user!.userId,
      req.user!.name,
      conversationId,
    );

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

    const result = await runAgentResume(conversationId, req.user!.userId, approved);

    res.json(result);
  } catch (err) {
    console.error("Agent resume error:", err);
    res.status(500).json({ error: "Agent failed to resume the request" });
  }
});

export default router;
