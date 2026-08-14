import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/HttpError.ts";

/**
 * Centralized error-handling middleware.
 * Must be registered LAST (after all routes).
 *
 * - HttpError  → its statusCode + message
 * - ZodError   → 400 + flattened field errors
 * - Anything else → 500 Internal Server Error (logged, never leaked)
 */
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
): void {
    if (err instanceof HttpError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }

    if (err instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of err.issues) {
            const key = issue.path.join(".") || "_root";
            (fieldErrors[key] ??= []).push(issue.message);
        }
        res.status(400).json({ error: "Validation failed", details: fieldErrors });
        return;
    }

    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error" });
}
