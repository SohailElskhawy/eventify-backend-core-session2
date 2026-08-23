import { prisma } from "../../src/db/prisma.ts";
import { hashPassword } from "../../src/auth/password.ts";
import { signAccessToken } from "../../src/auth/jwt.ts";
import type { Role } from "../../src/generated/prisma/enums.ts";

export interface CreateTestUserOptions {
    email?: string;
    name?: string;
    password?: string;
    role?: Role;
}

/**
 * Creates a real user in the test database with a hashed password,
 * and generates a signed HS256 JWT access token for testing authenticated requests.
 */
export async function createTestUser(options: CreateTestUserOptions = {}) {
    const password = options.password ?? "Password123!";
    const passwordHash = await hashPassword(password);
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const email = options.email ?? `user-${uniqueSuffix}@example.com`;
    const name = options.name ?? `Test User ${uniqueSuffix}`;
    const role = options.role ?? "ATTENDEE";

    const user = await prisma.user.create({
        data: {
            email,
            name,
            passwordHash,
            role,
        },
    });

    const token = signAccessToken({ sub: user.id, role: user.role });

    return {
        user,
        password,
        token,
        authHeader: { Authorization: `Bearer ${token}` },
    };
}
