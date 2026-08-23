import { createClient } from "redis";
import { config } from "../config.ts";

export type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

/**
 * Returns the singleton node-redis client instance used for cache and rate limiting.
 */
export function getRedisClient(): RedisClient {
    if (!redisClient) {
        redisClient = createClient({
            url: config.redisUrl,
        });

        redisClient.on("error", (err) => {
            console.error("Redis Cache/Limiter Client Error:", err);
        });
    }
    return redisClient;
}

/**
 * Ensures the Redis client is connected.
 */
export async function connectRedis(): Promise<RedisClient> {
    const client = getRedisClient();
    if (!client.isOpen) {
        await client.connect();
    }
    return client;
}

/**
 * Gracefully disconnects the Redis client.
 */
export async function disconnectRedis(): Promise<void> {
    if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        redisClient = null;
    }
}
