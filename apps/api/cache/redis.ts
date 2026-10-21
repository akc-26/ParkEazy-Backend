/**
 * Redis connection manager & health prober
 * Manages Redis client lifecycle, lazy connection, connectivity diagnostics,
 * and safe disposal on graceful shutdown.
 */

import { appConfig, sanitizeRedisUrl } from '../config/env';

export class RedisManager {
  private static instance: RedisManager;
  private client: any = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public async initialize(): Promise<void> {
    if (!appConfig.redis.isConfigured || !appConfig.redis.url) {
      return;
    }
    try {
      const RedisModule = await import('ioredis' as any).catch(() => null);
      if (RedisModule) {
        const RedisConstructor = RedisModule.default || RedisModule;
        this.client = new RedisConstructor(appConfig.redis.url, {
          lazyConnect: true,
          connectTimeout: appConfig.redis.connectTimeoutMs,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
          enableOfflineQueue: false,
        });
        await this.client.connect();
        this.isConnected = true;
      }
    } catch (err: any) {
      this.isConnected = false;
      const safe = sanitizeRedisUrl(err.message);
      console.warn('[ParkEazy-Redis] Redis unavailable:', safe);
    }
  }

  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore
      }
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const redisManager = RedisManager.getInstance();
