import { HttpError } from "../errors/HttpError.ts";
import type { Venue, PaginatedResult } from "../domain.ts";
import type { CreateVenueInput, UpdateVenueInput } from "./venue.schema.ts";
import * as venueRepo from "./venue.repository.ts";

/**
 * Venue service — orchestration & domain rules only.
 * Persistence lives in venue.repository.ts; this layer never touches Prisma.
 */

/** Case-insensitive venue name uniqueness check */
async function assertUniqueVenueName(name: string, excludeId?: string): Promise<void> {
    const existing = await venueRepo.findVenueByName(name, excludeId);
    if (existing) {
        throw new HttpError(409, `A venue named "${name}" already exists`);
    }
}

export async function createVenue(input: CreateVenueInput): Promise<Venue> {
    await assertUniqueVenueName(input.name);
    return venueRepo.createVenue(input);
}

export async function listVenues(page: number, limit: number): Promise<PaginatedResult<Venue>> {
    return venueRepo.listVenues(page, limit);
}

export async function getVenueById(id: string): Promise<Venue> {
    const venue = await venueRepo.findVenueById(id);
    if (!venue) {
        throw new HttpError(404, "Venue not found");
    }
    return venue;
}

export async function updateVenue(id: string, input: UpdateVenueInput): Promise<Venue> {
    const existing = await venueRepo.findVenueById(id);
    if (!existing) {
        throw new HttpError(404, "Venue not found");
    }

    if (input.name !== undefined && input.name.trim().toLowerCase() !== existing.name.trim().toLowerCase()) {
        await assertUniqueVenueName(input.name, id);
    }

    const updated = await venueRepo.updateVenue(id, input);
    if (!updated) {
        throw new HttpError(404, "Venue not found");
    }
    return updated;
}

export async function deleteVenue(id: string): Promise<void> {
    const deleted = await venueRepo.deleteVenue(id);
    if (!deleted) {
        throw new HttpError(404, "Venue not found");
    }
}
