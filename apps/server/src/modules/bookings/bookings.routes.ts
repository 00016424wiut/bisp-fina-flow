import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { getBookingById, confirmBooking, createBooking, getBookedSlots, getMyBookings, cancelBooking } from "./bookings.service";
import prisma from "@bisp-final-flow/db";
import { Role } from "@bisp-final-flow/db/generated/client";

const router = Router();

// GET /api/bookings/slots — публичный
router.get("/slots", async (req, res) => {
  const { venueId, date } = req.query;
  if (!venueId || !date) {
    res.status(400).json({ error: "venueId and date required" });
    return;
  }
  const slots = await getBookedSlots(String(venueId), String(date));
  res.json(slots);
});

// GET /api/bookings/my — только MANAGER
router.get("/my", requireAuth, async (req, res) => {
  const bookings = await getMyBookings(req.user!.id);
  res.json(bookings);
});

// GET /api/bookings/provider — только PROVIDER
router.get("/provider", requireAuth, requireRole(Role.PROVIDER), async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { venue: { providerId: req.user!.id } },
    include: { venue: true, manager: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(bookings);
});

// GET /api/bookings/:id
router.get("/:id", requireAuth, async (req, res) => {
  const booking = await getBookingById(String(req.params.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(booking);
});

// POST /api/bookings — только MANAGER
router.post("/", requireAuth, requireRole(Role.MANAGER), async (req, res) => {
  try {
    const booking = await createBooking(
      req.user!.id,
      req.user!.companyId ?? "",
      req.body
    );
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PATCH /api/bookings/:id/cancel — только MANAGER, только своё бронирование
router.patch("/:id/cancel", requireAuth, requireRole(Role.MANAGER), async (req, res) => {
  try {
    const booking = await cancelBooking(String(req.params.id), req.user!.id);
    res.json(booking);
  } catch (error) {
    const message = (error as Error).message;
    const status = message === "Forbidden" ? 403 : message === "Booking not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// PATCH /api/bookings/:id/confirm — только PROVIDER
router.patch("/:id/confirm", requireAuth, requireRole(Role.PROVIDER), async (req, res) => {
  const booking = await confirmBooking(
    String(req.params.id),
    req.user!.companyId ?? ""
  );
  res.json(booking);
});

export default router;
