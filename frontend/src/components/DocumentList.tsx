"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Document {
  id: string;
  name: string;
  createdAt: string;
}

interface DocumentDetail extends Document {
  content: string;
}

interface Props {
  refreshKey: number;
}

export default function DocumentList({ refreshKey }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
  const [loadingContentId, setLoadingContentId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Document[]>("/documents")
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleToggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (contentCache[id]) return; // already fetched

    setLoadingContentId(id);
    try {
      const detail = await apiFetch<DocumentDetail>(`/documents/${id}`);
      setContentCache((prev) => ({ ...prev, [id]: detail.content }));
    } catch {
      setContentCache((prev) => ({ ...prev, [id]: "Failed to load content." }));
    } finally {
      setLoadingContentId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      await apiFetch(`/documents/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setContentCache((prev) => { const c = { ...prev }; delete c[id]; return c; });
      if (expandedId === id) setExpandedId(null);
    } catch {
      // silently fail for MVP
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="spinner" />
        Loading documents...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-400">No documents yet. Upload one above.</p>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        {documents.length} document{documents.length !== 1 ? "s" : ""}
      </p>
      <ul className="divide-y divide-gray-200">
        {documents.map((doc) => {
          const isExpanded = expandedId === doc.id;
          const isLoadingContent = loadingContentId === doc.id;

          return (
            <li key={doc.id}>
              {/* Row */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleExpand(doc.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {isExpanded ? "Collapse" : "Expand"}
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    disabled={deletingId === doc.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === doc.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                  {isLoadingContent ? (
                    <p className="text-xs text-gray-400">Loading content…</p>
                  ) : (
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono leading-relaxed">
                      {contentCache[doc.id]}
                    </pre>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
