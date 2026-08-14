import type { Request, Response } from "express";
import * as eventService from "./event.service.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";

/** POST /v1/events */
export function create(req: Request, res: Response): void {
    const event = eventService.createEvent(req.body as CreateEventInput);
    res.status(201).json(event);
}

/** GET /v1/events */
export function list(_req: Request, res: Response): void {
    const { limit, offset } = res.locals.query as ListEventsQuery;
    const { data, total } = eventService.listEvents(limit, offset);
    res.json({ data, total, limit, offset });
}

/** GET /v1/events/:id */
export function getById(req: Request, res: Response): void {
    const event = eventService.getEventById(req.params.id as string);
    res.json(event);
}

/** PATCH /v1/events/:id */
export function update(req: Request, res: Response): void {
    const event = eventService.updateEvent(
        req.params.id as string,
        req.body as UpdateEventInput,
    );
    res.json(event);
}

/** DELETE /v1/events/:id */
export function remove(req: Request, res: Response): void {
    eventService.deleteEvent(req.params.id as string);
    res.status(204).end();
}
