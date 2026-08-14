import { Router } from "express";
import { validate, validateQuery } from "../middleware/validate.ts";
import { createEventSchema, updateEventSchema, listEventsQuerySchema } from "./event.schema.ts";
import * as eventController from "./event.controller.ts";

export const eventRouter = Router();

eventRouter.post("/", validate(createEventSchema), eventController.create);
eventRouter.get("/", validateQuery(listEventsQuerySchema), eventController.list);
eventRouter.get("/:id", eventController.getById);
eventRouter.patch("/:id", validate(updateEventSchema), eventController.update);
eventRouter.delete("/:id", eventController.remove);
