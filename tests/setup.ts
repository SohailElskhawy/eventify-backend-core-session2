// Set environment variables BEFORE importing any application module or config
process.env.NODE_ENV = "test";
process.env.PORT = "3000";

const rawDbUrl = process.env.DATABASE_URL || "postgresql://eventify:301077@localhost:5432/eventify";
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("eventify_test")) {
    process.env.DATABASE_URL = rawDbUrl.replace(/\/eventify(\?.*)?$/, "/eventify_test$1");
}

if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = "redis://localhost:6379";
}

if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = "super-secret-jwt-access-token-key-at-least-32-chars-long";
}

if (!process.env.WEB_ORIGIN) {
    process.env.WEB_ORIGIN = "http://localhost:3000";
}

import { beforeAll, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/db/prisma.ts";
import { getRedisClient, connectRedis, disconnectRedis } from "../src/infra/redis.ts";

beforeAll(async () => {
    try {
        await prisma.$connect();
    } catch (err) {
        console.warn("Prisma connection warning during test beforeAll:", err);
    }
    try {
        await connectRedis();
    } catch (err) {
        console.warn("Redis connection warning during test beforeAll:", err);
    }
});

beforeEach(async () => {
    // Truncate tables in eventify_test to ensure test isolation between suites
    try {
        await prisma.$executeRawUnsafe(`
            TRUNCATE TABLE "RefreshToken", "Booking", "Event", "User" CASCADE;
        `);
    } catch {
        // Table truncation may fail if DB is unavailable or schema is being created
    }

    // Clear Redis cache and rate limit counters
    try {
        const redis = getRedisClient();
        if (redis.isOpen) {
            await redis.flushDb();
        }
    } catch {
        // Redis may be unavailable
    }
});

afterAll(async () => {
    try {
        await prisma.$disconnect();
    } catch {}
    try {
        await disconnectRedis();
    } catch {}
});
