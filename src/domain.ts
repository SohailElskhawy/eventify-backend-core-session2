// Minimal stub for the Session 1 live-code blocks.
//
// Session 1 homework, task 1: replace this with the full domain model -
// `User`, `Event`, `Booking` interfaces matching the course domain exactly
// (roles ATTENDEE | ORGANIZER | ADMIN and booking statuses
// CONFIRMED | CANCELLED | WAITLISTED as literal-union types, not enums),
// plus the generic `findById`. Acceptance: `npm run typecheck` passes and
// there is no `any` anywhere.

import { createServer } from "node:http";


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

const events: Event[] = [
    { "id": "evt-1", "title": "JS 101", "description": "JavaScript from zero ceremony", "venue": "Room 4", "startsAt": "2026-09-14T18:00:00Z", "capacity": 30, "priceCents": 0, "organizerId": "usr-1", "createdAt": "2026-08-01T09:00:00Z" },
    { "id": "evt-2", "title": "TS at Work", "description": "Types that earn their keep", "venue": null, "startsAt": "2026-09-21T18:00:00Z", "capacity": 80, "priceCents": 1500, "organizerId": "usr-1", "createdAt": "2026-08-01T09:05:00Z" },
    { "id": "evt-3", "title": "Node Deep Dive", "description": "The event loop, for real", "venue": "Main Hall", "startsAt": "2026-10-02T18:00:00Z", "capacity": 25, "priceCents": 2500, "organizerId": "usr-2", "createdAt": "2026-08-02T10:00:00Z" },
    { "id": "evt-4", "title": "API Design Live", "description": "Endpoints designed in the open", "venue": "Main Hall", "startsAt": "2026-11-20T18:00:00Z", "capacity": 125, "priceCents": 0, "organizerId": "usr-2", "createdAt": "2026-08-03T11:00:00Z" }
]

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

const server = createServer((req, res) => {
    if(req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "OK", uptime: process.uptime() }));
        return;
    }

    if (req.method === "GET" && req.url === "/events") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "OK", events }));
        return;
    }

    if (req.method === "GET" && req.url?.startsWith("/events/")) {
        const eventId = req.url.split("/")[2];
        const event = eventId && findById(events, eventId);
        if (event) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "OK", event }));
            return;
        }
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(3000, () => {
    console.log("Server listening on port 3000");
});