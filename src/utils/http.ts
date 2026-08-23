import type { Request, Response } from "express";
import type { JwtPayload } from "../auth/jwt.ts";
import { HttpError } from "../errors/HttpError.ts";

/**
 * Extracts a route parameter string safely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRouteParam(req: Request<any, any, any, any, any>, paramName: string = "id"): string {
    const param = req.params[paramName];
    return typeof param === "string" ? param : (param?.[0] ?? "");
}

/**
 * Retrieves typed validated query parameters from res.locals.
 */
export function getValidatedQuery<T>(res: Response): T {
    return res.locals.query as T;
}

/**
 * Safely extracts the authenticated user attached by requireAuth middleware.
 * Throws 401 if req.user is absent, eliminating unsafe non-null assertions (!).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAuthenticatedUser(req: Request<any, any, any, any, any>): JwtPayload {
    if (!req.user) {
        throw new HttpError(401, "Authentication required");
    }
    return req.user;
}
