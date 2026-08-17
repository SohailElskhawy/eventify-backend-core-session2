import { HttpError } from "../errors/HttpError.ts";
import type { Event, PaginatedResult } from "../domain.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";
import * as eventRepo from "./event.repository.ts";

/**
 * Event service — orchestration & domain rules only.
 * Persistence lives in event.repository.ts; this layer never touches Prisma
 * directly, so swapping storage (or faking it in tests) is a one-file change.
 */

/** Asserts that an event's startsAt date is in the future */
function assertFutureDate(startsAt: string): void {
    if (new Date(startsAt).getTime() <= Date.now()) {
        throw new HttpError(400, "startsAt must be in the future");
    }
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
    assertFutureDate(input.startsAt);
    return eventRepo.createEvent(input);
}

export async function listEvents(query: ListEventsQuery): Promise<PaginatedResult<Event>> {
    return eventRepo.listEvents(query);
}

export async function getEventById(id: string): Promise<Event> {
    const event = await eventRepo.findEventById(id);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }
    return event;
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<Event> {
    if (input.startsAt !== undefined) {
        assertFutureDate(input.startsAt);
    }
    const updated = await eventRepo.updateEvent(id, input);
    if (!updated) {
        throw new HttpError(404, "Event not found");
    }
    return updated;
}

export async function deleteEvent(id: string): Promise<void> {
    const deleted = await eventRepo.deleteEvent(id);
    if (!deleted) {
        throw new HttpError(404, "Event not found");
    }
}
