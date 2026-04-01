"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  role?: "admin" | "user";
}

export default function RequireAuth({ children, role }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  if (role && user.role !== role) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-sm text-red-700">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
