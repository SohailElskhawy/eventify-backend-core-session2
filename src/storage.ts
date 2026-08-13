import { readFile, writeFile } from "node:fs/promises";
import type { Event } from "./types.ts";

const EVENTS_FILE = "src/data/events.json";

export async function readEvents(): Promise<Event[]> {
    const data = await readFile(EVENTS_FILE, "utf-8");
    return JSON.parse(data) as Event[];
}

export async function appendEvent(newEvent: Event): Promise<void> {
    const events = await readEvents();
    await writeFile(EVENTS_FILE, JSON.stringify([...events, newEvent], null, 2));
}
