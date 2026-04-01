"use client";

import { useState } from "react";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentList from "@/components/DocumentList";
import RequireAuth from "@/components/RequireAuth";

export default function DocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <RequireAuth role="admin">
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload and manage your clinic documents.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Upload Document
        </h2>
        <DocumentUpload onUploaded={() => setRefreshKey((k) => k + 1)} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Uploaded Documents
        </h2>
        <DocumentList refreshKey={refreshKey} />
      </section>
    </div>
    </RequireAuth>
  );
}
