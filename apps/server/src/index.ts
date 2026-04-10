  import { auth } from "@bisp-final-flow/auth";
import { env } from "@bisp-final-flow/env/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import path from "node:path";
import { requireAuth } from "./middleware/auth.middleware";
import venuesRouter from "./modules/venues/venues.routes";
import bookingsRouter from "./modules/bookings/bookings.routes";
import expenseRouter from "./modules/expenses/expenses.routes";
import uploadsRouter from "./modules/uploads/uploads.routes";
import { fromNodeHeaders } from "better-auth/node";
import { prisma } from "@bisp-final-flow/db";


const app = express();

app.use(
  cors({
    origin: [env.CORS_ORIGIN], 
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json());

// Serve uploaded files (photos, menu PDFs) at /uploads/...
// Mount BEFORE express.json since static doesn't care about body parsing.
app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/api/uploads", uploadsRouter);
app.use("/api/expenses", expenseRouter);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

app.get("/api/me", requireAuth, async (req, res) => {
  // Hydrate from the DB so the response includes the linked company,
  // not just whatever Better-Auth keeps in the session payload.
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { company: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

app.use("/api/venues", venuesRouter);
app.use("/api/bookings", bookingsRouter);

// GET /api/search?q=chef — case-insensitive venue search by name.
// Returns a slim payload (id, name, category) for use in the global search box.
app.get("/api/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json([]);
    return;
  }
  const results = await prisma.venue.findMany({
    where: {
      isActive: true,
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, category: true },
    take: 20,
    orderBy: { name: "asc" },
  });
  res.json(results);
});

// PATCH /api/me — update editable profile fields. Email is intentionally
// not accepted here: changing the login email is a separate flow that has
// to go through Better-Auth.
app.patch("/api/me", requireAuth, async (req, res) => {
  const { name, phone, telegramUsername, companyName } = req.body ?? {};

  // ── Validation ──────────────────────────────────────────────────────────
  // Each field is optional in PATCH, but if it IS sent it has to be valid.
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Name must be at least 2 characters" });
      return;
    }
  }
  if (phone !== undefined && phone !== null && phone !== "") {
    if (typeof phone !== "string") {
      res.status(400).json({ error: "Phone must be a string" });
      return;
    }
    // E.164-ish: optional leading +, 7–15 digits total. Allows spaces/dashes
    // in the input which we strip before checking length.
    const digits = phone.replace(/[\s\-()]/g, "");
    if (!/^\+?\d{7,15}$/.test(digits)) {
      res.status(400).json({ error: "Phone number is not valid" });
      return;
    }
  }
  if (telegramUsername !== undefined && telegramUsername !== null && telegramUsername !== "") {
    if (typeof telegramUsername !== "string" || !/^@?[A-Za-z0-9_]{3,32}$/.test(telegramUsername)) {
      res.status(400).json({ error: "Telegram username is not valid" });
      return;
    }
  }
  if (companyName !== undefined && companyName !== null && companyName !== "") {
    if (typeof companyName !== "string" || companyName.trim().length < 2) {
      res.status(400).json({ error: "Company name must be at least 2 characters" });
      return;
    }
  }

  // ── Apply ───────────────────────────────────────────────────────────────
  const userUpdate: Record<string, unknown> = {};
  if (name !== undefined) userUpdate.name = name.trim();
  if (phone !== undefined) userUpdate.phone = phone === "" ? null : phone;
  if (telegramUsername !== undefined) {
    userUpdate.telegramUsername = telegramUsername === "" ? null : telegramUsername;
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: userUpdate,
    include: { company: true },
  });

  // Company name lives on the Company model, so update it through the relation.
  if (companyName !== undefined && updated.companyId) {
    const company = await prisma.company.update({
      where: { id: updated.companyId },
      data: { name: companyName.trim() },
    });
    res.json({ ...updated, company });
    return;
  }

  res.json(updated);
});

app.post("/api/onboarding", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { role, companyName, telegramUsername, phone } = req.body;

  const company = await prisma.company.create({
    data: { name: companyName || `${session.user.name}'s Team` },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role,
      companyId: company.id,
      ...(phone && { phone }),
      ...(telegramUsername && { telegramUsername }),
    },
  });
  
  res.json({ ok: true });
});
