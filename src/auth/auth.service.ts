import { HttpError } from "../errors/HttpError.ts";
import type { Role, User } from "../domain.ts";
import type { SignupInput, LoginInput } from "./auth.schema.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { generateOpaqueToken, hashToken } from "./token.ts";
import { signAccessToken } from "./jwt.ts";
import * as authRepo from "./auth.repository.ts";
import { Prisma } from "../generated/prisma/client.ts";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthResult {
    accessToken: string;
    rawRefreshToken: string;
    user: User;
}

/**
 * Register a new user with hashed password and return sanitized user DTO.
 */
export async function signup(input: SignupInput): Promise<User> {
    const existing = await authRepo.findUserByEmailWithPassword(input.email);
    if (existing) {
        throw new HttpError(409, "Email is already registered");
    }

    const passwordHash = await hashPassword(input.password);

    try {
        return await authRepo.createUser({
            email: input.email,
            name: input.name,
            passwordHash,
            role: (input.role ?? "ATTENDEE") as Role,
        });
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            throw new HttpError(409, "Email is already registered");
        }
        throw err;
    }
}

/**
 * Authenticate user and issue access JWT + opaque refresh token pair.
 * Returns generic 401 on both unknown email and wrong password to prevent user enumeration.
 */
export async function login(input: LoginInput): Promise<AuthResult> {
    const userRow = await authRepo.findUserByEmailWithPassword(input.email);
    if (!userRow) {
        throw new HttpError(401, "Invalid email or password");
    }

    const isValid = await verifyPassword(input.password, userRow.passwordHash);
    if (!isValid) {
        throw new HttpError(401, "Invalid email or password");
    }

    const user: User = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role as Role,
        createdAt: userRow.createdAt.toISOString(),
    };

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const rawRefreshToken = generateOpaqueToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await authRepo.createRefreshToken({
        tokenHash,
        userId: user.id,
        expiresAt,
    });

    return { accessToken, rawRefreshToken, user };
}

/**
 * Validates opaque refresh token, performs atomic rotation, and returns new access + refresh pair.
 * Returns generic 401 on missing, invalid, expired, or reused tokens.
 */
export async function refresh(rawRefreshToken: string | undefined): Promise<AuthResult> {
    if (!rawRefreshToken) {
        throw new HttpError(401, "Invalid or expired refresh token");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const tokenRow = await authRepo.findRefreshTokenByHash(tokenHash);

    if (!tokenRow) {
        throw new HttpError(401, "Invalid or expired refresh token");
    }

    // Reuse detection: if presented token was already revoked, this is a theft signal!
    if (tokenRow.revokedAt !== null) {
        // Invalidate entire family as defense-in-depth
        await authRepo.revokeAllUserRefreshTokens(tokenRow.userId);
        throw new HttpError(401, "Invalid or expired refresh token");
    }

    // Check expiration
    if (tokenRow.expiresAt < new Date()) {
        throw new HttpError(401, "Invalid or expired refresh token");
    }

    const user = await authRepo.findUserById(tokenRow.userId);
    if (!user) {
        throw new HttpError(401, "Invalid or expired refresh token");
    }

    // Rotate atomically
    const newRawRefreshToken = generateOpaqueToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await authRepo.rotateRefreshTokenTransaction(tokenRow.id, {
        tokenHash: newTokenHash,
        userId: user.id,
        expiresAt: newExpiresAt,
    });

    const newAccessToken = signAccessToken({ sub: user.id, role: user.role });

    return {
        accessToken: newAccessToken,
        rawRefreshToken: newRawRefreshToken,
        user,
    };
}

/**
 * Revokes refresh token in database.
 */
export async function logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
        const tokenHash = hashToken(rawRefreshToken);
        await authRepo.revokeRefreshTokenByHash(tokenHash);
    }
}
