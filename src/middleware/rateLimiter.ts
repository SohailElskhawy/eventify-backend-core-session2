import type { Request, Response, NextFunction } from "express";
import { connectRedis } from "../infra/redis.ts";
import { HttpError } from "../errors/HttpError.ts";

export interface RateLimitOptions {
    /** Time window in seconds (e.g. 60) */
    windowSeconds: number;
    /** Maximum number of allowed requests in the window */
    maxRequests: number;
    /** Key identifier function (e.g. per-IP or per-User ID) */
    keyGenerator?: (req: Request) => string;
    /** Optional custom prefix or path identifier */
    prefix?: string;
}

/**
 * Fixed-window Redis rate limiter middleware.
 * Key format: `rl:{identifier}:{path}:{window}`
 */
export function rateLimiter(options: RateLimitOptions) {
    const {
        windowSeconds,
        maxRequests,
        keyGenerator = (req: Request) => req.ip || req.socket.remoteAddress || "unknown",
        prefix,
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const redis = await connectRedis();
            const identifier = keyGenerator(req);
            const pathIdentifier = prefix ?? (req.baseUrl ? `${req.baseUrl}${req.path}` : req.path);
            const currentWindow = Math.floor(Date.now() / 1000 / windowSeconds);
            const key = `rl:${identifier}:${pathIdentifier}:${currentWindow}`;

            const current = await redis.incr(key);
            if (current === 1) {
                // Set TTL to cover the current window plus an extra buffer for cleanup
                await redis.expire(key, windowSeconds * 2);
            }

            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current));

            if (current > maxRequests) {
                const nowSec = Math.floor(Date.now() / 1000);
                const retryAfter = Math.max(1, (currentWindow + 1) * windowSeconds - nowSec);
                res.setHeader("Retry-After", retryAfter);
                throw new HttpError(429, "Too many requests, please try again later");
            }

            next();
        } catch (err) {
            next(err);
        }
    };
}
