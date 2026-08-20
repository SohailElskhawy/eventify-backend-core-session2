import { prisma } from "../db/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type { User as DomainUser, Role } from "../domain.ts";

type UserRow = Prisma.UserGetPayload<Record<string, never>>;
type RefreshTokenRow = Prisma.RefreshTokenGetPayload<Record<string, never>>;

function toDomainUser(row: UserRow): DomainUser {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role as Role,
        createdAt: row.createdAt.toISOString(),
    };
}

export async function findUserByEmailWithPassword(email: string): Promise<UserRow | null> {
    return prisma.user.findUnique({
        where: { email },
    });
}

export async function findUserById(id: string): Promise<DomainUser | null> {
    const row = await prisma.user.findUnique({
        where: { id },
    });
    return row ? toDomainUser(row) : null;
}

export async function createUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: Role;
}): Promise<DomainUser> {
    const row = await prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            passwordHash: data.passwordHash,
            role: data.role,
        },
    });
    return toDomainUser(row);
}

export async function createRefreshToken(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
}): Promise<RefreshTokenRow> {
    return prisma.refreshToken.create({
        data: {
            tokenHash: data.tokenHash,
            userId: data.userId,
            expiresAt: data.expiresAt,
        },
    });
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    return prisma.refreshToken.findUnique({
        where: { tokenHash },
    });
}

export async function rotateRefreshTokenTransaction(
    oldTokenId: string,
    newTokenData: {
        tokenHash: string;
        userId: string;
        expiresAt: Date;
    },
): Promise<RefreshTokenRow> {
    return prisma.$transaction(async (tx) => {
        const newToken = await tx.refreshToken.create({
            data: {
                tokenHash: newTokenData.tokenHash,
                userId: newTokenData.userId,
                expiresAt: newTokenData.expiresAt,
            },
        });

        await tx.refreshToken.update({
            where: { id: oldTokenId },
            data: {
                revokedAt: new Date(),
                replacedById: newToken.id,
            },
        });

        return newToken;
    });
}

export async function revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
