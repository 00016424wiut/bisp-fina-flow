import { auth } from "@bisp-final-flow/auth";
import { env } from "@bisp-final-flow/env/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { requireAuth } from "./middleware/auth.middleware";
import venuesRouter from "./modules/venues/venues.routes";
import bookingsRouter from "./modules/bookings/bookings.routes";
import expenseRouter from "./modules/expenses/expenses.routes";


const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json());
app.use("/api/expenses", expenseRouter);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json(req.user);
});

app.use("/api/venues", venuesRouter);
app.use("/api/bookings", bookingsRouter);