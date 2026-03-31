"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

interface Props {
  onUploaded: () => void;
}

export default function DocumentUpload({ onUploaded }: Props) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await apiFetch<{ name: string; chunksCreated: number }>(
        "/documents/upload",
        {
          method: "POST",
          body: JSON.stringify({ name, content }),
        },
      );
      setSuccess(
        `"${result.name}" uploaded successfully (${result.chunksCreated} chunks created).`,
      );
      setName("");
      setContent("");
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="doc-name"
          className="block text-sm font-medium text-gray-700"
        >
          Document Name
        </label>
        <input
          id="doc-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cancellation Policy"
          required
          disabled={loading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
        />
      </div>

      <div>
        <label
          htmlFor="doc-content"
          className="block text-sm font-medium text-gray-700"
        >
          Document Content
        </label>
        <textarea
          id="doc-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your clinic document text here..."
          required
          disabled={loading}
          rows={8}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <span className="spinner" />}
        {loading ? "Uploading & embedding..." : "Upload Document"}
      </button>

      {loading && (
        <p className="text-xs text-gray-400">
          Chunking text and generating embeddings. This may take a moment.
        </p>
      )}
    </form>
  );
}
