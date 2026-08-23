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
            expect(res.body).toBeDefined();
            expect(res.body.title).toBe("Tech Conference 2026");
            expect(res.body.organizerId).toBe(organizer.user.id);
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
            expect(res.body).toBeDefined();
            expect(res.body.title).toBe("Admin Super Summit");
        });

        it("should return 403 Forbidden when an ATTENDEE tries to create an event", async () => {
            const attendee = await createTestUser({ role: "ATTENDEE" });

            const res = await request(app)
                .post("/v1/events")
                .set(attendee.authHeader)
                .send({
                    title: "Unauthorized Event Attempt",
                    description: "This should be blocked by role authorization middleware.",
                    venue: "Rooftop",
                    startsAt: futureDate,
                    capacity: 50,
                    priceCents: 1000,
                });

            expect(res.status).toBe(403);
        });

        it("should return 401 Unauthorized when unauthenticated request tries to create an event", async () => {
            const res = await request(app)
                .post("/v1/events")
                .send({
                    title: "No Auth Event",
                    description: "No auth header attached.",
                    startsAt: futureDate,
                    capacity: 50,
                    priceCents: 0,
                });

            expect(res.status).toBe(401);
        });

        it("should return 400 Bad Request when startsAt is in the past", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const res = await request(app)
                .post("/v1/events")
                .set(organizer.authHeader)
                .send({
                    title: "Past Event",
                    description: "Should fail validation.",
                    startsAt: pastDate,
                    capacity: 50,
                    priceCents: 0,
                });

            expect(res.status).toBe(400);
        });
    });

    describe("Event Ownership & BOLA Checks (PATCH & DELETE)", () => {
        it("should allow the event owner (ORGANIZER) to update their event", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const event = await createTestEvent({
                organizerId: organizer.user.id,
                title: "Original Title",
            });

            const res = await request(app)
                .patch(`/v1/events/${event.id}`)
                .set(organizer.authHeader)
                .send({ title: "Updated Title by Owner" });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe("Updated Title by Owner");
        });

        it("should return 403 Forbidden when an ORGANIZER tries to update another ORGANIZER's event (BOLA)", async () => {
            const ownerOrganizer = await createTestUser({ role: "ORGANIZER" });
            const attackerOrganizer = await createTestUser({ role: "ORGANIZER" });

            const event = await createTestEvent({
                organizerId: ownerOrganizer.user.id,
                title: "Owner's Event",
            });

            const res = await request(app)
                .patch(`/v1/events/${event.id}`)
                .set(attackerOrganizer.authHeader)
                .send({ title: "Hacked Title" });

            expect(res.status).toBe(403);
        });

        it("should return 403 Forbidden when an ORGANIZER tries to delete another ORGANIZER's event (BOLA)", async () => {
            const ownerOrganizer = await createTestUser({ role: "ORGANIZER" });
            const attackerOrganizer = await createTestUser({ role: "ORGANIZER" });

            const event = await createTestEvent({
                organizerId: ownerOrganizer.user.id,
            });

            const res = await request(app)
                .delete(`/v1/events/${event.id}`)
                .set(attackerOrganizer.authHeader);

            expect(res.status).toBe(403);
        });

        it("should allow an ADMIN to update or delete any event regardless of owner", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const admin = await createTestUser({ role: "ADMIN" });
            const event = await createTestEvent({
                organizerId: organizer.user.id,
                title: "Organizer Event",
            });

            // Admin Update
            const patchRes = await request(app)
                .patch(`/v1/events/${event.id}`)
                .set(admin.authHeader)
                .send({ title: "Admin Override Title" });

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.title).toBe("Admin Override Title");

            // Admin Delete
            const deleteRes = await request(app)
                .delete(`/v1/events/${event.id}`)
                .set(admin.authHeader);

            expect(deleteRes.status).toBe(204);
        });
    });

    describe("Public Read Endpoints", () => {
        it("should allow public unauthenticated access to list events and get by id", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            await createTestEvent({
                organizerId: organizer.user.id,
                title: "Public Event 1",
            });

            const listRes = await request(app).get("/v1/events");
            expect(listRes.status).toBe(200);
            expect(Array.isArray(listRes.body.data)).toBe(true);
            expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

            const eventId = listRes.body.data[0].id;
            const getRes = await request(app).get(`/v1/events/${eventId}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.id).toBe(eventId);
        });
    });
});
