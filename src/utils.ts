// Explanation: The `findById` function is a generic utility that searches for an item in an array 
// based on its `id` property. 
// It takes two parameters: an array of objects (where each object must have an `id` property of type string) and 
// the `id` to search for. 
// The function returns the first matching object if found, or `undefined` if no match is found. 
// This is useful for quickly retrieving 

import { Event } from "./types.ts";

// specific items from collections of users, events, r bookings in the application.
export function findById<T extends { id: string }>(array: T[], id: string): T | undefined {
    return array.find((item) => item.id === id);
}

export function parseNewEvent(input: unknown): Event {
    if (typeof input !== "object" || input === null) {
        throw new Error("body must be a JSON object");
    }
    const e = input as Record<string, unknown>;
    const { title, description, venue, startsAt, capacity, priceCents, organizerId } = e;

    if (typeof title !== "string" || title.length === 0) {
        throw new Error("title must be a non-empty string");
    }
    if (typeof description !== "string") {
        throw new Error("description must be a string");
    }
    if (venue !== null && typeof venue !== "string") {
        throw new Error("venue must be a string or null");
    }
    if (typeof startsAt !== "string" || Number.isNaN(Date.parse(startsAt))) {
        throw new Error("startsAt must be an ISO date string");
    }
    if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity <= 0) {
        throw new Error("capacity must be a positive integer");
    }
    if (typeof priceCents !== "number" || !Number.isInteger(priceCents) || priceCents < 0) {
        throw new Error("priceCents must be a non-negative integer");
    }
    if (typeof organizerId !== "string" || organizerId.length === 0) {
        throw new Error("organizerId must be a non-empty string");
    }

    return {
        id: `evt-${Date.now()}`,
        title,
        description,
        venue,
        startsAt,
        capacity,
        priceCents,
        organizerId,
        createdAt: new Date().toISOString(),
    };
}