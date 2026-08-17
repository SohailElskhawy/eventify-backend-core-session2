import type { Request, Response } from "express";

/**
 * Extracts a route parameter string safely.
 */
export function getRouteParam(req: Request, paramName: string = "id"): string {
    const param = req.params[paramName];
    return typeof param === "string" ? param : (param?.[0] ?? "");
}

/**
 * Retrieves typed validated query parameters from res.locals.
 */
export function getValidatedQuery<T>(res: Response): T {
    return res.locals.query as T;
}
