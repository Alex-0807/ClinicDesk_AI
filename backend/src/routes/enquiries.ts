import { Router } from "express";
import prisma from "../lib/prisma";
import { embedText } from "../services/embedding";
import { retrieveChunks } from "../services/retrieval";
import { generateReply } from "../services/generation";

const router = Router();

// POST /api/enquiries — the full RAG pipeline
router.post("/", async (req, res) => {
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

    // 4. Store the enquiry
    const enquiry = await prisma.enquiry.create({
      data: {
        question,
        category,
        draftReply,
        sources: sources,
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

// GET /api/enquiries — list past enquiries
router.get("/", async (_req, res) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
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
