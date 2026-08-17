import { prisma } from "../db/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type { Event as DomainEvent } from "../domain.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";
import type { PaginatedResult } from "../domain.ts";

/**
 * Event repository — the only layer that touches Prisma for events.
 * Services stay storage-agnostic; controllers stay unchanged in shape.
 *
 * Prisma stores dates as JS `Date`; the domain layer uses ISO strings,
 * so `toDomain` maps every row on the way out.
 */

type EventRow = Prisma.EventGetPayload<Record<string, never>>;

function toDomain(row: EventRow): DomainEvent {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        venue: row.venue,
        startsAt: row.startsAt.toISOString(),
        capacity: row.capacity,
        priceCents: row.priceCents,
        organizerId: row.organizerId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export async function createEvent(input: CreateEventInput): Promise<DomainEvent> {
    const row = await prisma.event.create({
        data: {
            title: input.title,
            description: input.description,
            venue: input.venue,
            startsAt: new Date(input.startsAt),
            capacity: input.capacity,
            priceCents: input.priceCents,
            organizerId: input.organizerId,
        },
    });
    return toDomain(row);
}

export async function findEventById(id: string): Promise<DomainEvent | null> {
    const row = await prisma.event.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
}

export async function listEvents(query: ListEventsQuery): Promise<PaginatedResult<DomainEvent>> {
    const { page, limit, venue, from, to } = query;

    const where: Prisma.EventWhereInput = {};
    if (venue !== undefined) where.venue = venue;
    if (from !== undefined || to !== undefined) {
        where.startsAt = {};
        if (from !== undefined) where.startsAt.gte = new Date(from);
        if (to !== undefined) where.startsAt.lte = new Date(to);
    }

    const [total, rows] = await Promise.all([
        prisma.event.count({ where }),
        prisma.event.findMany({
            where,
            orderBy: { startsAt: "asc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);

    return {
        data: rows.map(toDomain),
        total,
        page,
        limit,
    };
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<DomainEvent | null> {
    const data: Prisma.EventUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.venue !== undefined) data.venue = input.venue;
    if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt);
    if (input.capacity !== undefined) data.capacity = input.capacity;
    if (input.priceCents !== undefined) data.priceCents = input.priceCents;
    if (input.organizerId !== undefined) data.organizerId = input.organizerId;

    try {
        const row = await prisma.event.update({ where: { id }, data });
        return toDomain(row);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
            return null;
        }
        throw err;
    }
}

export async function deleteEvent(id: string): Promise<boolean> {
    try {
        await prisma.event.delete({ where: { id } });
        return true;
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
            return false;
        }
        throw err;
    }
}
