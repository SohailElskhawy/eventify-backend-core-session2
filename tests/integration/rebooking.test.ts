import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";
import { createTestUser } from "../helpers/auth.helper.ts";
import { createTestEvent } from "../helpers/db.helper.ts";

describe("Rebooking & Cancellation Semantics Integration Tests", () => {
    it("should allow a user to cancel a booking and then rebook the same event with status CONFIRMED", async () => {
        const organizer = await createTestUser({ role: "ORGANIZER" });
        const attendee = await createTestUser({ role: "ATTENDEE" });
        const event = await createTestEvent({
            organizerId: organizer.user.id,
            capacity: 5,
        });

        // 1. Initial booking -> CONFIRMED
        const bookRes1 = await request(app)
            .post("/v1/bookings")
            .set(attendee.authHeader)
            .send({ eventId: event.id });

        expect(bookRes1.status).toBe(201);
        expect(bookRes1.body.status).toBe("CONFIRMED");
        const bookingId = bookRes1.body.id;

        // 2. Soft-cancel the booking -> status becomes CANCELLED
        const cancelRes = await request(app)
            .delete(`/v1/bookings/${bookingId}`)
            .set(attendee.authHeader);

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.status).toBe("CANCELLED");

        // 3. Rebook the same event -> must succeed and flip the CANCELLED row back to CONFIRMED
        const rebookRes = await request(app)
            .post("/v1/bookings")
            .set(attendee.authHeader)
            .send({ eventId: event.id });

        expect(rebookRes.status).toBe(201);
        expect(rebookRes.body.id).toBe(bookingId); // Same row flipped
        expect(rebookRes.body.status).toBe("CONFIRMED");
    });

    it("should return 403 Forbidden when a user attempts to cancel another user's booking (BOLA)", async () => {
        const organizer = await createTestUser({ role: "ORGANIZER" });
        const user1 = await createTestUser({ role: "ATTENDEE" });
        const user2 = await createTestUser({ role: "ATTENDEE" });
        const event = await createTestEvent({
            organizerId: organizer.user.id,
            capacity: 5,
        });

        // User 1 creates a booking
        const bookRes = await request(app)
            .post("/v1/bookings")
            .set(user1.authHeader)
            .send({ eventId: event.id });

        expect(bookRes.status).toBe(201);
        const bookingId = bookRes.body.id;

        // User 2 attempts to cancel User 1's booking
        const cancelRes = await request(app)
            .delete(`/v1/bookings/${bookingId}`)
            .set(user2.authHeader);

        expect(cancelRes.status).toBe(403);
    });
});
