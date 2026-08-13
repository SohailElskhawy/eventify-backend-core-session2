import express from "express";
import { venueRouter } from "./venues/venue.routes.ts";
import { notFound } from "./middleware/notFound.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

export const app = express();

// ── Body parsing ────────────────────────────────────────────
app.use(express.json());

// ── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "OK", uptime: process.uptime() });
});

// ── API routes ──────────────────────────────────────────────
app.use("/v1/venues", venueRouter);

// ── Error handling (must be last) ───────────────────────────
app.use(notFound);
app.use(errorHandler);
