import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import documentRoutes from "./routes/documents";
import enquiryRoutes from "./routes/enquiries";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3002" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/documents", documentRoutes);
app.use("/api/enquiries", enquiryRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
