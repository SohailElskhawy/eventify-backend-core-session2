import type { Request, Response } from "express";
import * as venueService from "./venue.service.ts";
import type { CreateVenueInput, UpdateVenueInput, ListVenuesQuery } from "./venue.schema.ts";

/** POST /v1/venues */
export function create(req: Request, res: Response): void {
    const venue = venueService.createVenue(req.body as CreateVenueInput);
    res.status(201).json(venue);
}

/** GET /v1/venues */
export function list(_req: Request, res: Response): void {
    const { limit } = res.locals.query as ListVenuesQuery;
    const venues = venueService.listVenues(limit);
    res.json(venues);
}

/** GET /v1/venues/:id */
export function getById(req: Request, res: Response): void {
    const venue = venueService.getVenueById(req.params.id as string);
    res.json(venue);
}

/** PATCH /v1/venues/:id */
export function update(req: Request, res: Response): void {
    const venue = venueService.updateVenue(
        req.params.id as string,
        req.body as UpdateVenueInput,
    );
    res.json(venue);
}

/** DELETE /v1/venues/:id */
export function remove(req: Request, res: Response): void {
    venueService.deleteVenue(req.params.id as string);
    res.status(204).end();
}
