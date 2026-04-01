"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export interface EnquiryResponse {
  id: string;
  question: string;
  category: string;
  draftReply: string;
  sources: { chunkId: string; snippet: string; documentName: string }[];
}

interface Props {
  onResult: (result: EnquiryResponse) => void;
}

export default function EnquiryForm({ onResult }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiFetch<EnquiryResponse>("/enquiries", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="enquiry"
          className="block text-sm font-medium text-gray-700"
        >
          Patient Enquiry
        </label>
        <textarea
          id="enquiry"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='e.g. "How much does an initial physio assessment cost, and can I claim it on Medicare?"'
          required
          disabled={loading}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <span className="spinner" />}
        {loading ? "Generating reply..." : "Generate Reply"}
      </button>

      {loading && (
        <p className="text-xs text-gray-400">
          This may take a few seconds while we search documents and generate a
          reply.
        </p>
      )}
    </form>
  );
}
