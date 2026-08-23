import { beforeAll, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/db/prisma.ts";
import { getRedisClient } from "../src/infra/redis.ts";

beforeAll(async () => {
    try {
        await Promise.race([
            prisma.$connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Prisma connection timed out")), 2000)),
        ]);
    } catch (err) {
        console.warn("Prisma connection warning during test beforeAll:", (err as Error).message);
    }
    try {
        const redis = getRedisClient();
        if (!redis.isOpen) {
            await Promise.race([
                redis.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timed out")), 2000)),
            ]);
        }
    } catch (err) {
        console.warn("Redis connection warning during test beforeAll:", (err as Error).message);
    }
});

beforeEach(async () => {
    // Truncate tables in eventify_test to ensure test isolation between suites
    try {
        await Promise.race([
            prisma.$executeRawUnsafe(`
                TRUNCATE TABLE "RefreshToken", "Booking", "Event", "User" CASCADE;
            `),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Truncate timed out")), 2000)),
        ]);
    } catch {
        // Table truncation may fail if DB is unavailable
    }

    // Clear Redis cache and rate limit counters
    try {
        const redis = getRedisClient();
        if (redis.isOpen) {
            await Promise.race([
                redis.flushDb(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("FlushDb timed out")), 2000)),
            ]);
        }
    } catch {
        // Redis may be unavailable
    }
});

afterAll(async () => {
    try {
        await Promise.race([
            prisma.$disconnect(),
            new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);
    } catch {}
    try {
        const redis = getRedisClient();
        if (redis && redis.isOpen) {
            await Promise.race([
                redis.quit(),
                new Promise((resolve) => setTimeout(resolve, 1000)),
            ]);
        }
    } catch {}
});
