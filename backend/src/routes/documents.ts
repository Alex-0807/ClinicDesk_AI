import { Router } from "express";
import prisma from "../lib/prisma";
import { chunkText } from "../utils/chunker";
import { embedTexts } from "../services/embedding";

const router = Router();

// POST /api/documents/upload — upload a document, chunk it, embed chunks, store
router.post("/upload", async (req, res) => {
  try {
    const { name, content } = req.body;

    if (!name || !content) {
      res.status(400).json({ error: "name and content are required" });
      return;
    }

    // 1. Chunk the text
    const chunks = chunkText(content);

    // 2. Embed all chunks in one API call
    const embeddings = await embedTexts(chunks.map((c) => c));

    // 3. Store document
    const document = await prisma.document.create({
      data: { name, content },
    });

    // 4. Store chunks with embeddings using raw SQL (Prisma can't write vector columns directly)
    for (let i = 0; i < chunks.length; i++) {
      const id = crypto.randomUUID();
      const vectorStr = `[${embeddings[i].join(",")}]`;
      await prisma.$queryRawUnsafe(
        `INSERT INTO chunks (id, document_id, content, embedding, chunk_index)
         VALUES ($1, $2, $3, $4::vector, $5)`,
        id,
        document.id,
        chunks[i],
        vectorStr,
        i,
      );
    }

    res.status(201).json({
      id: document.id,
      name: document.name,
      chunksCreated: chunks.length,
    });
  } catch (error) {
    console.error("Error processing document upload:", error);
    res
      .status(500)
      .json({ error: "An error occurred while uploading the document" });
  }
});

// GET /api/documents — list all documents
router.get("/", async (_req, res) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    });
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching documents" });
  }
});

// GET /api/documents/:id — get single document with chunks
router.get("/:id", async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        chunks: {
          orderBy: { chunkIndex: "asc" },
          select: { id: true, content: true, chunkIndex: true },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the document" });
  }
});

// DELETE /api/documents/:id — delete document and its chunks (cascade)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    await prisma.document.delete({ where: { id } });
    res.json({ message: "Document deleted", id });
  } catch (error) {
    console.error("Error deleting document:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the document" });
  }
});

export default router;
