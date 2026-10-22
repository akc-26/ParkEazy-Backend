/**
 * Redis connection manager & health prober
 * Manages Redis client lifecycle, lazy connection, connectivity diagnostics,
 * and safe disposal on graceful shutdown.
 */

import Redis, { Redis as RedisClient } from 'ioredis';
import { appConfig, sanitizeRedisUrl } from '../config/env';
import { ReadinessDependencyStatus } from '../../../packages/contracts';

export class RedisManager {
  private static instance: RedisManager;
  private client: RedisClient | null = null;
  private isConnected = false;

  private constructor() {
    if (appConfig.redis.isConfigured && appConfig.redis.url) {
      this.initClient();
    }
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private initClient(): void {
    if (this.client || !appConfig.redis.url) return;

    try {
      this.client = new Redis(appConfig.redis.url, {
        lazyConnect: true,
        connectTimeout: appConfig.redis.connectTimeoutMs,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableOfflineQueue: false,
      });

      this.client.on('error', (err) => {
        const safeMessage = sanitizeRedisUrl(err.message);
        console.error('[ParkEazy-Redis] Client error:', safeMessage);
      });
    } catch (err: any) {
      const safeMessage = sanitizeRedisUrl(err.message);
      console.error('[ParkEazy-Redis] Failed to initialize Redis client:', safeMessage);
      this.client = null;
    }
  }

  /**
   * Probes initial connectivity without blocking process startup.
   */
  public async initialize(): Promise<void> {
    if (!appConfig.redis.isConfigured || !appConfig.redis.url) {
      return;
    }

    try {
      const health = await this.checkHealth();
      if (health.status === 'up') {
        console.log(`[ParkEazy-Redis] Connected to Redis at ${appConfig.redis.sanitizedUrl}`);
      } else {
        console.warn(`[ParkEazy-Redis] Initial connectivity check notice: ${health.message}`);
      }
    } catch (err: any) {
      const safeMessage = sanitizeRedisUrl(err.message);
      console.warn(`[ParkEazy-Redis] Initial Redis check error: ${safeMessage}`);
    }
  }

  /**
   * Performs an actual Redis connectivity probe using PING.
   * Accurately reports 'up', 'down', or 'unconfigured' with latency metrics.
   * Never falsely claims Redis is healthy without live server verification.
   * Supports an optional overrideUrl for isolated testing.
   */
  public async checkHealth(overrideUrl?: string): Promise<ReadinessDependencyStatus> {
    const targetUrl = overrideUrl !== undefined ? overrideUrl : appConfig.redis.url;
    const isConfigured = overrideUrl !== undefined ? Boolean(targetUrl) : appConfig.redis.isConfigured;

    if (!isConfigured || !targetUrl) {
      return {
        status: 'unconfigured',
        message: 'REDIS_URL not configured. Running in in-memory baseline mode.',
      };
    }

    const start = Date.now();
    const timeoutMs = appConfig.redis.connectTimeoutMs || 3000;

    return new Promise<ReadinessDependencyStatus>((resolve) => {
      let lastError: Error | null = null;
      let settled = false;

      const probeClient = new Redis(targetUrl, {
        lazyConnect: true,
        connectTimeout: timeoutMs,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableOfflineQueue: false,
      });

      const finish = (result: ReadinessDependencyStatus) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        try {
          probeClient.disconnect();
        } catch (_) {}
        resolve(result);
      };

      const timeoutId = setTimeout(() => {
        if (overrideUrl === undefined) {
          this.isConnected = false;
        }
        finish({
          status: 'down',
          latencyMs: Date.now() - start,
          message: `Redis connection timed out after ${timeoutMs}ms.`,
        });
      }, timeoutMs + 500);

      probeClient.on('error', (err) => {
        lastError = err;
      });

      probeClient
        .connect()
        .then(() => probeClient.ping())
        .then((pong) => {
          if (pong === 'PONG') {
            if (overrideUrl === undefined) {
              this.isConnected = true;
            }
            finish({
              status: 'up',
              latencyMs: Date.now() - start,
              message: 'Redis connection active',
            });
          } else {
            if (overrideUrl === undefined) {
              this.isConnected = false;
            }
            finish({
              status: 'down',
              latencyMs: Date.now() - start,
              message: `Unexpected Redis ping response: ${pong}`,
            });
          }
        })
        .catch((err) => {
          if (overrideUrl === undefined) {
            this.isConnected = false;
          }
          const rawMessage = (lastError && lastError.message) || err.message || 'Connection failed';
          const safeMessage = sanitizeRedisUrl(rawMessage);
          finish({
            status: 'down',
            latencyMs: Date.now() - start,
            message: `Redis connection failed: ${safeMessage}`,
          });
        });
    });
  }

  public getClient(): RedisClient | null {
    return this.client;
  }

  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Closes the Redis client connection during graceful shutdown.
   */
  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('[ParkEazy-Redis] Redis connection gracefully closed.');
      } catch (err: any) {
        console.error('[ParkEazy-Redis] Error closing Redis client:', sanitizeRedisUrl(err.message));
        try {
          this.client.disconnect();
        } catch (_) {}
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }
}

export const redisManager = RedisManager.getInstance();
