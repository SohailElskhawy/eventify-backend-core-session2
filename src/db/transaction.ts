import { prisma } from "./prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { HttpError } from "../errors/HttpError.ts";

export type TxClient = Prisma.TransactionClient;

/**
 * Checks whether an error is a Postgres/Prisma serialization conflict (SQLSTATE 40001 / P2034).
 * Under Serializable isolation, Postgres rejects concurrent read/write overlapping
 * transactions. In Prisma 7 with @prisma/adapter-pg, this is surfaced via DriverAdapterError
 * or PrismaClientKnownRequestError (P2034).
 */
export function isSerializationError(err: unknown): boolean {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
        return true;
    }
    const originalCode = (err as { cause?: { originalCode?: string } })?.cause?.originalCode;
    const kind = (err as { cause?: { kind?: string } })?.cause?.kind;
    const msg = (err as { message?: string })?.message ?? "";
    return (
        originalCode === "40001" ||
        kind === "TransactionWriteConflict" ||
        msg.includes("TransactionWriteConflict") ||
        msg.includes("could not serialize access")
    );
}

/**
 * Executes a callback within a Serializable transaction, retrying on serialization conflicts.
 *
 * @param operation The database transaction callback receiving the transaction client (`tx`).
 * @param maxRetries Maximum number of serialization conflict retries before throwing 503 (default: 10).
 */
export async function runSerializableTransaction<T>(
    operation: (tx: TxClient) => Promise<T>,
    maxRetries: number = 10,
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await prisma.$transaction(
                (tx) => operation(tx),
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (err) {
            if (isSerializationError(err)) {
                lastError = err;
                // Add randomized backoff (10-40ms) to reduce contention on concurrent retry
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.floor(Math.random() * 30) + 10),
                );
                continue;
            }
            throw err;
        }
    }

    void lastError;
    throw new HttpError(
        503,
        "Could not complete operation due to concurrent transaction conflicts — please retry",
    );
}
