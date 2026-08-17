import { prisma } from "../db/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type { Venue as DomainVenue } from "../domain.ts";
import type { CreateVenueInput, UpdateVenueInput } from "./venue.schema.ts";
import type { PaginatedResult } from "../domain.ts";

/**
 * Venue repository — the only layer that touches Prisma for venues.
 * Mirrors event.repository.ts: Prisma rows mapped to domain types on the way out.
 */

type VenueRow = Prisma.VenueGetPayload<Record<string, never>>;

function toDomain(row: VenueRow): DomainVenue {
    return {
        id: row.id,
        name: row.name,
        address: row.address,
        capacity: row.capacity,
        contactEmail: row.contactEmail,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export async function createVenue(input: CreateVenueInput): Promise<DomainVenue> {
    const row = await prisma.venue.create({
        data: {
            name: input.name,
            address: input.address,
            capacity: input.capacity,
            contactEmail: input.contactEmail,
        },
    });
    return toDomain(row);
}

export async function findVenueById(id: string): Promise<DomainVenue | null> {
    const row = await prisma.venue.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
}

export async function findVenueByName(name: string, excludeId?: string): Promise<DomainVenue | null> {
    const row = await prisma.venue.findFirst({
        where: {
            name: { equals: name, mode: "insensitive" },
            ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
        },
    });
    return row ? toDomain(row) : null;
}

export async function listVenues(page: number, limit: number): Promise<PaginatedResult<DomainVenue>> {
    const [total, rows] = await Promise.all([
        prisma.venue.count(),
        prisma.venue.findMany({
            orderBy: { createdAt: "asc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);
    return { data: rows.map(toDomain), total, page, limit };
}

export async function updateVenue(id: string, input: UpdateVenueInput): Promise<DomainVenue | null> {
    const data: Prisma.VenueUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.address !== undefined) data.address = input.address;
    if (input.capacity !== undefined) data.capacity = input.capacity;
    if (input.contactEmail !== undefined) data.contactEmail = input.contactEmail;

    try {
        const row = await prisma.venue.update({ where: { id }, data });
        return toDomain(row);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2025" || err.code === "P2002")) {
            return null;
        }
        throw err;
    }
}

export async function deleteVenue(id: string): Promise<boolean> {
    try {
        await prisma.venue.delete({ where: { id } });
        return true;
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
            return false;
        }
        throw err;
    }
}
