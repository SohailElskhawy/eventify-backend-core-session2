import { randomUUID } from "node:crypto";
import { HttpError } from "../errors/HttpError.ts";
import type { Event, PaginatedResult } from "../domain.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";

/** In-memory store — keyed by id for O(1) lookups. */
const events = new Map<string, Event>();

/** Private DRY helper to find an event or throw 404 */
function findEventOrFail(id: string): Event {
    const event = events.get(id);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }
    return event;
}

/** Asserts that an event's startsAt date is in the future */
function assertFutureDate(startsAt: string): void {
    if (new Date(startsAt).getTime() <= Date.now()) {
        throw new HttpError(400, "startsAt must be in the future");
    }
}

export function createEvent(input: CreateEventInput): Event {
    assertFutureDate(input.startsAt);

    const now = new Date().toISOString();
    const event: Event = {
        id: randomUUID(),
        ...input,
        createdAt: now,
        updatedAt: now,
    };
    events.set(event.id, event);
    return event;
}

export function listEvents(query: ListEventsQuery): PaginatedResult<Event> {
    const { page, limit, venue, from, to } = query;
    let filtered = [...events.values()];

    if (venue !== undefined) {
        filtered = filtered.filter((e) => e.venue === venue);
    }
    if (from !== undefined) {
        const fromTime = new Date(from).getTime();
        filtered = filtered.filter((e) => new Date(e.startsAt).getTime() >= fromTime);
    }
    if (to !== undefined) {
        const toTime = new Date(to).getTime();
        filtered = filtered.filter((e) => new Date(e.startsAt).getTime() <= toTime);
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const data = filtered.slice(offset, offset + limit);

    return {
        data,
        total,
        page,
        limit,
    };
}

export function getEventById(id: string): Event {
    return findEventOrFail(id);
}

export function updateEvent(id: string, input: UpdateEventInput): Event {
    const existing = findEventOrFail(id);

    if (input.startsAt !== undefined) {
        assertFutureDate(input.startsAt);
    }

    const updated: Event = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
    };
    events.set(id, updated);
    return updated;
}

export function deleteEvent(id: string): void {
    findEventOrFail(id);
    events.delete(id);
}
