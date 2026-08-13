import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Validates `req.body` against a Zod schema.
 * On success the parsed (and potentially transformed) value replaces req.body.
 * On failure the Zod error is forwarded to the centralized error handler.
 */
export function validate(schema: ZodType) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            next(result.error);
            return;
        }
        req.body = result.data;
        next();
    };
}

/**
 * Validates `req.query` against a Zod schema.
 * Parsed data is stashed on `res.locals.query` since `req.query`
 * is read-only in Express 5.
 */
export function validateQuery(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            next(result.error);
            return;
        }
        res.locals.query = result.data;
        next();
    };
}

