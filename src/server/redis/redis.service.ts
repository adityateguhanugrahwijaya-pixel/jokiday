import Redis from "ioredis";

interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Service Redis terintegrasi dengan fallback memori internal (in-memory fallback)
 * Menjamin kestabilan aplikasi baik saat Redis lokal aktif, dalam docker, maupun saat berjalan di serverless Vercel.
 */
export class RedisService {
  private static client: Redis | null = null;
  private static isConnected = false;
  private static hasWarned = false;
  private static memoryCache = new Map<string, MemoryCacheEntry>();
  private static memoryRateLimit = new Map<string, { count: number; resetAt: number }>();

  /**
   * Mengambil instance Redis Client secara singleton
   */
  private static getClient(): Redis | null {
    if (this.client) return this.client;

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy(times) {
          if (times > 3) return null; // Berhenti retry jika offline
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        console.log("[RedisService] Terhubung ke Redis server:", redisUrl.replace(/\/\/[^@]*@/, "//***@"));
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        if (!this.hasWarned) {
          console.warn("[RedisService] Redis offline atau tidak dapat dijangkau. Menggunakan fallback cache memori internal.", err.message);
          this.hasWarned = true;
        }
      });

      return this.client;
    } catch (err: any) {
      if (!this.hasWarned) {
        console.warn("[RedisService] Gagal inisialisasi Redis client:", err?.message);
        this.hasWarned = true;
      }
      return null;
    }
  }

  /**
   * Cek koneksi ke server Redis
   */
  static async ping(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      if (!this.isConnected) {
        await client.connect();
      }
      const res = await client.ping();
      return res === "PONG";
    } catch {
      return false;
    }
  }

  /**
   * Mengambil nilai berdasarkan key dari cache
   */
  static async get(key: string): Promise<string | null> {
    const client = this.getClient();
    if (client && this.isConnected) {
      try {
        return await client.get(key);
      } catch {
        // Fallback ke memori jika query error
      }
    }

    // In-memory fallback
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Menyimpan nilai ke cache dengan opsi TTL (detik)
   */
  static async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.getClient();
    if (client && this.isConnected) {
      try {
        if (ttlSeconds) {
          await client.set(key, value, "EX", ttlSeconds);
        } else {
          await client.set(key, value);
        }
        return;
      } catch {
        // Fallback ke memori jika error
      }
    }

    // In-memory fallback
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value, expiresAt });
  }

  /**
   * Menghapus key dari cache
   */
  static async del(key: string): Promise<void> {
    const client = this.getClient();
    if (client && this.isConnected) {
      try {
        await client.del(key);
        return;
      } catch {
        // Fallback ke memori
      }
    }

    this.memoryCache.delete(key);
  }

  /**
   * Algoritma Sliding-Window / Fixed-Window Rate Limiter
   * Digunakan untuk proteksi endpoint login, register, dan pembayaran
   */
  static async rateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    const client = this.getClient();

    if (client && this.isConnected) {
      try {
        const count = await client.incr(key);
        if (count === 1) {
          await client.expire(key, windowSeconds);
        }
        const ttl = await client.ttl(key);
        const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          resetAt,
        };
      } catch {
        // Fallback ke memori jika Redis bermasalah
      }
    }

    // In-memory fallback rate limiter
    const now = Date.now();
    const current = this.memoryRateLimit.get(key);

    if (!current || now > current.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      this.memoryRateLimit.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    current.count += 1;
    return {
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      resetAt: current.resetAt,
    };
  }
}
