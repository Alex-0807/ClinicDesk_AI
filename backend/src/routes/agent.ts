import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { runAgent, ChatMessage } from "../agent/index";

const router = Router();

// POST /api/agent/chat
// Body: { message: string, history?: { role: "human"|"assistant", content: string }[] }
router.post("/chat", authenticate, async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history: ChatMessage[];
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const { reply, toolsUsed } = await runAgent(
      message,
      history,
      req.user!.userId,
      req.user!.name,
    );

    res.json({ reply, toolsUsed });
  } catch (err) {
    console.error("Agent error:", err);
    res.status(500).json({ error: "Agent failed to process the request" });
  }
});

export default router;
