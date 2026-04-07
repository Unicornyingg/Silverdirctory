type Bucket = {
  count: number;
  resetAt: number;
};

type ConsumeOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
};

const buckets = new Map<string, Bucket>();

function nowMs(): number {
  return Date.now();
}

function cleanupExpired(currentTime: number): void {
  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt <= currentTime) {
      buckets.delete(bucketKey);
    }
  }
}

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: ConsumeOptions): RateLimitResult {
  const currentTime = nowMs();
  cleanupExpired(currentTime);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= currentTime) {
    const resetAt = currentTime + windowMs;
    buckets.set(key, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      limit,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  const remaining = Math.max(0, limit - existing.count);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - currentTime) / 1000)
  );

  return {
    allowed: existing.count <= limit,
    remaining,
    retryAfterSeconds,
    limit,
  };
}
