import { randomBytes, createHash } from "node:crypto";

/**
 * Generates a cryptographically secure opaque token (32 random bytes, base64url encoded).
 */
export function generateOpaqueToken(): string {
    return randomBytes(32).toString("base64url");
}

/**
 * Produces a SHA-256 hex digest of a raw token string.
 * The database only stores this hash, never the raw token.
 */
export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}
