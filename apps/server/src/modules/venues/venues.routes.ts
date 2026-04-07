import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { getVenues, createVenue } from "./venues.service";
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

// POST /api/venues — только PROVIDER создаёт площадку
router.post(
  "/",
  requireAuth,
  requireRole(Role.PROVIDER),
  async (req, res) => {
    const venue = await createVenue(req.user!.id, req.body);
    res.status(201).json(venue);
  }
);

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


export default router;
