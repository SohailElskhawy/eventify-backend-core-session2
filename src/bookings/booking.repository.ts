import { prisma } from "../db/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type { Booking as DomainBooking, BookingStatus } from "../domain.ts";

/**
 * Booking repository — the only layer that directly interacts with Prisma for bookings.
 * Handles row-level persistence and mapping database entities to domain models.
 */

export type TxClient = Prisma.TransactionClient;
type BookingRow = Prisma.BookingGetPayload<Record<string, never>>;

export function toDomain(row: BookingRow): DomainBooking {
    return {
        id: row.id,
        userId: row.userId,
        eventId: row.eventId,
        status: row.status as BookingStatus,
        createdAt: row.createdAt.toISOString(),
    };
}

export async function findBookingById(id: string): Promise<DomainBooking | null> {
    const row = await prisma.booking.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
}

export async function softCancelBooking(id: string): Promise<DomainBooking | null> {
    try {
        const row = await prisma.booking.update({
            where: { id },
            data: { status: "CANCELLED" },
        });
        return toDomain(row);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
            return null;
        }
        throw err;
    }
}

// ── Transactional Repository Operations (used inside prisma.$transaction) ──

export async function countConfirmedBookingsTx(tx: TxClient, eventId: string): Promise<number> {
    return tx.booking.count({
        where: { eventId, status: "CONFIRMED" },
    });
}

export async function findEventCapacityTx(tx: TxClient, eventId: string): Promise<{ capacity: number }> {
    return tx.event.findUniqueOrThrow({
        where: { id: eventId },
        select: { capacity: true },
    });
}

export async function findBookingByUserAndEventTx(
    tx: TxClient,
    userId: string,
    eventId: string,
): Promise<DomainBooking | null> {
    const row = await tx.booking.findUnique({
        where: { userId_eventId: { userId, eventId } },
    });
    return row ? toDomain(row) : null;
}

export async function createBookingTx(
    tx: TxClient,
    data: { userId: string; eventId: string; status: BookingStatus },
): Promise<DomainBooking> {
    const row = await tx.booking.create({
        data: {
            userId: data.userId,
            eventId: data.eventId,
            status: data.status,
        },
    });
    return toDomain(row);
}

export async function updateBookingStatusTx(
    tx: TxClient,
    id: string,
    status: BookingStatus,
): Promise<DomainBooking> {
    const row = await tx.booking.update({
        where: { id },
        data: { status },
    });
    return toDomain(row);
}

export async function findOldestWaitlistedBookingTx(
    tx: TxClient,
    eventId: string,
): Promise<DomainBooking | null> {
    const row = await tx.booking.findFirst({
        where: { eventId, status: "WAITLISTED" },
        orderBy: { createdAt: "asc" },
    });
    return row ? toDomain(row) : null;
}
