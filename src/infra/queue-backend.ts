import { Redis } from "ioredis";
import { config } from "../config.ts";

/**
 * Dedicated Redis connection for BullMQ Queues and Workers.
 * Critical: BullMQ Workers require `maxRetriesPerRequest: null` to enable indefinite retry behavior
 * during reconnections, and must NEVER share the cache/rate-limiter client.
 */
export function createQueueConnection(): Redis {
    return new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: false,
    });
}

/**
 * Shared connection options object or connection instance for BullMQ queues.
 */
export const queueConnectionOptions = {
    url: config.redisUrl,
    maxRetriesPerRequest: null,
};
