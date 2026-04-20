"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import RagFlowDiagram, {
  type PipelineTelemetry,
} from "@/components/RagFlowDiagram";
import { apiFetch } from "@/lib/api";

export default function RagPipelinePage() {
  const [question, setQuestion] = useState("");
  const [telemetry, setTelemetry] = useState<PipelineTelemetry | null>(null);
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setError("");
    setTelemetry({ question });

    // Animate steps sequentially
    const steps = ["input", "embed", "retrieve", "generate", "output"];
    for (const step of steps.slice(0, 2)) {
      setRunningStep(step);
      await new Promise((r) => setTimeout(r, 300));
    }

    try {
      setRunningStep("embed");
      const result = await apiFetch<{
        id: string;
        question: string;
        category: string;
        draftReply: string;
        sources: { chunkId: string; snippet: string; documentName: string }[];
        pipeline: PipelineTelemetry["steps"] & { totalMs: number };
      }>("/enquiries/debug", {
        method: "POST",
        body: JSON.stringify({ question }),
      });

      setTelemetry({
        question,
        category: result.category,
        draftReply: result.draftReply,
        sources: result.sources,
        steps: result.pipeline as PipelineTelemetry["steps"],
        totalMs: result.pipeline.totalMs,
      });
      setRunningStep(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setRunningStep(null);
    }
  }

  return (
    <RequireAuth role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RAG Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visualize how a patient enquiry flows through the Retrieval-Augmented
            Generation pipeline. Enter a question to see live telemetry.
          </p>
        </div>

        <form onSubmit={handleRun} className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='e.g. "How much does a physio session cost?"'
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!!runningStep}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {runningStep ? "Running..." : "Run Pipeline"}
          </button>
        </form>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <RagFlowDiagram telemetry={telemetry} runningStep={runningStep} />
      </div>
    </RequireAuth>
  );
}
