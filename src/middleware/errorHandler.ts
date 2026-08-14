import type { Request, Response, NextFunction } from "express";
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
    _next: NextFunction,
): void {
    if (err instanceof HttpError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }

    // Zod 4 validation errors — duck-type check for the `issues` array
    if (
        typeof err === "object" &&
        err !== null &&
        "issues" in err &&
        Array.isArray((err as { issues: unknown[] }).issues)
    ) {
        const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of issues) {
            const key = issue.path.join(".") || "_root";
            (fieldErrors[key] ??= []).push(issue.message);
        }
        res.status(400).json({ error: "Validation failed", details: fieldErrors });
        return;
    }

    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error" });
}
