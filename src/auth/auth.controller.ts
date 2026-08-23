import type { Request, Response, CookieOptions } from "express";
import { config } from "../config.ts";
import * as authService from "./auth.service.ts";
import type { SignupInput, LoginInput } from "./auth.schema.ts";

const REFRESH_COOKIE_NAME = "refreshToken";

const BASE_REFRESH_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
    path: "/v1/auth/refresh",
};

function getRefreshCookieOptions(): CookieOptions {
    return {
        ...BASE_REFRESH_COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}

function getClearRefreshCookieOptions(): CookieOptions {
    return {
        ...BASE_REFRESH_COOKIE_OPTIONS,
    };
}

export async function signupHandler(req: Request<unknown, unknown, SignupInput>, res: Response): Promise<void> {
    const user = await authService.signup(req.body);
    res.status(201).json({ data: user });
}

export async function loginHandler(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, getRefreshCookieOptions());
    res.status(200).json({
        data: {
            accessToken: result.accessToken,
            user: result.user,
        },
    });
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(rawRefreshToken);
    res.cookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, getRefreshCookieOptions());
    res.status(200).json({
        data: {
            accessToken: result.accessToken,
            user: result.user,
        },
    });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(rawRefreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, getClearRefreshCookieOptions());
    res.status(204).send();
}
