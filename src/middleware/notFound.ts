import type { Request, Response } from "express";

/**
 * Catch-all for unmatched routes — returns 404 JSON.
 * Register after all routers but before the error handler.
 */
export function notFound(_req: Request, res: Response): void {
    res.status(404).json({ error: "Not Found" });
}
