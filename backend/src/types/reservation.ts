import { ReservationStatus } from "../generated/prisma/client";

export interface ReservationRecord {
  id: string;
  userId: string | null;
  date: Date;
  startTime: Date;
  endTime: Date;
  serviceType: string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckAvailabilityInput {
  date: string;       // ISO date: "2026-06-15"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  serviceType?: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    serviceType: string;
  }>;
}

export interface CreateReservationInput {
  userId?: string;
  date: string;       // ISO date: "2026-06-15"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  serviceType: string;
  notes?: string;
}

export interface ModifyReservationInput {
  date?: string;
  startTime?: string;
  endTime?: string;
  serviceType?: string;
  notes?: string;
  status?: ReservationStatus;
}

export class ReservationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVALID_TIME"
      | "ALREADY_CANCELLED"
  ) {
    super(message);
    this.name = "ReservationError";
  }
}
