import { Router, Request, Response } from "express";
import {
  checkAvailability,
  createReservation,
  getReservation,
  listReservations,
  modifyReservation,
  cancelReservation,
} from "../services/reservation";
import { ReservationError } from "../types/reservation";
import { authenticate } from "../middleware/auth";

const router = Router();

function handleError(err: unknown, res: Response): void {
  if (err instanceof ReservationError) {
    const statusMap: Record<ReservationError["code"], number> = {
      NOT_FOUND: 404,
      CONFLICT: 409,
      INVALID_TIME: 400,
      ALREADY_CANCELLED: 409,
    };
    res.status(statusMap[err.code]).json({ error: err.message, code: err.code });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

// GET /api/reservations?date=&dateFrom=&dateTo=&status=&serviceType=
// Admins may pass any userId; regular users are scoped to their own.
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const isAdmin = req.user!.role === "admin";
    const q = req.query as Record<string, string>;
    const reservations = await listReservations({
      userId: isAdmin && q.userId ? q.userId : req.user!.userId,
      date: q.date,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      status: q.status as Parameters<typeof listReservations>[0]["status"],
      serviceType: q.serviceType,
    });
    res.json(reservations);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/reservations/availability?date=2026-06-15&startTime=09:00&endTime=10:00
router.get("/availability", async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    const serviceType = req.query.serviceType as string | undefined;
    const result = await checkAvailability({ date, startTime, endTime, serviceType });
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/reservations
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const reservation = await createReservation({
      ...req.body,
      userId: req.user!.userId,
    });
    res.status(201).json(reservation);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/reservations/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const reservation = await getReservation(req.params.id as string);
    res.json(reservation);
  } catch (err) {
    handleError(err, res);
  }
});

// PATCH /api/reservations/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const reservation = await modifyReservation(req.params.id as string, req.body);
    res.json(reservation);
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE /api/reservations/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const reservation = await cancelReservation(req.params.id as string);
    res.json(reservation);
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
