import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms
}

/**
 * In-memory cache with per-key TTL.
 *
 * Used by ExplorationService to cache expensive external calls:
 *   - Nominatim reverse geocoding  (key: nominatim:<geohash7>:<lang>, 24h)
 *   - Overpass POI queries         (key: overpass:<geohash6>, 12h)
 *
 * A background sweeper runs every 5 minutes to purge expired entries so
 * the Map doesn't grow unbounded for keys that are never read again.
 */
@Injectable()
export class GeohashCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GeohashCacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private sweeper: NodeJS.Timeout | null = null;
  private static readonly SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  onModuleInit(): void {
    this.sweeper = setInterval(() => this.cleanup(), GeohashCacheService.SWEEP_INTERVAL_MS);
    // Don't block process shutdown on this timer.
    if (typeof this.sweeper.unref === 'function') {
      this.sweeper.unref();
    }
    this.logger.log('GeohashCacheService initialised (sweep every 5 min)');
  }

  onModuleDestroy(): void {
    if (this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
    this.store.clear();
  }

  /**
   * Returns the cached value for `key`, or null if missing/expired.
   * Expired entries are evicted on read.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Stores `value` under `key` for `ttlMs` milliseconds.
   * Non-positive TTLs are ignored (no-op).
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Current number of entries (including possibly-expired ones). */
  size(): number {
    return this.store.size;
  }

  /** Purges all expired entries. Safe to call on a hot path. */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleanup purged ${removed} expired entries (remaining: ${this.store.size})`);
    }
  }
}
