import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.ts";

export const jwtPayloadSchema = z.object({
    sub: z.uuid("Invalid subject ID in token"),
    role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

const JWT_ALGORITHM = "HS256" as const;
const ACCESS_TOKEN_EXPIRY = "15m";

/**
 * Signs a 15-minute access token pinned to HS256.
 */
export function signAccessToken(payload: JwtPayload): string {
    return jwt.sign(
        {
            sub: payload.sub,
            role: payload.role,
        },
        config.jwtAccessSecret,
        {
            algorithm: JWT_ALGORITHM,
            expiresIn: ACCESS_TOKEN_EXPIRY,
        },
    );
}

/**
 * Verifies an access token pinned to HS256 and parses the payload with Zod.
 * Never casts decoded payload — always validated via schema.
 */
export function verifyAccessToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, config.jwtAccessSecret, {
        algorithms: [JWT_ALGORITHM],
    });

    const parsed = jwtPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
        throw new Error("Malformed JWT payload claims");
    }

    return parsed.data;
}
