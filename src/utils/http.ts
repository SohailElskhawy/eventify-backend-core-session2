import type { Request } from "express";
import type { PaginatedResult } from "../domain.ts";

/**
 * Extracts a route parameter string safely.
 */
export function getRouteParam(req: Request, paramName: string = "id"): string {
    const param = req.params[paramName];
    return typeof param === "string" ? param : (param?.[0] ?? "");
}

/**
 * Helper to paginate an in-memory array.
 */
export function paginate<T>(items: T[], page: number, limit: number): PaginatedResult<T> {
    const total = items.length;
    const offset = (page - 1) * limit;
    const data = items.slice(offset, offset + limit);

    return {
        data,
        total,
        page,
        limit,
    };
}
