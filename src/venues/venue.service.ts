import { randomUUID } from "node:crypto";
import { HttpError } from "../errors/HttpError.ts";
import type { CreateVenueInput, UpdateVenueInput } from "./venue.schema.ts";

export interface Venue {
    id: string;
    name: string;
    address: string;
    capacity: number;
    contactEmail: string;
    createdAt: string;
}

/** In-memory store — keyed by id for O(1) lookups. */
const venues = new Map<string, Venue>();

export function createVenue(input: CreateVenueInput): Venue {
    // Unique-name constraint
    for (const v of venues.values()) {
        if (v.name === input.name) {
            throw new HttpError(409, `A venue named "${input.name}" already exists`);
        }
    }

    const venue: Venue = {
        id: randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
    };
    venues.set(venue.id, venue);
    return venue;
}

export function listVenues(limit?: number): Venue[] {
    const all = [...venues.values()];
    return limit !== undefined ? all.slice(0, limit) : all;
}

export function getVenueById(id: string): Venue {
    const venue = venues.get(id);
    if (!venue) {
        throw new HttpError(404, "Venue not found");
    }
    return venue;
}

export function updateVenue(id: string, input: UpdateVenueInput): Venue {
    const venue = venues.get(id);
    if (!venue) {
        throw new HttpError(404, "Venue not found");
    }

    // If name is changing, enforce uniqueness
    if (input.name !== undefined && input.name !== venue.name) {
        for (const v of venues.values()) {
            if (v.name === input.name) {
                throw new HttpError(409, `A venue named "${input.name}" already exists`);
            }
        }
    }

    const updated: Venue = { ...venue, ...input };
    venues.set(id, updated);
    return updated;
}

export function deleteVenue(id: string): void {
    if (!venues.has(id)) {
        throw new HttpError(404, "Venue not found");
    }
    venues.delete(id);
}
