import { randomUUID } from "node:crypto";
import { HttpError } from "../errors/HttpError.ts";
import type { Booking } from "../domain.ts";
import * as eventService from "../events/event.service.ts";
import type { CreateBookingInput } from "./booking.schema.ts";

/** In-memory store — keyed by id for O(1) lookups. */
const bookings = new Map<string, Booking>();

/** Private helper to find a booking or throw 404 */
function findBookingOrFail(id: string): Booking {
    const booking = bookings.get(id);
    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }
    return booking;
}

export function createBooking(userId: string, input: CreateBookingInput): Booking {
    const event = eventService.getEventById(input.eventId);

    // Duplicate check: same userId + eventId pair (any status, including CANCELLED)
    for (const b of bookings.values()) {
        if (b.userId === userId && b.eventId === input.eventId) {
            throw new HttpError(409, "User already has a booking for this event");
        }
    }

    // Capacity check: count CONFIRMED bookings for this event
    let confirmedCount = 0;
    for (const b of bookings.values()) {
        if (b.eventId === input.eventId && b.status === "CONFIRMED") {
            confirmedCount++;
        }
    }

    if (confirmedCount >= event.capacity) {
        throw new HttpError(409, "Event is at capacity");
    }

    const booking: Booking = {
        id: randomUUID(),
        userId,
        eventId: input.eventId,
        status: "CONFIRMED",
        createdAt: new Date().toISOString(),
    };

    bookings.set(booking.id, booking);
    return booking;
}

export function getBookingById(id: string): Booking {
    return findBookingOrFail(id);
}

export function cancelBooking(id: string): Booking {
    const booking = findBookingOrFail(id);
    booking.status = "CANCELLED";
    bookings.set(id, booking);
    return booking;
}
