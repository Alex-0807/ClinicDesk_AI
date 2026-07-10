import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchKnowledge } from "../services/knowledge";
import {
  checkAvailability,
  createReservation,
  getReservation,
  listReservations,
  modifyReservation,
  cancelReservation,
} from "../services/reservation";

// ---------------------------------------------------------------------------
// Knowledge / RAG tool
// ---------------------------------------------------------------------------

export const searchKnowledgeTool = tool(
  async ({ question }) => {
    const result = await searchKnowledge(question);
    const sourceList = result.sources
      .map((s) => `• ${s.documentName}: "${s.snippet}"`)
      .join("\n");
    return `${result.answer}${sourceList ? `\n\nSources:\n${sourceList}` : ""}`;
  },
  {
    name: "searchKnowledge",
    description:
      "Search the clinic's document knowledge base to answer questions about " +
      "services, fees, policies, treatments, referrals, opening hours, or any " +
      "general clinic information. Use this for informational questions that do " +
      "not involve booking or managing appointments.",
    schema: z.object({
      question: z.string().describe("The question to look up in the clinic documents"),
    }),
  }
);

// ---------------------------------------------------------------------------
// Reservation tools
// ---------------------------------------------------------------------------

export const checkAvailabilityTool = tool(
  async ({ date, startTime }) => {
    const endTime = addThirtyMinutes(startTime);
    const result = await checkAvailability({ date, startTime, endTime });
    if (result.available) {
      return `The slot ${date} ${startTime}–${endTime} is available.`;
    }
    const conflicts = result.conflicts
      .map((c) => `  • ${formatTime(c.startTime)} – ${formatTime(c.endTime)}`)
      .join("\n");
    return `The slot ${date} ${startTime}–${endTime} is NOT available. Conflicting bookings:\n${conflicts}`;
  },
  {
    name: "checkAvailability",
    description:
      "Check whether a 30-minute time slot is free on a given weekday. " +
      "Use this before creating a reservation to confirm the slot is available. " +
      "Clinic hours are Monday–Friday 08:00–18:00. Only provide startTime; endTime is always 30 minutes later.",
    schema: z.object({
      date: z.string().describe("Date in YYYY-MM-DD format, must be a weekday"),
      startTime: z.string().describe("Start time in HH:MM format (e.g. 09:00, 14:30)"),
    }),
  }
);

export const createReservationTool = (userId: string) =>
  tool(
    async ({ date, startTime, serviceType, notes }) => {
      const endTime = addThirtyMinutes(startTime);
      const reservation = await createReservation({
        userId,
        date,
        startTime,
        endTime,
        serviceType,
        notes,
      });
      return `Reservation created successfully. ID: ${reservation.id}. ` +
        `${serviceType} on ${date} at ${startTime}–${endTime}. Status: ${reservation.status}.`;
    },
    {
      name: "createReservation",
      description:
        "Book a 30-minute appointment for the current user. " +
        "Always call checkAvailability first to confirm the slot is free. " +
        "Clinic hours are Monday–Friday 08:00–18:00.",
      schema: z.object({
        date: z.string().describe("Date in YYYY-MM-DD format, must be a weekday"),
        startTime: z.string().describe("Start time in HH:MM format"),
        serviceType: z.enum([
          "General Consultation",
          "Physiotherapy",
          "Occupational Therapy",
          "Speech Therapy",
          "Psychology",
          "Dietetics",
        ]).describe("Type of clinic service"),
        notes: z.string().optional().describe("Optional notes for the appointment"),
      }),
    }
  );

export const listReservationsTool = (userId: string) =>
  tool(
    async ({ date, dateFrom, dateTo, status, serviceType }) => {
      const results = await listReservations({
        userId,
        date,
        dateFrom,
        dateTo,
        status: status as Parameters<typeof listReservations>[0]["status"],
        serviceType,
      });
      if (results.length === 0) return "No reservations found matching those filters.";
      return results
        .map(
          (r) =>
            `• ID: ${r.id} | ${formatDate(r.date)} ${formatTime(r.startTime)}–${formatTime(r.endTime)} | ` +
            `${r.serviceType} | Status: ${r.status}${r.notes ? ` | Notes: ${r.notes}` : ""}`
        )
        .join("\n");
    },
    {
      name: "listReservations",
      description:
        "List the current user's reservations. Use this when the user asks about " +
        "existing bookings, wants to find an appointment, or needs an ID before " +
        "modifying or cancelling. All filters are optional — omit to get all reservations.",
      schema: z.object({
        date: z.string().optional().describe("Filter by exact date YYYY-MM-DD"),
        dateFrom: z.string().optional().describe("Filter by date range start YYYY-MM-DD"),
        dateTo: z.string().optional().describe("Filter by date range end YYYY-MM-DD"),
        status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional().describe("Filter by status"),
        serviceType: z.string().optional().describe("Filter by service type"),
      }),
    }
  );

export const getReservationTool = tool(
  async ({ id }) => {
    const r = await getReservation(id);
    return (
      `Reservation ${r.id}: ${formatDate(r.date)} ${formatTime(r.startTime)}–${formatTime(r.endTime)} | ` +
      `${r.serviceType} | Status: ${r.status}${r.notes ? ` | Notes: ${r.notes}` : ""}`
    );
  },
  {
    name: "getReservation",
    description:
      "Get the details of a single reservation by its ID. " +
      "Use listReservations first if you don't already have the ID.",
    schema: z.object({
      id: z.string().describe("The reservation UUID"),
    }),
  }
);

export const modifyReservationTool = tool(
  async ({ id, date, startTime, serviceType, notes }) => {
    const updates: Parameters<typeof modifyReservation>[1] = {};
    if (date) updates.date = date;
    if (startTime) {
      updates.startTime = startTime;
      updates.endTime = addThirtyMinutes(startTime);
    }
    if (serviceType) updates.serviceType = serviceType;
    if (notes !== undefined) updates.notes = notes;

    const r = await modifyReservation(id, updates);
    return (
      `Reservation updated. ${formatDate(r.date)} ${formatTime(r.startTime)}–${formatTime(r.endTime)} | ` +
      `${r.serviceType} | Status: ${r.status}`
    );
  },
  {
    name: "modifyReservation",
    description:
      "Change the date, time, service type, or notes of an existing reservation. " +
      "Requires the reservation ID — use listReservations first if you don't have it. " +
      "Cannot modify a cancelled reservation.",
    schema: z.object({
      id: z.string().describe("The reservation UUID to modify"),
      date: z.string().optional().describe("New date in YYYY-MM-DD format"),
      startTime: z.string().optional().describe("New start time in HH:MM format"),
      serviceType: z.string().optional().describe("New service type"),
      notes: z.string().optional().describe("Updated notes"),
    }),
  }
);

export const cancelReservationTool = tool(
  async ({ id }) => {
    const r = await cancelReservation(id);
    return `Reservation cancelled. ${formatDate(r.date)} ${formatTime(r.startTime)} ${r.serviceType} is now CANCELLED.`;
  },
  {
    name: "cancelReservation",
    description:
      "Cancel an existing reservation by ID. " +
      "Use listReservations first if you don't already have the ID.",
    schema: z.object({
      id: z.string().describe("The reservation UUID to cancel"),
    }),
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addThirtyMinutes(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatTime(d: Date | string): string {
  return new Date(d).toISOString().substring(11, 16);
}

function formatDate(d: Date | string): string {
  return new Date(d).toISOString().split("T")[0];
}
