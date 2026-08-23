import { HttpError } from "../errors/HttpError.ts";
import type { Event, PaginatedResult } from "../domain.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";
import * as eventRepo from "./event.repository.ts";
import type { JwtPayload } from "../auth/jwt.ts";
import {
    getFromCache,
    setInCache,
    deleteFromCache,
    incrementVersionCounter,
    getVersionCounter,
} from "../infra/cache.ts";

/**
 * Event service — orchestration & domain rules with Redis cache-aside.
 * Persistence lives in event.repository.ts.
 */

/** Asserts that an event's startsAt date is in the future */
function assertFutureDate(startsAt: string): void {
    if (new Date(startsAt).getTime() <= Date.now()) {
        throw new HttpError(400, "startsAt must be in the future");
    }
}

export async function createEvent(input: CreateEventInput, currentUser: JwtPayload): Promise<Event> {
    assertFutureDate(input.startsAt);
    const organizerId = currentUser.role === "ADMIN" && input.organizerId ? input.organizerId : currentUser.sub;
    const created = await eventRepo.createEvent({
        ...input,
        organizerId,
    });

    // Invalidate list cache by bumping the version counter
    await incrementVersionCounter("events:list:v");

    return created;
}

export async function listEvents(query: ListEventsQuery): Promise<PaginatedResult<Event>> {
    const version = await getVersionCounter("events:list:v");
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const venue = query.venue ?? "";
    const from = query.from ?? "";
    const to = query.to ?? "";
    const cacheKey = `events:list:${version}:${page}:${limit}:${venue}:${from}:${to}`;

    const cached = await getFromCache<PaginatedResult<Event>>(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await eventRepo.listEvents(query);
    await setInCache(cacheKey, result);
    return result;
}

export async function getEventById(id: string): Promise<Event> {
    const cacheKey = `event:${id}`;
    const cached = await getFromCache<Event>(cacheKey);
    if (cached) {
        return cached;
    }

    const event = await eventRepo.findEventById(id);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    await setInCache(cacheKey, event);
    return event;
}

export async function updateEvent(
    id: string,
    input: UpdateEventInput,
    currentUser: JwtPayload,
): Promise<Event> {
    if (input.startsAt !== undefined) {
        assertFutureDate(input.startsAt);
    }
    const existing = await eventRepo.findEventById(id);
    if (!existing) {
        throw new HttpError(404, "Event not found");
    }

    if (currentUser.role !== "ADMIN" && existing.organizerId !== currentUser.sub) {
        throw new HttpError(403, "Forbidden: You do not own this event");
    }

    const updated = await eventRepo.updateEvent(id, input);
    if (!updated) {
        throw new HttpError(404, "Event not found");
    }

    // Delete-on-write invalidation: delete single event cache & bump list version
    await Promise.all([
        deleteFromCache(`event:${id}`),
        incrementVersionCounter("events:list:v"),
    ]);

    return updated;
}

export async function deleteEvent(id: string, currentUser: JwtPayload): Promise<void> {
    const existing = await eventRepo.findEventById(id);
    if (!existing) {
        throw new HttpError(404, "Event not found");
    }

    if (currentUser.role !== "ADMIN" && existing.organizerId !== currentUser.sub) {
        throw new HttpError(403, "Forbidden: You do not own this event");
    }

    const deleted = await eventRepo.deleteEvent(id);
    if (!deleted) {
        throw new HttpError(404, "Event not found");
    }

    // Delete-on-write invalidation: delete single event cache & bump list version
    await Promise.all([
        deleteFromCache(`event:${id}`),
        incrementVersionCounter("events:list:v"),
    ]);
}
