import { connectRedis } from "./redis.ts";

export interface CacheMetrics {
    hits: number;
    misses: number;
    ratio: number;
    total: number;
}

let hits = 0;
let misses = 0;

/**
 * Calculates and logs cache metrics as structured JSON.
 */
export function logCacheMetrics(): CacheMetrics {
    const total = hits + misses;
    const ratio = total === 0 ? 0 : Number((hits / total).toFixed(4));
    const metrics: CacheMetrics = { hits, misses, ratio, total };
    console.log(JSON.stringify({ type: "cache_metrics", ...metrics }));
    return metrics;
}

export function getCacheMetrics(): CacheMetrics {
    const total = hits + misses;
    const ratio = total === 0 ? 0 : Number((hits / total).toFixed(4));
    return { hits, misses, ratio, total };
}

export function recordHit(): void {
    hits++;
    if ((hits + misses) % 100 === 0) {
        logCacheMetrics();
    }
}

export function recordMiss(): void {
    misses++;
    if ((hits + misses) % 100 === 0) {
        logCacheMetrics();
    }
}

export function resetMetrics(): void {
    hits = 0;
    misses = 0;
}

// Periodic metrics logging every 60 seconds (unref'd so it doesn't hold the event loop open)
if (process.env["NODE_ENV"] !== "test") {
    setInterval(() => {
        if (hits + misses > 0) {
            logCacheMetrics();
        }
    }, 60_000).unref();
}

/**
 * Generates a TTL between 60s and 70s (TTL 60s + random jitter)
 * to prevent synchronized cache stampedes.
 */
export function getTTLWithJitter(baseTtlSeconds = 60, maxJitterSeconds = 10): number {
    return baseTtlSeconds + Math.floor(Math.random() * (maxJitterSeconds + 1));
}

/**
 * Safe JSON cache getter.
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
    try {
        const redis = await connectRedis();
        const raw = await redis.get(key);
        if (raw !== null) {
            recordHit();
            return JSON.parse(raw) as T;
        }
        recordMiss();
        return null;
    } catch (err) {
        console.error(`Cache read failed for key "${key}":`, err);
        recordMiss();
        return null;
    }
}

/**
 * Safe JSON cache setter with TTL.
 */
export async function setInCache<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
        const redis = await connectRedis();
        const ttl = ttlSeconds ?? getTTLWithJitter();
        await redis.set(key, JSON.stringify(value), { EX: ttl });
    } catch (err) {
        console.error(`Cache write failed for key "${key}":`, err);
    }
}

/**
 * Safe key deletion from cache.
 */
export async function deleteFromCache(key: string): Promise<void> {
    try {
        const redis = await connectRedis();
        await redis.del(key);
    } catch (err) {
        console.error(`Cache delete failed for key "${key}":`, err);
    }
}

/**
 * Increments the version counter for list cache invalidation.
 */
export async function incrementVersionCounter(counterKey: string): Promise<number> {
    try {
        const redis = await connectRedis();
        return await redis.incr(counterKey);
    } catch (err) {
        console.error(`Version counter increment failed for "${counterKey}":`, err);
        return Date.now();
    }
}

/**
 * Gets the current version counter for list cache key generation.
 */
export async function getVersionCounter(counterKey: string): Promise<string> {
    try {
        const redis = await connectRedis();
        const v = await redis.get(counterKey);
        if (v === null) {
            await redis.set(counterKey, "1");
            return "1";
        }
        return v;
    } catch {
        return "1";
    }
}
