import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";
import { createTestUser } from "../helpers/auth.helper.ts";
import { createTestEvent } from "../helpers/db.helper.ts";
import { getRedisClient } from "../../src/infra/redis.ts";

describe("Cache Invalidation Integration Tests", () => {
    it("should serve from cache on repeated read and return fresh data after write invalidation", async () => {
        const organizer = await createTestUser({ role: "ORGANIZER" });
        const event = await createTestEvent({
            organizerId: organizer.user.id,
            title: "Original Cacheable Title",
        });

        const redis = getRedisClient();
        const cacheKey = `event:${event.id}`;

        // 1. First read — cache miss in Redis, fetched from DB and populated into Redis
        const res1 = await request(app).get(`/v1/events/${event.id}`);
        expect(res1.status).toBe(200);
        expect(res1.body.data.title).toBe("Original Cacheable Title");

        // Verify key exists in Redis
        if (redis.isOpen) {
            const rawCached = await redis.get(cacheKey);
            expect(rawCached).toBeDefined();
            if (rawCached) {
                const parsedCached = JSON.parse(rawCached);
                expect(parsedCached.title).toBe("Original Cacheable Title");
            }
        }

        // 2. Perform write / update on the event
        const updateRes = await request(app)
            .patch(`/v1/events/${event.id}`)
            .set(organizer.authHeader)
            .send({ title: "Updated Fresh Title" });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.title).toBe("Updated Fresh Title");

        // 3. Verify that the cache key was deleted in Redis
        if (redis.isOpen) {
            const cachedAfterUpdate = await redis.get(cacheKey);
            expect(cachedAfterUpdate).toBeNull();
        }

        // 4. Next read must return the fresh updated data from DB and re-cache it
        const res2 = await request(app).get(`/v1/events/${event.id}`);
        expect(res2.status).toBe(200);
        expect(res2.body.data.title).toBe("Updated Fresh Title");
    });
});
