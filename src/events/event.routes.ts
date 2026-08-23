import { Router } from "express";
import { validate, validateQuery, validateParams } from "../middleware/validate.ts";
import { idParamSchema } from "../schemas/params.schema.ts";
import { createEventSchema, updateEventSchema, listEventsQuerySchema } from "./event.schema.ts";
import * as eventController from "./event.controller.ts";
import { requireAuth, requireRole } from "../auth/auth.middleware.ts";

export const eventRouter = Router();

// Public routes
eventRouter.get("/", validateQuery(listEventsQuerySchema), eventController.list);
eventRouter.get("/:id", validateParams(idParamSchema), eventController.getById);

// Protected routes (require auth + role)
eventRouter.post(
    "/",
    requireAuth,
    requireRole("ORGANIZER", "ADMIN"),
    validate(createEventSchema),
    eventController.create,
);

eventRouter.patch(
    "/:id",
    requireAuth,
    requireRole("ORGANIZER", "ADMIN"),
    validateParams(idParamSchema),
    validate(updateEventSchema),
    eventController.update,
);

eventRouter.delete(
    "/:id",
    requireAuth,
    requireRole("ORGANIZER", "ADMIN"),
    validateParams(idParamSchema),
    eventController.remove,
);
