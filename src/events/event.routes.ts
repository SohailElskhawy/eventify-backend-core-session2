import { Router } from "express";
import { validate, validateQuery, validateParams } from "../middleware/validate.ts";
import { idParamSchema } from "../schemas/params.schema.ts";
import { createEventSchema, updateEventSchema, listEventsQuerySchema } from "./event.schema.ts";
import * as eventController from "./event.controller.ts";

export const eventRouter = Router();

eventRouter.post("/", validate(createEventSchema), eventController.create);
eventRouter.get("/", validateQuery(listEventsQuerySchema), eventController.list);
eventRouter.get("/:id", validateParams(idParamSchema), eventController.getById);
eventRouter.patch("/:id", validateParams(idParamSchema), validate(updateEventSchema), eventController.update);
eventRouter.delete("/:id", validateParams(idParamSchema), eventController.remove);
