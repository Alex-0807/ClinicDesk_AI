import { Router } from "express";

const router = Router();

// POST /api/documents/upload — upload a document, chunk it, embed chunks, store
router.post("/upload", async (_req, res) => {
  res.json({ message: "TODO: upload document" });
});

// GET /api/documents — list all documents
router.get("/", async (_req, res) => {
  res.json({ message: "TODO: list documents" });
});

// GET /api/documents/:id — get single document with chunks
router.get("/:id", async (_req, res) => {
  res.json({ message: "TODO: get document" });
});

// DELETE /api/documents/:id — delete document and its chunks
router.delete("/:id", async (_req, res) => {
  res.json({ message: "TODO: delete document" });
});

export default router;
