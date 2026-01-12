/**
 * Simple in-memory cache with TTL support
 * Perfect for caching frequently accessed API data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // in milliseconds
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>()

  /**
   * Get value from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMs Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Delete all cache entries matching a pattern
   * Useful for invalidating related caches (e.g., all "etf:*" keys)
   */
  deleteByPattern(pattern: RegExp): void {
    const keysToDelete: string[] = []
    this.store.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.store.delete(key))
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Get cache statistics
   */
  stats() {
    const keys: string[] = []
    this.store.forEach((_, key) => {
      keys.push(key)
    })
    return {
      size: this.store.size,
      keys,
    }
  }
}

// Singleton instance
export const cache = new MemoryCache()

/**
 * Helper function to cache async operations
 * @example
 * const data = await cacheAsync('user:123', async () => fetchUser(123), 5 * 60 * 1000)
 */
export async function cacheAsync<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
): Promise<T> {
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  const data = await fn()
  cache.set(key, data, ttlMs)
  return data
}
