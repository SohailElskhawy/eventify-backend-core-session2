// Minimal stub for the Session 1 live-code blocks.
//
// Session 1 homework, task 1: replace this with the full domain model -
// `User`, `Event`, `Booking` interfaces matching the course domain exactly
// (roles ATTENDEE | ORGANIZER | ADMIN and booking statuses
// CONFIRMED | CANCELLED | WAITLISTED as literal-union types, not enums),
// plus the generic `findById`. Acceptance: `npm run typecheck` passes and
// there is no `any` anywhere.

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";


type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";
type BookingStatus = "CONFIRMED" | "CANCELLED" | "WAITLISTED";

interface Event {
    id: string;            // "evt-1" tonight; UUIDv7 from Session 3
    title: string;
    description: string;
    venue: string | null;  // null = venue not announced yet
    startsAt: string;      // ISO date
    capacity: number;
    priceCents: number;    // 0 = free
    organizerId: string;   // User.id
    createdAt: string;
}

interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    createdAt: string;
}

interface Booking {
    id: string;
    userId: string;
    eventId: string;
    status: BookingStatus;
    createdAt: string;
}



// Explanation: The `findById` function is a generic utility that searches for an item in an array 
// based on its `id` property. 
// It takes two parameters: an array of objects (where each object must have an `id` property of type string) and 
// the `id` to search for. 
// The function returns the first matching object if found, or `undefined` if no match is found. 
// This is useful for quickly retrieving 
// specific items from collections of users, events, r bookings in the application.
function findById<T extends { id: string }>(array: T[], id: string): T | undefined {
    return array.find((item) => item.id === id);
}

function parseNewEvent(input: unknown): Event {
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

const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "OK", uptime: process.uptime() }));
        return;
    }

    if (req.method === "GET" && req.url === "/events") {
        try {
            const eventsData = await readFile("src/data/events.json", "utf-8");
            const events: Event[] = JSON.parse(eventsData);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "OK", events }));
            return;
        } catch (error) {
            console.error("Error reading events file:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
            return;
        }
    }

    if (req.method === "GET" && req.url?.startsWith("/events/")) {
        try {
            const eventsData = await readFile("src/data/events.json", "utf-8");
            const events: Event[] = JSON.parse(eventsData);
            const eventId = req.url.split("/")[2];
            const event = eventId && findById(events, eventId);
            if (event) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "OK", event }));
                return;
            }
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Event not found" }));
            return;
        } catch (error) {
            console.error("Error reading events file:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
            return;
        }
    }

    if (req.method === "POST" && req.url === "/events") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            let newEvent: Event;
            try {
                const payload: unknown = JSON.parse(body);
                newEvent = parseNewEvent(payload);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Invalid request body";
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: message }));
                return;
            }

            try {
                const eventsData = await readFile("src/data/events.json", "utf-8");
                const events: Event[] = JSON.parse(eventsData);
                await writeFile("src/data/events.json", JSON.stringify([...events, newEvent], null, 2));
            } catch (error) {
                console.error("Error persisting event:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
                return;
            }

            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "Created", event: newEvent }));
        });
        return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(3000, () => {
    console.log("Server listening on port 3000");
});