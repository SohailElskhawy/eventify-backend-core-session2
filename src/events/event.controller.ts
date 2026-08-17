import type { Request, Response } from "express";
import * as eventService from "./event.service.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";
import { getRouteParam } from "../utils/http.ts";

/** POST /v1/events */
export async function create(req: Request, res: Response): Promise<void> {
    const event = await eventService.createEvent(req.body as CreateEventInput);
    res.status(201).json(event);
}

/** GET /v1/events */
export async function list(_req: Request, res: Response): Promise<void> {
    const query = res.locals.query as ListEventsQuery;
    const paginated = await eventService.listEvents(query);
    res.json(paginated);
}

/** GET /v1/events/:id */
export async function getById(req: Request, res: Response): Promise<void> {
    const event = await eventService.getEventById(getRouteParam(req));
    res.json(event);
}

/** PATCH /v1/events/:id */
export async function update(req: Request, res: Response): Promise<void> {
    const event = await eventService.updateEvent(getRouteParam(req), req.body as UpdateEventInput);
    res.json(event);
}

/** DELETE /v1/events/:id */
export async function remove(req: Request, res: Response): Promise<void> {
    await eventService.deleteEvent(getRouteParam(req));
    res.status(204).end();
}
