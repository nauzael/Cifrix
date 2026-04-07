export interface MemoryEntry {
  id: string;
  type: 'context' | 'pattern' | 'learning' | 'preference';
  key: string;
  value: any;
  confidence: number;
  lastAccessed: number;
  accessCount: number;
  createdAt: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

export interface MemoryQuery {
  type?: MemoryEntry['type'];
  keyPrefix?: string;
  minConfidence?: number;
  limit?: number;
}

export interface MemoryStats {
  totalEntries: number;
  byType: Record<string, number>;
  averageConfidence: number;
  oldestEntry: number;
  newestEntry: number;
}

const STORAGE_KEY = 'cifrix_memory';
const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ENTRIES = 1000;

export class MemoryPersistence {
  private cache: Map<string, MemoryEntry> = new Map();
  private isLoaded = false;
  private persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private persistDelay = 1000;

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const entries: MemoryEntry[] = JSON.parse(stored);
        entries.forEach(entry => {
          if (!this.isExpired(entry)) {
            this.cache.set(entry.key, entry);
          }
        });
        this.isLoaded = true;
        this.cleanup();
      }
    } catch (error) {
      console.warn('[Memory] Failed to load from storage:', error);
      this.isLoaded = true;
    }
  }

  private persistToStorage(): void {
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
    }
    
    this.persistDebounceTimer = setTimeout(() => {
      try {
        const entries = Array.from(this.cache.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.warn('[Memory] Failed to persist:', error);
        if ((error as Error).name === 'QuotaExceededError') {
          this.cleanup();
          this.persistToStorage();
        }
      }
    }, this.persistDelay);
  }

  private isExpired(entry: MemoryEntry): boolean {
    if (!entry.expiresAt) return false;
    return Date.now() > entry.expiresAt;
  }

  private cleanup(): void {
    if (this.cache.size <= MAX_ENTRIES) return;
    
    const entries = Array.from(this.cache.values())
      .sort((a, b) => {
        const scoreA = a.confidence * Math.log(a.accessCount + 1);
        const scoreB = b.confidence * Math.log(b.accessCount + 1);
        return scoreA - scoreB;
      });
    
    const toRemove = entries.slice(0, entries.length - MAX_ENTRIES);
    toRemove.forEach(entry => this.cache.delete(entry.key));
  }

  set(key: string, value: any, options: Partial<{
    type: MemoryEntry['type'];
    confidence: number;
    ttl: number;
    metadata: Record<string, any>;
  }> = {}): void {
    const now = Date.now();
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      type: options.type || 'context',
      key,
      value,
      confidence: options.confidence ?? 0.5,
      lastAccessed: now,
      accessCount: 0,
      createdAt: now,
      expiresAt: options.ttl ? now + options.ttl : now + DEFAULT_TTL,
      metadata: options.metadata
    };
    
    this.cache.set(key, entry);
    this.persistToStorage();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.persistToStorage();
      return null;
    }
    
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.persistToStorage();
    
    return entry.value;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) this.persistToStorage();
    return result;
  }

  query(params: MemoryQuery = {}): MemoryEntry[] {
    let results = Array.from(this.cache.values());
    
    if (params.type) {
      results = results.filter(e => e.type === params.type);
    }
    
    if (params.keyPrefix) {
      results = results.filter(e => e.key.startsWith(params.keyPrefix!));
    }
    
    if (params.minConfidence !== undefined) {
      results = results.filter(e => e.confidence >= params.minConfidence!);
    }
    
    results.sort((a, b) => {
      const scoreA = a.confidence * Math.log(a.accessCount + 1);
      const scoreB = b.confidence * Math.log(b.accessCount + 1);
      return scoreB - scoreA;
    });
    
    if (params.limit) {
      results = results.slice(0, params.limit);
    }
    
    return results;
  }

  updateConfidence(key: string, delta: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    entry.confidence = Math.max(0, Math.min(1, entry.confidence + delta));
    entry.lastAccessed = Date.now();
    this.persistToStorage();
    return true;
  }

  getStats(): MemoryStats {
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: entries.length,
      byType: entries.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageConfidence: entries.length > 0 
        ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length 
        : 0,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.createdAt)) 
        : 0,
      newestEntry: entries.length > 0 
        ? Math.max(...entries.map(e => e.createdAt)) 
        : 0
    };
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem(STORAGE_KEY);
  }

  clearExpired(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) this.persistToStorage();
    return count;
  }
}

export const memoryPersistence = new MemoryPersistence();
