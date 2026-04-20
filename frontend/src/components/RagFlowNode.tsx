"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface RagNodeData {
  label: string;
  icon: string;
  description: string;
  details?: Record<string, string | number>;
  durationMs?: number;
  isFirst?: boolean;
  isLast?: boolean;
  status?: "idle" | "running" | "done";
}

function RagFlowNode({ data }: NodeProps & { data: RagNodeData }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = data.details && Object.keys(data.details).length > 0;

  const statusColor =
    data.status === "done"
      ? "border-green-300 bg-green-50"
      : data.status === "running"
        ? "border-blue-300 bg-blue-50 animate-pulse"
        : "border-gray-200 bg-white";

  return (
    <div
      className={`rounded-lg border-2 shadow-sm px-4 py-3 min-w-[220px] max-w-[280px] ${statusColor}`}
    >
      {!data.isFirst && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-blue-400 !w-2 !h-2"
        />
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{data.icon}</span>
        <span className="text-sm font-semibold text-gray-800">{data.label}</span>
        {data.durationMs !== undefined && (
          <span className="ml-auto text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
            {data.durationMs}ms
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{data.description}</p>

      {hasDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {Object.entries(data.details!).map(([key, value]) => (
                <div key={key} className="flex justify-between text-[11px]">
                  <span className="text-gray-400">{key}</span>
                  <span className="text-gray-700 font-medium max-w-[150px] truncate text-right">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!data.isLast && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-blue-400 !w-2 !h-2"
        />
      )}
    </div>
  );
}

export default memo(RagFlowNode);
