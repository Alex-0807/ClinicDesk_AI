"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  Background,
  BackgroundVariant,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import RagFlowNode, { type RagNodeData } from "./RagFlowNode";

export interface PipelineTelemetry {
  question?: string;
  category?: string;
  draftReply?: string;
  sources?: { chunkId: string; snippet: string; documentName: string }[];
  steps?: {
    embed?: { durationMs: number; model: string; dimensions: number };
    retrieve?: {
      durationMs: number;
      topK: number;
      chunksFound: number;
      chunks: { documentName: string; similarity: number; snippetPreview: string }[];
    };
    generate?: { durationMs: number; model: string; category: string };
  };
  totalMs?: number;
}

interface Props {
  telemetry?: PipelineTelemetry | null;
  runningStep?: string | null;
}

const nodeTypes = { ragNode: RagFlowNode };

const NODE_GAP = 140;

function buildNodes(
  telemetry?: PipelineTelemetry | null,
  runningStep?: string | null,
): Node[] {
  const t = telemetry;
  const steps = t?.steps;

  function status(stepId: string): "idle" | "running" | "done" {
    if (runningStep === stepId) return "running";
    if (!steps) return "idle";
    if (stepId === "input" && t?.question) return "done";
    if (stepId === "embed" && steps.embed) return "done";
    if (stepId === "retrieve" && steps.retrieve) return "done";
    if (stepId === "generate" && steps.generate) return "done";
    if (stepId === "output" && t?.draftReply) return "done";
    return "idle";
  }

  return [
    {
      id: "input",
      type: "ragNode",
      position: { x: 0, y: 0 },
      data: {
        label: "Patient Enquiry",
        icon: "\u2753",
        description: "User submits a patient question via the enquiry form.",
        isFirst: true,
        status: status("input"),
        details: t?.question
          ? { Question: t.question.length > 80 ? t.question.slice(0, 80) + "..." : t.question }
          : undefined,
      } satisfies RagNodeData,
    },
    {
      id: "embed",
      type: "ragNode",
      position: { x: 0, y: NODE_GAP },
      data: {
        label: "Embedding",
        icon: "\ud83e\udde0",
        description: "Question converted to a 1536-dim vector via OpenAI text-embedding-3-small.",
        status: status("embed"),
        durationMs: steps?.embed?.durationMs,
        details: steps?.embed
          ? { Model: steps.embed.model, Dimensions: steps.embed.dimensions }
          : undefined,
      } satisfies RagNodeData,
    },
    {
      id: "retrieve",
      type: "ragNode",
      position: { x: 0, y: NODE_GAP * 2 },
      data: {
        label: "Vector Search",
        icon: "\ud83d\udd0d",
        description: "pgvector cosine similarity search across document chunks. Returns top 5.",
        status: status("retrieve"),
        durationMs: steps?.retrieve?.durationMs,
        details: steps?.retrieve
          ? {
              "Chunks found": steps.retrieve.chunksFound,
              "Top K": steps.retrieve.topK,
              ...Object.fromEntries(
                steps.retrieve.chunks.slice(0, 3).map((c, i) => [
                  `#${i + 1} ${c.documentName}`,
                  `${(c.similarity * 100).toFixed(1)}%`,
                ]),
              ),
            }
          : undefined,
      } satisfies RagNodeData,
    },
    {
      id: "generate",
      type: "ragNode",
      position: { x: 0, y: NODE_GAP * 3 },
      data: {
        label: "LLM Generation",
        icon: "\u2728",
        description: "Retrieved chunks + question sent to Claude Haiku 3.5 for reply generation.",
        status: status("generate"),
        durationMs: steps?.generate?.durationMs,
        details: steps?.generate
          ? { Model: steps.generate.model, Category: steps.generate.category }
          : undefined,
      } satisfies RagNodeData,
    },
    {
      id: "output",
      type: "ragNode",
      position: { x: 0, y: NODE_GAP * 4 },
      data: {
        label: "Result",
        icon: "\u2705",
        description: "Categorized draft reply with source citations returned to the user.",
        isLast: true,
        status: status("output"),
        details:
          t?.category
            ? {
                Category: t.category,
                Sources: t.sources?.length ?? 0,
                Reply:
                  t.draftReply && t.draftReply.length > 60
                    ? t.draftReply.slice(0, 60) + "..."
                    : t.draftReply ?? "",
              }
            : undefined,
        durationMs: t?.totalMs,
      } satisfies RagNodeData,
    },
  ];
}

const edges: Edge[] = [
  { id: "e-input-embed", source: "input", target: "embed", animated: true },
  { id: "e-embed-retrieve", source: "embed", target: "retrieve", animated: true },
  { id: "e-retrieve-generate", source: "retrieve", target: "generate", animated: true },
  { id: "e-generate-output", source: "generate", target: "output", animated: true },
];

export default function RagFlowDiagram({ telemetry, runningStep }: Props) {
  const nodes = useMemo(
    () => buildNodes(telemetry, runningStep),
    [telemetry, runningStep],
  );

  return (
    <div className="w-full h-[700px] rounded-lg border border-gray-200 bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
