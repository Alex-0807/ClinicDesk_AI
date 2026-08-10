"use client";

import { useState, useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import { apiFetch } from "@/lib/api";
import { ReservationStatus } from "@/lib/reservations";

interface AdminReservation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-400",
};

const SERVICE_TYPES = [
  "General Consultation",
  "Physiotherapy",
  "Occupational Therapy",
  "Speech Therapy",
  "Psychology",
  "Dietetics",
];

function fmt(iso: string, part: "date" | "time"): string {
  const d = new Date(iso);
  return part === "date"
    ? d.toISOString().split("T")[0]
    : d.toISOString().substring(11, 16);
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function fetchReservations() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (serviceFilter) params.set("serviceType", serviceFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const data = await apiFetch<AdminReservation[]>(
        `/reservations/admin/all${params.size ? `?${params}` : ""}`
      );
      setReservations(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReservations(); }, []);

  const counts = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === "PENDING").length,
    confirmed: reservations.filter((r) => r.status === "CONFIRMED").length,
    cancelled: reservations.filter((r) => r.status === "CANCELLED").length,
  };

  return (
    <RequireAuth role="admin">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Reservations</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and filter every booking across all users.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: counts.total,     color: "text-gray-900" },
            { label: "Pending",   value: counts.pending,   color: "text-yellow-700" },
            { label: "Confirmed", value: counts.confirmed, color: "text-green-700" },
            { label: "Cancelled", value: counts.cancelled, color: "text-gray-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchReservations}
            disabled={loading}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading…" : "Apply"}
          </button>
          <button
            onClick={() => {
              setStatusFilter("");
              setServiceFilter("");
              setDateFrom("");
              setDateTo("");
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Table */}
        {!loading && reservations.length === 0 ? (
          <p className="text-sm text-gray-400">No reservations found.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Date", "Time", "Service", "Patient", "Status", "Notes"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {fmt(r.date, "date")}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {fmt(r.startTime, "time")}–{fmt(r.endTime, "time")}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.serviceType}</td>
                      <td className="px-4 py-3">
                        {r.user ? (
                          <div>
                            <p className="text-gray-900 font-medium">{r.user.name}</p>
                            <p className="text-xs text-gray-400">{r.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Guest</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
