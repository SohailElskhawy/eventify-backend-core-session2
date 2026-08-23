import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";
import { createTestUser } from "../helpers/auth.helper.ts";
import { createTestEvent } from "../helpers/db.helper.ts";

describe("Bookings Integration Tests", () => {
    describe("POST /v1/bookings (Capacity & Waitlist)", () => {
        it("should allow an authenticated user to book an open event and receive status CONFIRMED", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const attendee = await createTestUser({ role: "ATTENDEE" });
            const event = await createTestEvent({
                organizerId: organizer.user.id,
                capacity: 5,
            });

            const res = await request(app)
                .post("/v1/bookings")
                .set(attendee.authHeader)
                .send({ eventId: event.id });

            expect(res.status).toBe(201);
            expect(res.body).toBeDefined();
            expect(res.body.userId).toBe(attendee.user.id);
            expect(res.body.eventId).toBe(event.id);
            expect(res.body.status).toBe("CONFIRMED");
        });

        it("should place the booking on WAITLISTED status when the event capacity is reached", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const event = await createTestEvent({
                organizerId: organizer.user.id,
                capacity: 1, // Capacity 1
            });

            const user1 = await createTestUser({ role: "ATTENDEE" });
            const user2 = await createTestUser({ role: "ATTENDEE" });

            // First user books the only seat -> CONFIRMED
            const res1 = await request(app)
                .post("/v1/bookings")
                .set(user1.authHeader)
                .send({ eventId: event.id });

            expect(res1.status).toBe(201);
            expect(res1.body.status).toBe("CONFIRMED");

            // Second user attempts to book the full event -> WAITLISTED
            const res2 = await request(app)
                .post("/v1/bookings")
                .set(user2.authHeader)
                .send({ eventId: event.id });

            expect(res2.status).toBe(201);
            expect(res2.body.status).toBe("WAITLISTED");
        });

        it("should return 409 Conflict when a user tries to book the same event twice", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const attendee = await createTestUser({ role: "ATTENDEE" });
            const event = await createTestEvent({
                organizerId: organizer.user.id,
                capacity: 10,
            });

            const res1 = await request(app)
                .post("/v1/bookings")
                .set(attendee.authHeader)
                .send({ eventId: event.id });

            expect(res1.status).toBe(201);

            const res2 = await request(app)
                .post("/v1/bookings")
                .set(attendee.authHeader)
                .send({ eventId: event.id });

            expect(res2.status).toBe(409);
        });

        it("should return 401 Unauthorized for unauthenticated booking requests", async () => {
            const organizer = await createTestUser({ role: "ORGANIZER" });
            const event = await createTestEvent({ organizerId: organizer.user.id });

            const res = await request(app)
                .post("/v1/bookings")
                .send({ eventId: event.id });

            expect(res.status).toBe(401);
        });
    });
});
