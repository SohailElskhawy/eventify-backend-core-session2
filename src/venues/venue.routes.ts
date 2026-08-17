import { Router } from "express";
import { validate, validateQuery, validateParams } from "../middleware/validate.ts";
import { idParamSchema } from "../schemas/params.schema.ts";
import { createVenueSchema, updateVenueSchema, listVenuesQuerySchema } from "./venue.schema.ts";
import * as venueController from "./venue.controller.ts";

export const venueRouter = Router();

venueRouter.post("/", validate(createVenueSchema), venueController.create);
venueRouter.get("/", validateQuery(listVenuesQuerySchema), venueController.list);
venueRouter.get("/:id", validateParams(idParamSchema), venueController.getById);
venueRouter.patch("/:id", validateParams(idParamSchema), validate(updateVenueSchema), venueController.update);
venueRouter.delete("/:id", validateParams(idParamSchema), venueController.remove);
