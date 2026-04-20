import { Router } from "express";
import prisma from "../lib/prisma";
import { embedText } from "../services/embedding";
import { retrieveChunks } from "../services/retrieval";
import { generateReply } from "../services/generation";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// POST /api/enquiries — the full RAG pipeline
router.post("/", authenticate, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      res.status(400).json({ error: "question is required" });
      return;
    }

    // 1. Embed the question
    const queryEmbedding = await embedText(question);

    // 2. Retrieve relevant chunks via pgvector similarity search
    const chunks = await retrieveChunks(queryEmbedding, 5);

    if (chunks.length === 0) {
      res.status(404).json({
        error: "No documents found. Please upload clinic documents first.",
      });
      return;
    }

    // 3. Generate reply using Claude
    const { category, draftReply, sources } = await generateReply(
      question,
      chunks,
    );

    // 4. Store the enquiry (linked to authenticated user)
    const enquiry = await prisma.enquiry.create({
      data: {
        question,
        category,
        draftReply,
        sources: sources,
        userId: req.user!.userId,
      },
    });

    res.status(201).json({
      id: enquiry.id,
      question: enquiry.question,
      category,
      draftReply,
      sources,
    });
  } catch (error) {
    console.error("Error processing enquiry:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the enquiry" });
  }
});

// POST /api/enquiries/debug — run pipeline with telemetry, no DB save (admin only)
router.post("/debug", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      res.status(400).json({ error: "question is required" });
      return;
    }

    const t0 = Date.now();

    // 1. Embed
    const queryEmbedding = await embedText(question);
    const tEmbed = Date.now();

    // 2. Retrieve
    const chunks = await retrieveChunks(queryEmbedding, 5);
    const tRetrieve = Date.now();

    if (chunks.length === 0) {
      res.status(404).json({
        error: "No documents found. Please upload clinic documents first.",
      });
      return;
    }

    // 3. Generate
    const { category, draftReply, sources } = await generateReply(
      question,
      chunks,
    );
    const tGenerate = Date.now();

    res.json({
      question,
      category,
      draftReply,
      sources,
      pipeline: {
        totalMs: tGenerate - t0,
        embed: {
          durationMs: tEmbed - t0,
          model: "text-embedding-3-small",
          dimensions: 1536,
        },
        retrieve: {
          durationMs: tRetrieve - tEmbed,
          topK: 5,
          chunksFound: chunks.length,
          chunks: chunks.map((c) => ({
            documentName: c.document_name,
            similarity: c.similarity,
            snippetPreview: c.content.slice(0, 100),
          })),
        },
        generate: {
          durationMs: tGenerate - tRetrieve,
          model: "claude-haiku-4-5-20251001",
          category,
        },
      },
    });
  } catch (error) {
    console.error("Error in debug pipeline:", error);
    res.status(500).json({ error: "Pipeline debug failed" });
  }
});

// GET /api/enquiries — list past enquiries (admins see all, users see own)
router.get("/", authenticate, async (req, res) => {
  try {
    const where = req.user!.role === "admin" ? {} : { userId: req.user!.userId };
    const enquiries = await prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        question: true,
        category: true,
        draftReply: true,
        sources: true,
        createdAt: true,
      },
    });
    res.json(enquiries);
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching enquiries" });
  }
});

export default router;
