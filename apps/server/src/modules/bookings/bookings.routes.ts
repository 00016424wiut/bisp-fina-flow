import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { getBookingById, confirmBooking, createBooking, getBookedSlots, getMyBookings } from "./bookings.service";
import { Role } from "@bisp-final-flow/db";

const router = Router();

// GET /api/bookings/slots?venueId=X&date=Y — публичный эндпоинт
router.get("/slots", async (req, res) => {
  const { venueId, date } = req.query;
  if (!venueId || !date) {
    res.status(400).json({ error: "venueId and date required" });
    return;
  }
  const slots = await getBookedSlots(
    String(venueId),
    String(date)
  );
  res.json(slots);
});

router.get("/my", requireAuth, async (req, res) => {
  const bookings = await getMyBookings(req.user!.id);
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

// POST /api/bookings — только MANAGER создаёт бронирование
router.post(
    "/",
    requireAuth,
    requireRole(Role.MANAGER),
    async (req, res) => {
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
    }
  );
  

// PATCH /api/bookings/:id/confirm — только PROVIDER
router.patch(
  "/:id/confirm",
  requireAuth,
  requireRole(Role.PROVIDER),
  async (req, res) => {
    const booking = await confirmBooking(
      String(req.params.id),
      req.user!.companyId ?? ""
    );
    res.json(booking);
  }
);

export default router;

