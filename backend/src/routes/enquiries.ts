import { Router } from "express";

const router = Router();

// POST /api/enquiries — submit enquiry, retrieve chunks, generate reply
router.post("/", async (_req, res) => {
  res.json({ message: "TODO: process enquiry" });
});

// GET /api/enquiries — list past enquiries
router.get("/", async (_req, res) => {
  res.json({ message: "TODO: list enquiries" });
});

export default router;
