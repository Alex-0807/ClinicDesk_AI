"use client";

import { useState, useCallback } from "react";
import RequireAuth from "@/components/RequireAuth";
import {
  checkAvailability,
  createReservation,
  cancelReservation,
  modifyReservation,
  AvailabilityResult,
  Reservation,
  ModifyReservationInput,
} from "@/lib/reservations";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SERVICE_TYPES = [
  "General Consultation",
  "Physiotherapy",
  "Occupational Therapy",
  "Speech Therapy",
  "Psychology",
  "Dietetics",
];

function formatTime(isoString: string): string {
  return new Date(isoString).toISOString().substring(11, 16);
}

function formatDate(isoString: string): string {
  return new Date(isoString).toISOString().split("T")[0];
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const styles: Record<Reservation["status"], string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-500 line-through",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab: Check Availability
// ---------------------------------------------------------------------------

function CheckAvailabilityTab() {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await checkAvailability(date, startTime, endTime);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Check whether a time slot is free before booking.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleCheck}
        disabled={!date || !startTime || !endTime || loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Checking…" : "Check availability"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.available
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {result.available ? (
            <p className="text-sm font-medium text-green-800">
              This slot is available.
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-red-800 mb-3">
                This slot has {result.conflicts.length} conflict
                {result.conflicts.length > 1 ? "s" : ""}.
              </p>
              <ul className="space-y-1">
                {result.conflicts.map((c) => (
                  <li key={c.id} className="text-xs text-red-700">
                    {formatTime(c.startTime)}–{formatTime(c.endTime)} · {c.serviceType}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Book
// ---------------------------------------------------------------------------

function BookTab({ onBooked }: { onBooked: () => void }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState<Reservation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleBook() {
    setError("");
    setSuccess(null);
    setLoading(true);
    try {
      const reservation = await createReservation({
        date,
        startTime,
        endTime,
        serviceType,
        notes: notes || undefined,
      });
      setSuccess(reservation);
      onBooked();
      setDate("");
      setStartTime("");
      setEndTime("");
      setNotes("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Fill in the details below to create a reservation.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service type</label>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SERVICE_TYPES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any additional information…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        onClick={handleBook}
        disabled={!date || !startTime || !endTime || loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Booking…" : "Create reservation"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Reservation created — ID: <span className="font-mono">{success.id}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

function EditModal({
  reservation,
  onClose,
  onSaved,
}: {
  reservation: Reservation;
  onClose: () => void;
  onSaved: (updated: Reservation) => void;
}) {
  const [date, setDate] = useState(formatDate(reservation.date));
  const [startTime, setStartTime] = useState(formatTime(reservation.startTime));
  const [endTime, setEndTime] = useState(formatTime(reservation.endTime));
  const [serviceType, setServiceType] = useState(reservation.serviceType);
  const [notes, setNotes] = useState(reservation.notes ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setError("");
    setLoading(true);
    const updates: ModifyReservationInput = {};
    if (date !== formatDate(reservation.date)) updates.date = date;
    if (startTime !== formatTime(reservation.startTime)) updates.startTime = startTime;
    if (endTime !== formatTime(reservation.endTime)) updates.endTime = endTime;
    if (serviceType !== reservation.serviceType) updates.serviceType = serviceType;
    if (notes !== (reservation.notes ?? "")) updates.notes = notes;

    try {
      const updated = await modifyReservation(reservation.id, updates);
      onSaved(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Edit reservation</h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: My Reservations
// ---------------------------------------------------------------------------

function MyReservationsTab({ refreshKey }: { refreshKey: number }) {
  const [lookupId, setLookupId] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      // Use the list endpoint (all reservations for the logged-in user)
      const data = await apiFetch<Reservation[]>("/reservations");
      setReservations(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when refreshKey changes (new booking created)
  useState(() => { fetchAll(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _ = refreshKey; // consumed to trigger re-render

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setError("");
    setLoading(true);
    try {
      const r = await apiFetch<Reservation>(`/reservations/${lookupId.trim()}`);
      setReservations((prev) => {
        const exists = prev.find((x) => x.id === r.id);
        return exists ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev];
      });
      setLookupId("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this reservation?")) return;
    setCancellingId(id);
    try {
      const updated = await cancelReservation(id);
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancellingId(null);
    }
  }

  function handleSaved(updated: Reservation) {
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditing(null);
  }

  return (
    <div className="space-y-5">
      {/* Lookup by ID */}
      <div className="flex gap-2">
        <input
          type="text"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          placeholder="Look up by reservation ID…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        />
        <button
          onClick={handleLookup}
          disabled={!lookupId.trim() || loading}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Look up
        </button>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {reservations.length === 0 && !loading && (
        <p className="text-sm text-gray-400">No reservations yet.</p>
      )}

      <ul className="space-y-3">
        {reservations.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(r.date)} · {formatTime(r.startTime)}–{formatTime(r.endTime)}
                </span>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-gray-600">{r.serviceType}</p>
              {r.notes && (
                <p className="text-xs text-gray-400 italic">{r.notes}</p>
              )}
              <p className="text-[10px] text-gray-300 font-mono">{r.id}</p>
            </div>

            {r.status !== "CANCELLED" && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditing(r)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleCancel(r.id)}
                  disabled={cancellingId === r.id}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {cancellingId === r.id ? "Cancelling…" : "Cancel"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <EditModal
          reservation={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = "availability" | "book" | "my";

const TABS: { id: Tab; label: string }[] = [
  { id: "availability", label: "Check availability" },
  { id: "book", label: "Book" },
  { id: "my", label: "My reservations" },
];

export default function ReservationsPage() {
  const [tab, setTab] = useState<Tab>("availability");
  const [bookRefreshKey, setBookRefreshKey] = useState(0);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage clinic appointments and bookings.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          {tab === "availability" && <CheckAvailabilityTab />}
          {tab === "book" && (
            <BookTab onBooked={() => setBookRefreshKey((k) => k + 1)} />
          )}
          {tab === "my" && <MyReservationsTab refreshKey={bookRefreshKey} />}
        </section>
      </div>
    </RequireAuth>
  );
}
