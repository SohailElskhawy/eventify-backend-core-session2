import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";
import { createTestUser } from "../helpers/auth.helper.ts";
import { createTestEvent } from "../helpers/db.helper.ts";

describe("Events Integration Tests", () => {
    describe("POST /v1/events (Role-gated event creation)", () => {
        const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

        it("should allow an ORGANIZER to create an event with status 201", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });

            const res = await request(app)
                .post("/v1/events")
                .set(organizer.authHeader)
                .send({
                    title: "Tech Conference 2026",
                    description: "A premier tech gathering for engineers and builders.",
                    venue: "Tech Convention Center",
                    startsAt: futureDate,
                    capacity: 100,
                    priceCents: 5000,
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.title).toBe("Tech Conference 2026");
            expect(res.body.data.organizerId).toBe(organizer.user.id);
        });

        it("should allow an ADMIN to create an event with status 201", async () => {
            const admin = await createTestUser({ role: "ADMIN" });

            const res = await request(app)
                .post("/v1/events")
                .set(admin.authHeader)
                .send({
                    title: "Admin Super Summit",
                    description: "Official company all-hands and keynote speeches.",
                    venue: "Main Auditorium",
                    startsAt: futureDate,
                    capacity: 500,
                    priceCents: 0,
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.title).toBe("Admin Super Summit");
        });

        it("should return 403 Forbidden when an ATTENDEE tries to create an event", async () => {
            const attendee = await createTestUser({ role: "ATTENDEE" });

            const res = await request(app)
                .post("/v1/events")
                .set(attendee.authHeader)
                .send({
                    title: "Unauthorized Event Attempt",
                    description: "This should be blocked by role authorization middleware.",
                    venue: "Secret Garden",
                    startsAt: futureDate,
                    capacity: 20,
                    priceCents: 1000,
                });

            expect(res.status).toBe(403);
        });

        it("should return 401 Unauthorized when an unauthenticated user tries to create an event", async () => {
            const res = await request(app)
                .post("/v1/events")
                .send({
                    title: "No Auth Event",
                    description: "This request has no authorization header.",
                    venue: "Public Park",
                    startsAt: futureDate,
                    capacity: 50,
                    priceCents: 1500,
                });

            expect(res.status).toBe(401);
        });
    });

    describe("Event Ownership & BOLA Checks (PATCH & DELETE)", () => {
        const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        it("should allow the event owner (ORGANIZER) to update their event", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const event = await createTestEvent({
                organizerId: organizer.user.id,
                startsAt: futureDate,
            });

            const res = await request(app)
                .patch(`/v1/events/${event.id}`)
                .set(organizer.authHeader)
                .send({
                    title: "Updated Event Title By Owner",
                });

            expect(res.status).toBe(200);
            expect(res.body.data.title).toBe("Updated Event Title By Owner");
        });

        it("should return 403 Forbidden when another ORGANIZER tries to update the event (BOLA)", async () => {
            const owner = await createTestUser({ role: "ORGANIZER" });
            const intruder = await createTestUser({ role: "ORGANIZER" });
            const event = await createTestEvent({
                organizerId: owner.user.id,
                startsAt: futureDate,
            });

            const res = await request(app)
                .patch(`/v1/events/${event.id}`)
                .set(intruder.authHeader)
                .send({
                    title: "Hijacked Event Title",
                });

            expect(res.status).toBe(403);
        });

        it("should allow an ADMIN to update or delete any event regardless of owner", async () => {
            const owner = await createTestUser({ role: "ORGANIZER" });
            const admin = await createTestUser({ role: "ADMIN" });
            const event = await createTestEvent({
                organizerId: owner.user.id,
                startsAt: futureDate,
            });

            const patchRes = await request(app)
                .patch(`/v1/events/${event.id}`)
                .set(admin.authHeader)
                .send({
                    title: "Admin Modified Title",
                });

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.data.title).toBe("Admin Modified Title");

            const deleteRes = await request(app)
                .delete(`/v1/events/${event.id}`)
                .set(admin.authHeader);

            expect(deleteRes.status).toBe(204);
        });
    });

    describe("Public Read Endpoints", () => {
        it("should allow public unauthenticated access to list events and get by id", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const event = await createTestEvent({ organizerId: organizer.user.id });

            const listRes = await request(app).get("/v1/events");
            expect(listRes.status).toBe(200);
            expect(Array.isArray(listRes.body.data)).toBe(true);

            const getRes = await request(app).get(`/v1/events/${event.id}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.data.id).toBe(event.id);
        });
    });
});
