// backend/src/config/redis.ts - Redis Cache Configuration

import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

let redisClient: RedisClientType;

export async function initializeRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url: redisUrl,
  }) as RedisClientType;

  redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error', err);
  });

  redisClient.on('connect', () => {
    console.log('✓ Redis connection established');
  });

  try {
    await redisClient.connect();
    await redisClient.ping();
    console.log('✓ Redis connection verified');
  } catch (error) {
    console.error('✗ Failed to connect to Redis:', error);
    throw error;
  }

  return redisClient;
}

export async function getRedis(): Promise<RedisClientType> {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis first.');
  }
  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    console.log('✓ Redis connection closed');
  }
}

export async function setCache(key: string, value: unknown, ttl?: number): Promise<boolean> {
  const redis = await getRedis();
  const serialized = JSON.stringify(value);
  if (ttl) {
    await redis.setEx(key, ttl, serialized);
  } else {
    await redis.set(key, serialized);
  }
  return true;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function deleteCache(key: string): Promise<boolean> {
  const redis = await getRedis();
  return (await redis.del(key)) > 0;
}

export async function clearCache(): Promise<void> {
  const redis = await getRedis();
  await redis.flushDb();
}
