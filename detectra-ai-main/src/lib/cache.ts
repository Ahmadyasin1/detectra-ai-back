import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AnalysisResult, JobStatus } from './detectraApi';
import type { VideoUpload } from './VideoUpload';

// Define database schema
interface DetectraDB extends DBSchema {
  analysisResults: {
    key: string; // jobId
    value: {
      jobId: string;
      result: AnalysisResult;
      cachedAt: number;
      expiresAt: number;
    };
    indexes: { 'by-jobId': string };
  };
  jobStatuses: {
    key: string; // jobId
    value: {
      jobId: string;
      status: JobStatus;
      cachedAt: number;
    };
    indexes: { 'by-jobId': string };
  };
  videoUploads: {
    key: string; // uploadId
    value: VideoUpload;
    indexes: { 'by-userId': string };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
    };
  };
}

const DB_NAME = 'detecra-cache';
const DB_VERSION = 1;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise: Promise<IDBPDatabase<DetectraDB>> | null = null;

// Feature flag check
const isOfflineCacheEnabled =
  import.meta.env.VITE_FEATURE_OFFLINE_CACHE === 'true';

function getDB(): Promise<IDBPDatabase<DetectraDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DetectraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Analysis results store
        if (!db.objectStoreNames.contains('analysisResults')) {
          const store = db.createObjectStore('analysisResults', { keyPath: 'jobId' });
          store.createIndex('by-jobId', 'jobId', { unique: true });
        }

        // Job statuses store
        if (!db.objectStoreNames.contains('jobStatuses')) {
          const store = db.createObjectStore('jobStatuses', { keyPath: 'jobId' });
          store.createIndex('by-jobId', 'jobId', { unique: true });
        }

        // Video uploads store
        if (!db.objectStoreNames.contains('videoUploads')) {
          const store = db.createObjectStore('videoUploads', { keyPath: 'id' });
          store.createIndex('by-userId', 'user_id', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    }).catch((error) => {
      console.warn('Failed to open IndexedDB, offline caching disabled');
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

// Cache-safe wrapper for API calls
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    storeName: 'analysisResults' | 'jobStatuses' | 'videoUploads' | 'settings';
    ttl?: number;
    bypassCache?: boolean;
  } = { storeName: 'analysisResults' as const }
): Promise<T> {
  if (!isOfflineCacheEnabled || options.bypassCache) {
    return fetchFn();
  }

  const storeName = options.storeName;
  const ttl = (options.ttl || CACHE_DURATION) as number;

  try {
    const db = await getDB();

    // Try to get from cache first
    const cached = await db.get(storeName, key);

    if (cached) {
      const now = Date.now();
      const cachedAt = (cached as { cachedAt: number }).cachedAt;
      const expiresAt = (cached as { expiresAt?: number }).expiresAt || cachedAt + ttl;

      if (now < expiresAt) {
        // Cache hit and valid
        if ('result' in cached) {
          return (cached as unknown as { result: T }).result;
        }
        return cached as unknown as T;
      }

      // Cache expired, delete it
      await db.delete(storeName, key);
    }
  } catch {
    console.warn('Cache read failed, bypassing cache');
  }

  // Fetch fresh data
  const result = await fetchFn();

  // Store in cache
  try {
    const db = await getDB();
    const now = Date.now();

    await db.put(storeName, {
      ...(typeof result === 'object' && result !== null ? result : { value: result }),
      jobId: key,
      cachedAt: now,
      expiresAt: now + ttl,
    } as DetectraDB[typeof storeName]);
  } catch {
    console.warn('Cache write failed');
  }

  return result;
}

// Analysis result specific cache
export async function getCachedAnalysisResult(jobId: string): Promise<AnalysisResult | null> {
  if (!isOfflineCacheEnabled) return null;

  try {
    const db = await getDB();
    const cached = await db.get('analysisResults', jobId);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }
  } catch {
    console.warn('Failed to read cached analysis result');
  }

  return null;
}

export async function cacheAnalysisResult(jobId: string, result: AnalysisResult): Promise<void> {
  if (!isOfflineCacheEnabled) return;

  try {
    const db = await getDB();
    await db.put('analysisResults', {
      jobId,
      result,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    });
  } catch {
    console.warn('Failed to cache analysis result');
  }
}

// Job status cache
export async function getCachedJobStatus(jobId: string): Promise<JobStatus | null> {
  if (!isOfflineCacheEnabled) return null;

  try {
    const db = await getDB();
    const cached = await db.get('jobStatuses', jobId);

    if (cached && Date.now() - cached.cachedAt < 5 * 60 * 1000) {
      return cached.status;
    }
  } catch {
    console.warn('Failed to read cached job status');
  }

  return null;
}

export async function cacheJobStatus(jobId: string, status: JobStatus): Promise<void> {
  if (!isOfflineCacheEnabled) return;

  try {
    const db = await getDB();
    await db.put('jobStatuses', {
      jobId,
      status,
      cachedAt: Date.now(),
    });
  } catch {
    console.warn('Failed to cache job status');
  }
}

// Video uploads cache
export async function getCachedVideoUploads(userId: string): Promise<VideoUpload[]> {
  if (!isOfflineCacheEnabled) return [];

  try {
    const db = await getDB();
    const uploads = await db.getAllFromIndex('videoUploads', 'by-userId', userId);
    return uploads || [];
  } catch {
    console.warn('Failed to read cached uploads');
    return [];
  }
}

export async function cacheVideoUpload(upload: VideoUpload): Promise<void> {
  if (!isOfflineCacheEnabled) return;

  try {
    const db = await getDB();
    await db.put('videoUploads', upload);
  } catch {
    console.warn('Failed to cache video upload');
  }
}

// Clear all cache
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('analysisResults');
    await db.clear('jobStatuses');
    await db.clear('videoUploads');
  } catch {
    console.warn('Failed to clear cache');
  }
}

// Get cache size
export async function getCacheSize(): Promise<{ count: number; size: number }> {
  try {
    const db = await getDB();
    const results = await db.getAll('analysisResults');
    const count = results.length;
    const size = new Blob([JSON.stringify(results)]).size;
    return { count, size };
  } catch {
    return { count: 0, size: 0 };
  }
}
