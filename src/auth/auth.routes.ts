import { Router } from "express";
import { validate } from "../middleware/validate.ts";
import { rateLimiter } from "../middleware/rateLimiter.ts";
import { signupSchema, loginSchema } from "./auth.schema.ts";
import {
    signupHandler,
    loginHandler,
    refreshHandler,
    logoutHandler,
} from "./auth.controller.ts";

export const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), signupHandler);
authRouter.post(
    "/login",
    rateLimiter({
        windowSeconds: 60,
        maxRequests: 5,
        prefix: "/v1/auth/login",
    }),
    validate(loginSchema),
    loginHandler,
);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
