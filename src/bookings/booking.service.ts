import { prisma } from "../db/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type { BookingStatus } from "../generated/prisma/client.ts";
import { HttpError } from "../errors/HttpError.ts";
import type { Booking } from "../domain.ts";
import type { CreateBookingInput } from "./booking.schema.ts";

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
 *
 * STRETCH:
 *   - Retry loop: catch P2034 (serialization failure), re-run the whole tx.
 *   - Waitlist: when the event is full, create WAITLISTED instead of 409.
 */

/** Maximum retries on serialization conflicts (P2034 / 40001). */
const MAX_RETRIES = 10;

// Prisma's transaction client type — the exact type passed into $transaction(fn).
type TxClient = Prisma.TransactionClient;

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
 * Every read and write goes through `tx`, NEVER `prisma` — touching `prisma`
 * here silently escapes the transaction and reopens the oversell race.
 */
async function createBookingTx(
    tx: TxClient,
    userId: string,
    eventId: string,
): Promise<Booking> {
    // 1. Capacity check — count CONFIRMED bookings only.
    //    CANCELLED and WAITLISTED rows don't consume capacity.
    const [confirmedCount, event] = await Promise.all([
        tx.booking.count({ where: { eventId, status: "CONFIRMED" } }),
        tx.event.findUniqueOrThrow({ where: { id: eventId } }),
    ]);

    const isFull = confirmedCount >= event.capacity;

    // 2. Rebooking: look up the existing row for this user+event pair.
    //    @@unique([userId, eventId]) means at most one row ever exists.
    const existing = await tx.booking.findUnique({
        where: { userId_eventId: { userId, eventId } },
    });

    if (existing) {
        switch (existing.status as BookingStatus) {
            case "CONFIRMED":
                // Duplicate confirmed booking — 409.
                throw new HttpError(409, "User already has a booking for this event");

            case "CANCELLED": {
                if (isFull) {
                    throw new HttpError(409, "Event is at full capacity");
                }
                // Flip CANCELLED → CONFIRMED inside the same transaction.
                // The capacity check above already ran under Serializable
                // isolation, so this flip is safe.
                const confirmed = await tx.booking.update({
                    where: { id: existing.id },
                    data: { status: "CONFIRMED" },
                });
                return toDomain(confirmed);
            }

            case "WAITLISTED":
                // Leave alone — promotion is Session 5's job.
                return toDomain(existing);
        }
    }

    // 3. No existing row — create a new booking.
    if (isFull) {
        throw new HttpError(409, "Event is at full capacity");
    }

    try {
        const row = await tx.booking.create({
            data: { userId, eventId, status: "CONFIRMED" },
        });
        return toDomain(row);
    } catch (err) {
        // P2002 = unique constraint violation on [userId, eventId].
        // This happens if a concurrent tx inserted the same pair first.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            throw new HttpError(409, "User already has a booking for this event");
        }
        throw err;
    }
}

/**
 * Public entry point — wraps the transaction body in the retry loop.
 * On serialization failure under Serializable isolation, the whole transaction
 * is re-run from scratch with randomized backoff, up to MAX_RETRIES times.
 */
export async function createBooking(userId: string, input: CreateBookingInput): Promise<Booking> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await prisma.$transaction(
                (tx) => createBookingTx(tx, userId, input.eventId),
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (err) {
            if (isSerializationError(err)) {
                lastError = err;
                // Add randomized backoff (10-40ms) to reduce contention on retry
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.floor(Math.random() * 30) + 10),
                );
                continue;
            }
            // HttpError (409, 404, etc.) or other domain errors — propagate immediately
            throw err;
        }
    }

    // Exhausted retries — the database kept refusing the serialization.
    void lastError;
    throw new HttpError(503, "Could not complete booking due to concurrent conflicts — please retry");
}

// ── Read & cancel ───────────────────────────────────────────

export async function getBookingById(id: string): Promise<Booking> {
    const row = await prisma.booking.findUnique({ where: { id } });
    if (!row) {
        throw new HttpError(404, "Booking not found");
    }
    return toDomain(row);
}

/**
 * Soft cancel — the row stays, status flips to CANCELLED.
 * This is what enables rebooking: the @@unique([userId, eventId]) constraint
 * would block a second row, so we flip the existing one back to CONFIRMED
 * inside the transaction when the user rebooks.
 */
export async function cancelBooking(id: string): Promise<Booking> {
    try {
        const row = await prisma.booking.update({
            where: { id },
            data: { status: "CANCELLED" },
        });
        return toDomain(row);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
            throw new HttpError(404, "Booking not found");
        }
        throw err;
    }
}

// ── Mapping helper ──────────────────────────────────────────

type BookingRow = Prisma.BookingGetPayload<Record<string, never>>;

function toDomain(row: BookingRow): Booking {
    return {
        id: row.id,
        userId: row.userId,
        eventId: row.eventId,
        status: row.status as Booking["status"],
        createdAt: row.createdAt.toISOString(),
    };
}
