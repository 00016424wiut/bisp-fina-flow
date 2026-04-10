import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { getVenues, createVenue, updateVenue } from "./venues.service";
import { Role } from "@bisp-final-flow/db";
import { prisma } from "@bisp-final-flow/db";

const router = Router();

// GET /api/venues — все могут смотреть каталог
router.get("/", async (req, res) => {
  const { category, capacity } = req.query;
  const venues = await getVenues({
    category: category as string,
    capacity: capacity ? Number(capacity) : undefined,
  });
  res.json(venues);
});

// GET /api/venues/my — venues провайдера (ПЕРЕД /:id!)
router.get("/my", requireAuth, requireRole(Role.PROVIDER), async (req, res) => {
  const venues = await prisma.venue.findMany({
    where: { providerId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(venues);
});

// GET /api/venues/:id — получить одну площадку
router.get("/:id", async (req, res) => {
  const venue = await prisma.venue.findUnique({
    where: { id: req.params.id },
  });
  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  res.json(venue);
});

// Validate the editable subset of venue fields. Same rules apply for both
// create and update — required fields are only enforced on create.
function validateVenueBody(body: any, requireRequired: boolean): string | null {
  if (requireRequired) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      return "Name must be at least 2 characters";
    }
    if (typeof body.category !== "string") {
      return "Category is required";
    }
    if (typeof body.pricePerHour !== "number" || body.pricePerHour <= 0) {
      return "Price per hour must be a positive number";
    }
  } else {
    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length < 2)) {
      return "Name must be at least 2 characters";
    }
    if (body.pricePerHour !== undefined && (typeof body.pricePerHour !== "number" || body.pricePerHour <= 0)) {
      return "Price per hour must be a positive number";
    }
  }
  if (body.minGuests !== undefined && body.minGuests !== null) {
    if (typeof body.minGuests !== "number" || body.minGuests < 1) {
      return "Minimum guests must be at least 1";
    }
  }
  if (body.maxGuests !== undefined && body.maxGuests !== null) {
    if (typeof body.maxGuests !== "number" || body.maxGuests < 1) {
      return "Maximum guests must be at least 1";
    }
  }
  if (
    typeof body.minGuests === "number" &&
    typeof body.maxGuests === "number" &&
    body.minGuests > body.maxGuests
  ) {
    return "Minimum guests cannot exceed maximum guests";
  }
  if (body.amenities !== undefined) {
    if (!Array.isArray(body.amenities) || body.amenities.length > 30) {
      return "Amenities must be an array of up to 30 items";
    }
  }
  if (body.photos !== undefined) {
    if (!Array.isArray(body.photos)) {
      return "Photos must be an array of URLs";
    }
  }
  return null;
}

// POST /api/venues — только PROVIDER создаёт площадку
router.post(
  "/",
  requireAuth,
  requireRole(Role.PROVIDER),
  async (req, res) => {
    const error = validateVenueBody(req.body, true);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const venue = await createVenue(req.user!.id, req.body);
    res.status(201).json(venue);
  }
);

// PATCH /api/venues/:id — провайдер редактирует свою площадку
router.patch(
  "/:id",
  requireAuth,
  requireRole(Role.PROVIDER),
  async (req, res) => {
    const error = validateVenueBody(req.body, false);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const id = String(req.params.id);
    try {
      const venue = await updateVenue(id, req.user!.id, req.body);
      res.json(venue);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      if (message === "Venue not found") {
        res.status(404).json({ error: message });
        return;
      }
      if (message === "Forbidden") {
        res.status(403).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },
);

export default router;
