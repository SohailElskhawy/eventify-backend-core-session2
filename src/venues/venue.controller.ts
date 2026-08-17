import type { Request, Response } from "express";
import * as venueService from "./venue.service.ts";
import type { CreateVenueInput, UpdateVenueInput, ListVenuesQuery } from "./venue.schema.ts";
import { getRouteParam } from "../utils/http.ts";

/** POST /v1/venues */
export async function create(req: Request, res: Response): Promise<void> {
    const venue = await venueService.createVenue(req.body as CreateVenueInput);
    res.status(201).json(venue);
}

/** GET /v1/venues */
export async function list(_req: Request, res: Response): Promise<void> {
    const { page, limit } = res.locals.query as ListVenuesQuery;
    const paginated = await venueService.listVenues(page, limit);
    res.json(paginated);
}

/** GET /v1/venues/:id */
export async function getById(req: Request, res: Response): Promise<void> {
    const venue = await venueService.getVenueById(getRouteParam(req));
    res.json(venue);
}

/** PATCH /v1/venues/:id */
export async function update(req: Request, res: Response): Promise<void> {
    const venue = await venueService.updateVenue(getRouteParam(req), req.body as UpdateVenueInput);
    res.json(venue);
}

/** DELETE /v1/venues/:id */
export async function remove(req: Request, res: Response): Promise<void> {
    await venueService.deleteVenue(getRouteParam(req));
    res.status(204).end();
}
