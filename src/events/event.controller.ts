import type { Request, Response } from "express";
import * as eventService from "./event.service.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";
import { getRouteParam } from "../utils/http.ts";

/** POST /v1/events */
export function create(req: Request, res: Response): void {
    const event = eventService.createEvent(req.body as CreateEventInput);
    res.status(201).json(event);
}

/** GET /v1/events */
export function list(_req: Request, res: Response): void {
    const query = res.locals.query as ListEventsQuery;
    const paginated = eventService.listEvents(query);
    res.json(paginated);
}

/** GET /v1/events/:id */
export function getById(req: Request, res: Response): void {
    const event = eventService.getEventById(getRouteParam(req));
    res.json(event);
}

/** PATCH /v1/events/:id */
export function update(req: Request, res: Response): void {
    const event = eventService.updateEvent(getRouteParam(req), req.body as UpdateEventInput);
    res.json(event);
}

/** DELETE /v1/events/:id */
export function remove(req: Request, res: Response): void {
    eventService.deleteEvent(getRouteParam(req));
    res.status(204).end();
}
