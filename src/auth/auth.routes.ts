import { Router } from "express";
import { validate } from "../middleware/validate.ts";
import { signupSchema, loginSchema } from "./auth.schema.ts";
import {
    signupHandler,
    loginHandler,
    refreshHandler,
    logoutHandler,
} from "./auth.controller.ts";

export const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), signupHandler);
authRouter.post("/login", validate(loginSchema), loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
