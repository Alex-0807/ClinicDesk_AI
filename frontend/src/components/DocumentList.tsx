"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Document {
  id: string;
  name: string;
  createdAt: string;
}

interface Props {
  refreshKey: number;
}

export default function DocumentList({ refreshKey }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Document[]>("/documents")
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      await apiFetch(`/documents/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
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
      <p className="text-sm text-gray-400">
        No documents yet. Upload one above.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        {documents.length} document{documents.length !== 1 ? "s" : ""}
      </p>
      <ul className="divide-y divide-gray-200">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
              <p className="text-xs text-gray-400">
                {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDelete(doc.id, doc.name)}
              disabled={deletingId === doc.id}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {deletingId === doc.id ? "Deleting..." : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
