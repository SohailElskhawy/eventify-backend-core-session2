import type { Request, Response } from "express";
import * as eventService from "./event.service.ts";
import type { CreateEventInput, UpdateEventInput, ListEventsQuery } from "./event.schema.ts";
import { getRouteParam, getValidatedQuery, getAuthenticatedUser } from "../utils/http.ts";

/** POST /v1/events */
export async function create(req: Request<unknown, unknown, CreateEventInput>, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const event = await eventService.createEvent(req.body, user);
    res.status(201).json(event);
}

/** GET /v1/events */
export async function list(_req: Request, res: Response): Promise<void> {
    const query = getValidatedQuery<ListEventsQuery>(res);
    const paginated = await eventService.listEvents(query);
    res.json(paginated);
}

/** GET /v1/events/:id */
export async function getById(req: Request<{ id: string }>, res: Response): Promise<void> {
    const event = await eventService.getEventById(getRouteParam(req));
    res.json(event);
}

/** PATCH /v1/events/:id */
export async function update(
    req: Request<{ id: string }, unknown, UpdateEventInput>,
    res: Response,
): Promise<void> {
    const user = getAuthenticatedUser(req);
    const event = await eventService.updateEvent(getRouteParam(req), req.body, user);
    res.json(event);
}

/** DELETE /v1/events/:id */
export async function remove(req: Request<{ id: string }>, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    await eventService.deleteEvent(getRouteParam(req), user);
    res.status(204).end();
}
