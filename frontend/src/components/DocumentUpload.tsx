"use client";

import { useState, useRef } from "react";
import { apiFetch } from "@/lib/api";

type Mode = "file" | "text";

interface Props {
  onUploaded: () => void;
}

export default function DocumentUpload({ onUploaded }: Props) {
  const [mode, setMode] = useState<Mode>("file");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let body: BodyInit;

      if (mode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        if (name) formData.append("name", name);
        body = formData;
      } else {
        body = JSON.stringify({ name, content });
      }

      const result = await apiFetch<{ name: string; chunksCreated: number }>(
        "/documents/upload",
        { method: "POST", body },
      );

      setSuccess(
        `"${result.name}" uploaded successfully (${result.chunksCreated} chunks created).`,
      );
      setName("");
      setContent("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    mode === "file" ? !!file : !!name && !!content;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-md bg-gray-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            mode === "file"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            mode === "text"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Paste Text
        </button>
      </div>

      {mode === "file" ? (
        <div key="file-mode">
          <div>
            <label
              htmlFor="doc-file"
              className="block text-sm font-medium text-gray-700"
            >
              File
            </label>
            <input
              ref={fileInputRef}
              id="doc-file"
              type="file"
              accept=".txt,.pdf,.md,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-400">
              Supports .txt, .pdf, .md, .csv (max 5 MB)
            </p>
          </div>

          <div>
            <label
              htmlFor="doc-name-file"
              className="block text-sm font-medium text-gray-700"
            >
              Document Name{" "}
              <span className="font-normal text-gray-400">(optional — defaults to filename)</span>
            </label>
            <input
              id="doc-name-file"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cancellation Policy"
              disabled={loading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      ) : (
        <div key="text-mode">
          <div>
            <label
              htmlFor="doc-name-text"
              className="block text-sm font-medium text-gray-700"
            >
              Document Name
            </label>
            <input
              id="doc-name-text"
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
        </div>
      )}

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
        disabled={loading || !canSubmit}
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
