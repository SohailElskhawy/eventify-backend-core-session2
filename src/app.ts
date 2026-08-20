import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./auth/auth.routes.ts";
import { eventRouter } from "./events/event.routes.ts";
import { bookingRouter } from "./bookings/booking.routes.ts";
import { notFound } from "./middleware/notFound.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

export const app = express();

// ── Body & cookie parsing ───────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "OK", uptime: process.uptime() });
});

// ── API routes ──────────────────────────────────────────────
app.use("/v1/auth", authRouter);
app.use("/v1/events", eventRouter);
app.use("/v1/bookings", bookingRouter);

// ── Error handling (must be last) ───────────────────────────
app.use(notFound);
app.use(errorHandler);
