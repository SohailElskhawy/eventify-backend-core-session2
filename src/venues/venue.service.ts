import { randomUUID } from "node:crypto";
import { HttpError } from "../errors/HttpError.ts";
import type { Venue, PaginatedResult } from "../domain.ts";
import type { CreateVenueInput, UpdateVenueInput } from "./venue.schema.ts";
import { paginate } from "../utils/http.ts";

/** In-memory store — keyed by id for O(1) lookups. */
const venues = new Map<string, Venue>();

/** Private DRY helper to find a venue or throw 404 */
function findVenueOrFail(id: string): Venue {
    const venue = venues.get(id);
    if (!venue) {
        throw new HttpError(404, "Venue not found");
    }
    return venue;
}

/** Case-insensitive venue name uniqueness check */
function assertUniqueVenueName(name: string, excludeId?: string): void {
    const normalized = name.trim().toLowerCase();
    for (const venue of venues.values()) {
        if (venue.id !== excludeId && venue.name.trim().toLowerCase() === normalized) {
            throw new HttpError(409, `A venue named "${name}" already exists`);
        }
    }
}

export function createVenue(input: CreateVenueInput): Venue {
    assertUniqueVenueName(input.name);

    const now = new Date().toISOString();
    const venue: Venue = {
        id: randomUUID(),
        ...input,
        createdAt: now,
        updatedAt: now,
    };
    venues.set(venue.id, venue);
    return venue;
}

export function listVenues(page: number, limit: number): PaginatedResult<Venue> {
    return paginate([...venues.values()], page, limit);
}

export function getVenueById(id: string): Venue {
    return findVenueOrFail(id);
}

export function updateVenue(id: string, input: UpdateVenueInput): Venue {
    const existing = findVenueOrFail(id);

    if (input.name !== undefined && input.name !== existing.name) {
        assertUniqueVenueName(input.name, id);
    }

    const updated: Venue = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
    };
    venues.set(id, updated);
    return updated;
}

export function deleteVenue(id: string): void {
    findVenueOrFail(id);
    venues.delete(id);
}
