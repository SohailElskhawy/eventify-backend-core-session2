/**
 * Application-level HTTP error.
 * Throw from any layer — the centralized error handler catches it
 * and sends the correct status + JSON body.
 */
export class HttpError extends Error {
    readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
    }
}
