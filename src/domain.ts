import { createServer } from "node:http";
import type { Event } from "./types.ts";
import { findById, parseNewEvent } from "./utils.ts";
import { appendEvent, readEvents } from "./storage.ts";
import { sendJson } from "./http.ts";

const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        sendJson(res, 200, { status: "OK", uptime: process.uptime() });
        return;
    }

    if (req.method === "GET" && req.url === "/events") {
        try {
            const events = await readEvents();
            sendJson(res, 200, { status: "OK", events });
        } catch (error) {
            console.error("Error reading events file:", error);
            sendJson(res, 500, { error: "Internal Server Error" });
        }
        return;
    }

    if (req.method === "GET" && req.url?.startsWith("/events/")) {
        try {
            const events = await readEvents();
            const eventId = req.url.split("/")[2];
            const event = eventId && findById(events, eventId);
            if (event) {
                sendJson(res, 200, { status: "OK", event });
                return;
            }
            sendJson(res, 404, { error: "Event not found" });
        } catch (error) {
            console.error("Error reading events file:", error);
            sendJson(res, 500, { error: "Internal Server Error" });
        }
        return;
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
                sendJson(res, 400, { error: message });
                return;
            }

            try {
                await appendEvent(newEvent);
            } catch (error) {
                console.error("Error persisting event:", error);
                sendJson(res, 500, { error: "Internal Server Error" });
                return;
            }

            sendJson(res, 201, { status: "Created", event: newEvent });
        });
        return;
    }
    sendJson(res, 404, { error: "Not Found" });
});

server.listen(3000, () => {
    console.log("Server listening on port 3000");
});
