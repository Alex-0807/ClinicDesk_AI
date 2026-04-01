"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import EnquiryForm from "@/components/EnquiryForm";
import EnquiryResult from "@/components/EnquiryResult";
import type { EnquiryResponse } from "@/components/EnquiryForm";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const [result, setResult] = useState<EnquiryResponse | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ id: string }[]>("/documents")
      .then((docs) => setDocCount(docs.length))
      .catch(() => setDocCount(0));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enquiry Assistant</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste a patient enquiry to generate a draft reply from your clinic
          documents.
        </p>
      </div>

      {docCount !== null && docCount === 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            No documents uploaded yet. The assistant needs clinic documents to
            generate replies.{" "}
            <Link
              href="/documents"
              className="font-medium underline hover:text-amber-900"
            >
              Upload documents first
            </Link>
          </p>
        </div>
      )}

      {docCount !== null && docCount > 0 && (
        <p className="text-xs text-gray-400">
          {docCount} document{docCount !== 1 ? "s" : ""} loaded
        </p>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <EnquiryForm onResult={setResult} />
      </section>

      {result && (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <EnquiryResult result={result} />
        </section>
      )}
    </div>
  );
}
