// Minimal stub for the Session 1 live-code blocks.
//
// Session 1 homework, task 1: replace this with the full domain model -
// `User`, `Event`, `Booking` interfaces matching the course domain exactly
// (roles ATTENDEE | ORGANIZER | ADMIN and booking statuses
// CONFIRMED | CANCELLED | WAITLISTED as literal-union types, not enums),
// plus the generic `findById`. Acceptance: `npm run typecheck` passes and
// there is no `any` anywhere.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";


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

const server = createServer(async (req, res) => {
    if(req.method === "GET" && req.url === "/health") {
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
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(3000, () => {
    console.log("Server listening on port 3000");
});