import type { Request } from "express";

/**
 * Extracts a route parameter string safely.
 */
export function getRouteParam(req: Request, paramName: string = "id"): string {
    const param = req.params[paramName];
    return typeof param === "string" ? param : (param?.[0] ?? "");
}
