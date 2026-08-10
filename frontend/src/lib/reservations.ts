import { apiFetch } from "./api";

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Reservation {
  id: string;
  userId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: Array<{
    id: string;
    startTime: string;
    endTime: string;
    serviceType: string;
  }>;
}

export interface CreateReservationInput {
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  notes?: string;
}

export interface ModifyReservationInput {
  date?: string;
  startTime?: string;
  endTime?: string;
  serviceType?: string;
  notes?: string;
}

export function checkAvailability(
  date: string,
  startTime: string,
  endTime: string
): Promise<AvailabilityResult> {
  const params = new URLSearchParams({ date, startTime, endTime });
  return apiFetch<AvailabilityResult>(`/reservations/availability?${params}`);
}

export function createReservation(input: CreateReservationInput): Promise<Reservation> {
  return apiFetch<Reservation>("/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getReservation(id: string): Promise<Reservation> {
  return apiFetch<Reservation>(`/reservations/${id}`);
}

export function modifyReservation(
  id: string,
  input: ModifyReservationInput
): Promise<Reservation> {
  return apiFetch<Reservation>(`/reservations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function cancelReservation(id: string): Promise<Reservation> {
  return apiFetch<Reservation>(`/reservations/${id}`, { method: "DELETE" });
}
