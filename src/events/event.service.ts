import { randomUUID } from "node:crypto";
import { HttpError } from "../errors/HttpError.ts";
import type { CreateEventInput, UpdateEventInput } from "./event.schema.ts";

export interface Event {
    id: string;
    title: string;
    description: string;
    venue: string | null;
    startsAt: string;
    capacity: number;
    priceCents: number;
    organizerId: string;
    createdAt: string;
}

/** In-memory store — keyed by id for O(1) lookups. */
const events = new Map<string, Event>();

export function createEvent(input: CreateEventInput): Event {
    const event: Event = {
        id: randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
    };
    events.set(event.id, event);
    return event;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
}

export function listEvents(limit: number, offset: number): PaginatedResult<Event> {
    const all = [...events.values()];
    return { data: all.slice(offset, offset + limit), total: all.length };
}

export function getEventById(id: string): Event {
    const event = events.get(id);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }
    return event;
}

export function updateEvent(id: string, input: UpdateEventInput): Event {
    const event = events.get(id);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    const updated: Event = { ...event, ...input };
    events.set(id, updated);
    return updated;
}

export function deleteEvent(id: string): void {
    if (!events.has(id)) {
        throw new HttpError(404, "Event not found");
    }
    events.delete(id);
}
