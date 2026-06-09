import prisma from "../lib/prisma";
import { ReservationStatus } from "../generated/prisma/client";
import {
  AvailabilityResult,
  CheckAvailabilityInput,
  CreateReservationInput,
  ModifyReservationInput,
  ReservationError,
  ReservationRecord,
} from "../types/reservation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses "HH:MM" into a Date anchored to a given date string ("YYYY-MM-DD").
 * Prisma stores @db.Time as a DateTime with an epoch date; we anchor to the
 * reservation date so overlap comparisons work correctly.
 */
function toDateTime(date: string, time: string): Date {
  const dt = new Date(`${date}T${time}:00.000Z`);
  if (isNaN(dt.getTime())) {
    throw new ReservationError(
      `Invalid date/time: ${date} ${time}`,
      "INVALID_TIME"
    );
  }
  return dt;
}

function validateTimeRange(startTime: string, endTime: string): void {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (sh * 60 + sm >= eh * 60 + em) {
    throw new ReservationError(
      "startTime must be before endTime",
      "INVALID_TIME"
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Check availability
// ---------------------------------------------------------------------------

/**
 * Returns whether the requested slot is free and lists any conflicting
 * reservations that overlap the window.
 *
 * A conflict exists when an existing PENDING or CONFIRMED reservation on the
 * same date has a time range that overlaps [startTime, endTime).
 */
export async function checkAvailability(
  input: CheckAvailabilityInput
): Promise<AvailabilityResult> {
  const { date, startTime, endTime } = input;
  validateTimeRange(startTime, endTime);

  const requestedStart = toDateTime(date, startTime);
  const requestedEnd = toDateTime(date, endTime);
  const reservationDate = new Date(`${date}T00:00:00.000Z`);

  const conflicts = await prisma.reservation.findMany({
    where: {
      date: reservationDate,
      status: { in: ["PENDING", "CONFIRMED"] },
      // Overlap condition: existing.start < requested.end AND existing.end > requested.start
      AND: [
        { startTime: { lt: requestedEnd } },
        { endTime: { gt: requestedStart } },
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      serviceType: true,
    },
  });

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

// ---------------------------------------------------------------------------
// 2. Create a reservation
// ---------------------------------------------------------------------------

/**
 * Creates a new reservation after confirming the slot is free.
 * Throws ReservationError with code "CONFLICT" if the slot is taken.
 */
export async function createReservation(
  input: CreateReservationInput
): Promise<ReservationRecord> {
  const { date, startTime, endTime, serviceType, userId, notes } = input;
  validateTimeRange(startTime, endTime);

  const availability = await checkAvailability({ date, startTime, endTime });
  if (!availability.available) {
    throw new ReservationError(
      `Time slot ${date} ${startTime}–${endTime} is already booked`,
      "CONFLICT"
    );
  }

  const reservationDate = new Date(`${date}T00:00:00.000Z`);
  const start = toDateTime(date, startTime);
  const end = toDateTime(date, endTime);

  return prisma.reservation.create({
    data: {
      date: reservationDate,
      startTime: start,
      endTime: end,
      serviceType,
      notes: notes ?? null,
      userId: userId ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// 3. View reservation details
// ---------------------------------------------------------------------------

/**
 * Fetches a single reservation by ID.
 * Throws ReservationError with code "NOT_FOUND" if it does not exist.
 */
export async function getReservation(id: string): Promise<ReservationRecord> {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    throw new ReservationError(`Reservation ${id} not found`, "NOT_FOUND");
  }
  return reservation;
}

// ---------------------------------------------------------------------------
// 4. Modify a reservation
// ---------------------------------------------------------------------------

/**
 * Updates mutable fields on an existing reservation.
 * If date/time fields change, re-checks availability (excluding this record).
 * Cannot modify a CANCELLED reservation.
 */
export async function modifyReservation(
  id: string,
  updates: ModifyReservationInput
): Promise<ReservationRecord> {
  const existing = await getReservation(id);

  if (existing.status === ReservationStatus.CANCELLED) {
    throw new ReservationError(
      `Cannot modify cancelled reservation ${id}`,
      "ALREADY_CANCELLED"
    );
  }

  // Determine effective date/time after the update
  const effectiveDate =
    updates.date ??
    existing.date.toISOString().split("T")[0]; // "YYYY-MM-DD"

  const existingStart = existing.startTime
    .toISOString()
    .substring(11, 16); // "HH:MM"
  const existingEnd = existing.endTime.toISOString().substring(11, 16);

  const effectiveStart = updates.startTime ?? existingStart;
  const effectiveEnd = updates.endTime ?? existingEnd;

  const timeChanged =
    updates.date || updates.startTime || updates.endTime;

  if (timeChanged) {
    validateTimeRange(effectiveStart, effectiveEnd);

    const reservationDate = new Date(`${effectiveDate}T00:00:00.000Z`);
    const requestedStart = toDateTime(effectiveDate, effectiveStart);
    const requestedEnd = toDateTime(effectiveDate, effectiveEnd);

    // Check for conflicts excluding this reservation itself
    const conflicts = await prisma.reservation.findMany({
      where: {
        id: { not: id },
        date: reservationDate,
        status: { in: ["PENDING", "CONFIRMED"] },
        AND: [
          { startTime: { lt: requestedEnd } },
          { endTime: { gt: requestedStart } },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new ReservationError(
        `Updated slot ${effectiveDate} ${effectiveStart}–${effectiveEnd} conflicts with an existing reservation`,
        "CONFLICT"
      );
    }
  }

  return prisma.reservation.update({
    where: { id },
    data: {
      ...(updates.date && {
        date: new Date(`${updates.date}T00:00:00.000Z`),
      }),
      ...(updates.startTime && {
        startTime: toDateTime(effectiveDate, updates.startTime),
      }),
      ...(updates.endTime && {
        endTime: toDateTime(effectiveDate, updates.endTime),
      }),
      ...(updates.serviceType && { serviceType: updates.serviceType }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.status && { status: updates.status }),
    },
  });
}

// ---------------------------------------------------------------------------
// 5. Cancel a reservation
// ---------------------------------------------------------------------------

/**
 * Sets a reservation's status to CANCELLED.
 * Idempotent-safe: throws if already cancelled so callers can surface that.
 */
export async function cancelReservation(id: string): Promise<ReservationRecord> {
  const existing = await getReservation(id);

  if (existing.status === ReservationStatus.CANCELLED) {
    throw new ReservationError(
      `Reservation ${id} is already cancelled`,
      "ALREADY_CANCELLED"
    );
  }

  return prisma.reservation.update({
    where: { id },
    data: { status: ReservationStatus.CANCELLED },
  });
}
