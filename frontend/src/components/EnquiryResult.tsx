"use client";

import Link from "next/link";
import type { EnquiryResponse } from "./EnquiryForm";
import { useAuth } from "@/lib/auth";

const categoryColors: Record<string, string> = {
  Fees: "bg-green-100 text-green-800",
  Referral: "bg-purple-100 text-purple-800",
  Cancellation: "bg-red-100 text-red-800",
  Telehealth: "bg-blue-100 text-blue-800",
  Services: "bg-yellow-100 text-yellow-800",
  General: "bg-gray-100 text-gray-800",
};

interface Props {
  result: EnquiryResponse;
}

export default function EnquiryResult({ result }: Props) {
  const { user } = useAuth();
  const colorClass = categoryColors[result.category] || categoryColors.General;

  return (
    <div className="space-y-6">
      {/* Category + Pipeline link */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
            Category
          </h3>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${colorClass}`}
          >
            {result.category}
          </span>
        </div>
        {user?.role === "admin" && (
          <Link
            href={`/rag-pipeline`}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            View in RAG Pipeline &rarr;
          </Link>
        )}
      </div>

      {/* Draft Reply */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
          Draft Reply
        </h3>
        <div className="rounded-md bg-blue-50 border border-blue-100 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {result.draftReply}
        </div>
      </div>

      {/* Sources */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
          Sources ({result.sources.length})
        </h3>
        <ul className="space-y-2">
          {result.sources.map((source, i) => (
            <li
              key={source.chunkId || i}
              className="rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <p className="text-xs font-medium text-gray-600 mb-1">
                {source.documentName}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {source.snippet}...
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
