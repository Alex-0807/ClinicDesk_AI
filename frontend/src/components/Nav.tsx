"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-blue-600">
            ClinicDesk AI
          </span>
          <span className="hidden sm:inline text-xs text-gray-400">
            Admin Assistant
          </span>
        </Link>

        {user && (
          <div className="flex gap-1 ml-auto items-center">
            <Link
              href="/"
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Enquiry
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/documents"
                  className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    pathname === "/documents"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Documents
                </Link>
                <Link
                  href="/rag-pipeline"
                  className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    pathname === "/rag-pipeline"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  RAG Pipeline
                </Link>
              </>
            )}

            <span className="ml-4 text-xs text-gray-400">
              {user.name}
              {isAdmin && (
                <span className="ml-1 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                  admin
                </span>
              )}
            </span>
            <button
              onClick={logout}
              className="ml-2 text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}

        {!user && (
          <div className="flex gap-1 ml-auto">
            <Link
              href="/login"
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/login"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
