import {createHash} from 'node:crypto';
import {env} from './env.js';

interface Bucket {
  start: number;
  count: number;
}

export interface LimitResult {
  ok: boolean;
  retryAfter: number;
  remaining: number;
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export class RateLimiter {
  private minute = new Map<string, Bucket>();
  private day = new Map<string, Bucket>();

  check(
    ip: string,
    action: 'submit' | 'run',
    now = Date.now(),
  ): LimitResult & {ipHash: string} {
    const ipHash = hashIp(ip);
    const minuteLimit =
      action === 'submit' ? env.submissionsPerMinute : env.runsPerMinute;
    const minuteWindow = Math.floor(now / 60_000);
    const minuteKey = `${action}:${ipHash}:${minuteWindow}`;
    const minuteBucket = this.minute.get(minuteKey) ?? {
      start: minuteWindow,
      count: 0,
    };

    if (minuteBucket.count >= minuteLimit) {
      return {
        ok: false,
        retryAfter: 60 - Math.floor((now % 60_000) / 1000),
        remaining: 0,
        ipHash,
      };
    }

    if (action === 'submit') {
      const dayWindow = Math.floor(now / 86_400_000);
      const dayKey = `${ipHash}:${dayWindow}`;
      const dayBucket = this.day.get(dayKey) ?? {start: dayWindow, count: 0};
      if (dayBucket.count >= env.submissionsPerDay) {
        return {
          ok: false,
          retryAfter:
            86_400 - Math.floor((now % 86_400_000) / 1000),
          remaining: 0,
          ipHash,
        };
      }
      dayBucket.count += 1;
      this.day.set(dayKey, dayBucket);
    }

    minuteBucket.count += 1;
    this.minute.set(minuteKey, minuteBucket);

    // 清理过期桶，避免长期运行内存增长
    if (this.minute.size > 5000) {
      for (const [key, bucket] of this.minute) {
        if (bucket.start < minuteWindow - 2) this.minute.delete(key);
      }
    }
    if (this.day.size > 5000) {
      const dayWindow = Math.floor(now / 86_400_000);
      for (const [key, bucket] of this.day) {
        if (bucket.start < dayWindow - 2) this.day.delete(key);
      }
    }

    return {
      ok: true,
      retryAfter: 0,
      remaining: Math.max(0, minuteLimit - minuteBucket.count),
      ipHash,
    };
  }
}

export const rateLimiter = new RateLimiter();
