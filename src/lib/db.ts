import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema";

// ─── PostgreSQL Connection ───────────────────────────────
const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// ─── In-Memory Cache (fallback when Azure Redis unavailable) ──
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

const redisUrl = process.env.AZURE_REDIS_URL;
const redisEnabled = redisUrl && !redisUrl.includes("your-cache");

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    // Try Azure Redis first
    if (redisEnabled && redisUrl) {
      try {
        const Redis = (await import("ioredis")).default;
        const redis = new Redis(process.env.AZURE_REDIS_URL, {
          password: process.env.AZURE_REDIS_KEY,
          tls: { rejectUnauthorized: false },
        });
        const val = await redis.get(key);
        await redis.quit();
        return val ? JSON.parse(val) : null;
      } catch {
        // Fall through to memory cache
      }
    }

    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  },

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (redisEnabled && redisUrl) {
      try {
        const Redis = (await import("ioredis")).default;
        const redis = new Redis(redisUrl, {
          password: process.env.AZURE_REDIS_KEY,
          tls: { rejectUnauthorized: false },
        });
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
        await redis.quit();
        return;
      } catch {
        // Fall through to memory cache
      }
    }

    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  async del(key: string): Promise<void> {
    memoryCache.delete(key);
  },
};

export type Database = typeof db;
