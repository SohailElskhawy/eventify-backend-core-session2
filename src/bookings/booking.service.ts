import { prisma } from "../db/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { HttpError } from "../errors/HttpError.ts";
import type { Booking } from "../domain.ts";
import type { CreateBookingInput } from "./booking.schema.ts";
import * as bookingRepo from "./booking.repository.ts";
import type { TxClient } from "./booking.repository.ts";

/**
 * Transactional booking creation.
 *
 * THE RACE THIS FIXES (Session 3 exit-ticket answer):
 * --------------------------------**********************
 * A naive "count confirmed, then insert" is a check-then-act sequence.
 * Under concurrency, two requests can both read "4 confirmed, capacity 5"
 * before either inserts — both succeed → 6 confirmed → oversold.
 *
 * THE FIX:
 *   The entire check-then-act runs inside a single `Serializable` transaction.
 *   Postgres's Serializable Snapshot Isolation (SSI) detects that the two
 *   transactions' read/write sets conflict, aborts the second commit with
 *   `P2034`, and the retry loop re-reads the now-updated count under the new
 *   state. What makes overselling *impossible* is that the capacity read and
 *   the insert are one indivisible serializable unit — the database itself
 *   refuses the inconsistent state, and we retry until it succeeds or we
 *   hit the retry bound.
 *
 * RULES (from the homework rebooking table):
 *   existing row none        → create CONFIRMED
 *   existing row CANCELLED   → flip back to CONFIRMED (same tx, same capacity check)
 *   existing row CONFIRMED   → duplicate — let P2002 fire → map to 409
 *   existing row WAITLISTED  → leave alone (promotion is Session 5's job)
 */

/** Maximum retries on serialization conflicts (P2034 / 40001). */
const MAX_RETRIES = 10;

/**
 * Checks whether an error is a Postgres/Prisma serialization conflict.
 * Under Serializable isolation, Postgres rejects concurrent read/write overlapping
 * transactions with SQLSTATE 40001. In Prisma 7 with @prisma/adapter-pg, this is surfaced
 * via DriverAdapterError (cause.originalCode '40001' or kind 'TransactionWriteConflict'),
 * or as PrismaClientKnownRequestError with code P2034.
 */
function isSerializationError(err: unknown): boolean {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
        return true;
    }
    const originalCode = (err as { cause?: { originalCode?: string } })?.cause?.originalCode;
    const kind = (err as { cause?: { kind?: string } })?.cause?.kind;
    const msg = (err as { message?: string })?.message ?? "";
    return (
        originalCode === "40001" ||
        kind === "TransactionWriteConflict" ||
        msg.includes("TransactionWriteConflict") ||
        msg.includes("could not serialize access")
    );
}

/**
 * The core transaction body — runs inside `prisma.$transaction`.
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
                if (isFull) {
                    throw new HttpError(409, "Event is at full capacity");
                }
                return bookingRepo.updateBookingStatusTx(tx, existing.id, "CONFIRMED");
            }

            case "WAITLISTED":
                return existing;
        }
    }

    // 3. No existing row — create a new booking.
    if (isFull) {
        throw new HttpError(409, "Event is at full capacity");
    }

    try {
        return await bookingRepo.createBookingTx(tx, {
            userId,
            eventId,
            status: "CONFIRMED",
        });
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            throw new HttpError(409, "User already has a booking for this event");
        }
        throw err;
    }
}

/**
 * Public entry point — wraps the transaction body in the retry loop.
 */
export async function createBooking(userId: string, input: CreateBookingInput): Promise<Booking> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await prisma.$transaction(
                (tx) => executeBookingTransaction(tx, userId, input.eventId),
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (err) {
            if (isSerializationError(err)) {
                lastError = err;
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.floor(Math.random() * 30) + 10),
                );
                continue;
            }
            throw err;
        }
    }

    void lastError;
    throw new HttpError(503, "Could not complete booking due to concurrent conflicts — please retry");
}

// ── Read & Cancel ───────────────────────────────────────────

export async function getBookingById(id: string): Promise<Booking> {
    const booking = await bookingRepo.findBookingById(id);
    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }
    return booking;
}

export async function cancelBooking(id: string): Promise<Booking> {
    const cancelled = await bookingRepo.softCancelBooking(id);
    if (!cancelled) {
        throw new HttpError(404, "Booking not found");
    }
    return cancelled;
}
