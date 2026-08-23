import type { Request, Response, NextFunction } from "express";
import type { Role } from "../domain.ts";
import { HttpError } from "../errors/HttpError.ts";
import { verifyAccessToken, type JwtPayload } from "./jwt.ts";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware ensuring incoming request has a valid Bearer access token.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new HttpError(401, "Authentication required");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
        throw new HttpError(401, "Authentication required");
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch {
        throw new HttpError(401, "Invalid or expired access token");
    }
}

/**
 * Middleware ensuring authenticated user has one of the allowed roles.
 */
export function requireRole(...roles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new HttpError(401, "Authentication required");
        }

        if (!roles.includes(req.user.role)) {
            throw new HttpError(403, "Forbidden: Insufficient permissions");
        }

        next();
    };
}
