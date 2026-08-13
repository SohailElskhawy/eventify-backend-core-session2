import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { Event } from "./types.ts"; 
import { findById, parseNewEvent } from "./utils.ts";



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