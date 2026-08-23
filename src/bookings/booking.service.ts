import { HttpError } from "../errors/HttpError.ts";
import type { Booking } from "../domain.ts";
import type { CreateBookingInput } from "./booking.schema.ts";
import * as bookingRepo from "./booking.repository.ts";
import type { TxClient } from "./booking.repository.ts";
import { runSerializableTransaction } from "../db/transaction.ts";
import type { JwtPayload } from "../auth/jwt.ts";
import { waitlistQueue } from "../jobs/waitlist.queue.ts";

/**
 * Transactional booking creation with Waitlist support.
 *
 * RULES:
 *   existing row none        → create CONFIRMED (if seats available) or WAITLISTED (if full)
 *   existing row CANCELLED   → flip to CONFIRMED (if seats available) or WAITLISTED (if full)
 *   existing row CONFIRMED   → duplicate — let P2002 fire → map to 409
 *   existing row WAITLISTED  → return existing row
 */

/**
 * The core transaction body — runs inside `runSerializableTransaction`.
 * Every read and write goes through `tx` in repository methods, NEVER `prisma`.
 */
async function executeBookingTransaction(
    tx: TxClient,
    userId: string,
    eventId: string,
): Promise<Booking> {
    // 1. Capacity check — count CONFIRMED bookings only.
    const [confirmedCount, event] = await Promise.all([
        bookingRepo.countConfirmedBookingsTx(tx, eventId),
        bookingRepo.findEventCapacityTx(tx, eventId),
    ]);

    const isFull = confirmedCount >= event.capacity;

    // 2. Rebooking: look up existing row for this user+event pair.
    const existing = await bookingRepo.findBookingByUserAndEventTx(tx, userId, eventId);

    if (existing) {
        switch (existing.status) {
            case "CONFIRMED":
                throw new HttpError(409, "User already has a booking for this event");

            case "CANCELLED": {
                const targetStatus = isFull ? "WAITLISTED" : "CONFIRMED";
                return bookingRepo.updateBookingStatusTx(tx, existing.id, targetStatus);
            }

            case "WAITLISTED":
                return existing;
        }
    }

    // 3. No existing row — create a new booking (CONFIRMED if seats available, WAITLISTED if full).
    const initialStatus = isFull ? "WAITLISTED" : "CONFIRMED";

    try {
        return await bookingRepo.createBookingTx(tx, {
            userId,
            eventId,
            status: initialStatus,
        });
    } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
            throw new HttpError(409, "User already has a booking for this event");
        }
        throw err;
    }
}

/**
 * Public entry point — wraps the transaction body in the retry loop.
 */
export async function createBooking(userId: string, input: CreateBookingInput): Promise<Booking> {
    return runSerializableTransaction((tx) =>
        executeBookingTransaction(tx, userId, input.eventId),
    );
}

// ── Read & Cancel (with Ownership checks & Waitlist Promotion) ───────────────────

/** Asserts that the authenticated user owns the booking or has ADMIN role (BOLA prevention) */
function assertBookingOwnership(booking: Booking, currentUser: JwtPayload): void {
    if (currentUser.role !== "ADMIN" && booking.userId !== currentUser.sub) {
        throw new HttpError(403, "Forbidden: You do not own this booking");
    }
}

export async function getBookingById(id: string, currentUser: JwtPayload): Promise<Booking> {
    const booking = await bookingRepo.findBookingById(id);
    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }

    assertBookingOwnership(booking, currentUser);
    return booking;
}

export async function cancelBooking(id: string, currentUser: JwtPayload): Promise<Booking> {
    const booking = await bookingRepo.findBookingById(id);
    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }

    assertBookingOwnership(booking, currentUser);

    const wasConfirmed = booking.status === "CONFIRMED";
    const cancelled = await bookingRepo.softCancelBooking(id);
    if (!cancelled) {
        throw new HttpError(404, "Booking not found");
    }

    // When a CONFIRMED booking is cancelled, enqueue a waitlist promotion job
    if (wasConfirmed) {
        try {
            await waitlistQueue.add("promote", { eventId: booking.eventId });
        } catch (err) {
            console.error(`Failed to enqueue waitlist-promote job for event ${booking.eventId}:`, err);
        }
    }

    return cancelled;
}
