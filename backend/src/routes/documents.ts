import { Router } from "express";
import multer from "multer";
// @ts-ignore - pdf-parse types are incorrectly declared for ES module imports
import pdfParse from "pdf-parse";

import prisma from "../lib/prisma";
import { chunkText } from "../utils/chunker";
import { embedTexts } from "../services/embedding";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/plain",
      "application/pdf",
      "text/markdown",
      "text/csv",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt, .pdf, .md, and .csv files are supported"));
    }
  },
});

/**
 * Extract text from an uploaded file buffer.
 */
async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === "application/pdf") {
    // use as any to pass
    const result = await (pdfParse as any)(buffer);
    return result.text;
  }
  // txt, md, csv — just decode as UTF-8
  return buffer.toString("utf-8");
}

// POST /api/documents/upload
// Accepts either:
//   - multipart form with "file" field (+ optional "name" field)
//   - JSON body with { name, content }
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    let name: string;
    let content: string;

    if (req.file) {
      // File upload path
      content = await extractText(req.file.buffer, req.file.mimetype);
      name = (req.body.name as string) || req.file.originalname;
    } else {
      // Text paste path (JSON body)
      name = req.body.name;
      content = req.body.content;
    }

    if (!name || !content) {
      res.status(400).json({ error: "name and content are required" });
      return;
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      res
        .status(400)
        .json({ error: "File appears to be empty or could not be read" });
      return;
    }

    // 1. Chunk the text
    const chunks = chunkText(trimmed);

    // 2. Embed all chunks in one API call
    const embeddings = await embedTexts(chunks);

    // 3. Store document
    const document = await prisma.document.create({
      data: { name, content: trimmed },
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
    const message =
      error instanceof Error ? error.message : "An error occurred";
    res.status(500).json({ error: message });
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
