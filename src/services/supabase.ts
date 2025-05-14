import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/types";
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { 
  Entity, 
  EntityRelationship, 
  EntityRelationshipInsert, 
  EntityRelationshipUpdate,
  EntityRelationshipDisplay 
} from '../types/entities';

// Define Json type (matching Supabase definition)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log Supabase configuration (mask the key for security)
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key present:", !!supabaseKey);

// Validate that the environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 10000; // Increase timeout to 10 seconds

// Global "offline mode" state - this is simpler than a circuit breaker
let isOfflineMode = false;
let lastOnlineCheck = 0;
const OFFLINE_CHECK_INTERVAL = 30000; // 30 seconds between online checks

/**
 * Cache storage with improved type definitions
 */
interface CacheStorage {
  [key: string]: {
    data: unknown;
    timestamp: number;
    campaignId?: string;
    tableName?: string;
  };
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache lifetime
const dataCache: CacheStorage = {};

// Global request tracking for better deduplication
const pendingRequests: Record<string, Promise<unknown>> = {};
const debouncedRequests: Record<string, NodeJS.Timeout> = {};
const DEBOUNCE_DELAY = 500; // 500ms debounce delay

// Track failed requests to avoid hammering the server
const failedRequests: Record<string, { count: number; lastAttempt: number }> = {};
const FAILURE_RESET_TIME = 60000; // 1 minute to reset failure count

// Check if a cache entry is still valid
const isCacheValid = (cacheKey: string): boolean => {
  const cacheEntry = dataCache[cacheKey];
  if (!cacheEntry) return false;
  
  const now = Date.now();
  return now - cacheEntry.timestamp < CACHE_TTL;
};

// Generate cache key with consistent format
const generateCacheKey = (tableName: string, campaignId?: string, extraParams?: string): string => {
  let key = campaignId 
    ? `${tableName}_${campaignId}` 
    : tableName;
    
  if (extraParams) {
    key = `${key}_${extraParams}`;
  }
  
  return key;
};

// Clear cache for a specific table or campaign
export const clearCache = (tableName?: string, campaignId?: string): void => {
  if (!tableName) {
    // Clear all cache
    Object.keys(dataCache).forEach(key => delete dataCache[key]);
    return;
  }
  
  if (campaignId) {
    // Clear specific table+campaign combination
    const cacheKey = generateCacheKey(tableName, campaignId);
    delete dataCache[cacheKey];
  } else {
    // Clear all entries for this table
    Object.keys(dataCache)
      .filter(key => key.startsWith(`${tableName}_`))
      .forEach(key => delete dataCache[key]);
  }
};

/**
 * Clear active debounce timers - useful for testing or forcing immediate requests
 */
export const clearDebouncedRequests = () => {
  Object.values(debouncedRequests).forEach(timer => clearTimeout(timer));
  Object.keys(debouncedRequests).forEach(key => delete debouncedRequests[key]);
};

/**
 * Enhanced request deduplication with failure tracking
 * @param cacheKey The cache key for the request
 * @param fetchFn The function that performs the actual fetch
 * @returns Promise with the result
 */
const deduplicateRequest = <T>(cacheKey: string, fetchFn: () => Promise<T>): Promise<T> => {
  // Check failure history - avoid repeated requests to failing endpoints
  const failureInfo = failedRequests[cacheKey];
  const now = Date.now();
  
  if (failureInfo) {
    // If this request has failed multiple times recently, increase backoff
    if (failureInfo.count > 2 && (now - failureInfo.lastAttempt) < Math.min(failureInfo.count * 5000, 30000)) {
      console.log(`Request ${cacheKey} has failed ${failureInfo.count} times recently, backing off`);
      
      // Return a rejected promise or use cached data if available
      if (dataCache[cacheKey]) {
        console.log(`Using stale cache for ${cacheKey} due to repeated failures`);
        return Promise.resolve(dataCache[cacheKey].data as T);
      }
      
      return Promise.reject(new Error(`Request ${cacheKey} is temporarily blocked due to repeated failures`));
    }
    
    // Reset failure count if it's been a while
    if ((now - failureInfo.lastAttempt) > FAILURE_RESET_TIME) {
      delete failedRequests[cacheKey];
    }
  }
  
  // If there's already a pending request for this key, return it
  if (cacheKey in pendingRequests) {
    console.log(`Request deduplication: Reusing pending request for ${cacheKey}`);
    return pendingRequests[cacheKey] as Promise<T>;
  }
  
  // Create and store the promise
  const promise = fetchFn().then(
    (result) => {
      // Success - reset failure count
      delete failedRequests[cacheKey];
      return result;
    },
    (error) => {
      // Track failure
      if (!failedRequests[cacheKey]) {
        failedRequests[cacheKey] = { count: 0, lastAttempt: now };
      }
      
      failedRequests[cacheKey].count++;
      failedRequests[cacheKey].lastAttempt = now;
      
      throw error;
    }
  ).finally(() => {
    // Remove from pending requests when done
    if (pendingRequests[cacheKey] === promise) {
    delete pendingRequests[cacheKey];
    }
  });
  
  pendingRequests[cacheKey] = promise;
  return promise;
};

/**
 * Improved debounced request - wait until a certain time has passed before executing
 * @param key Unique key to identify the request
 * @param fn Function to execute
 * @param delay Delay in milliseconds
 * @returns Promise that resolves when the function completes
 */
const debounce = <T>(key: string, fn: () => Promise<T>, delay: number = DEBOUNCE_DELAY): Promise<T> => {
  // Check if we have cached data for this key and return immediately if so
  const cacheKey = key.includes('_') ? key : `${key}_default`;
  if (dataCache[cacheKey] && isCacheValid(cacheKey)) {
    console.log(`Debounce using cache for ${key}`);
    return Promise.resolve(dataCache[cacheKey].data as T);
  }
  
  return new Promise((resolve, reject) => {
    // Clear any existing timeout
    if (debouncedRequests[key]) {
      clearTimeout(debouncedRequests[key]);
    }
    
    // Set a new timeout
    debouncedRequests[key] = setTimeout(async () => {
      try {
        delete debouncedRequests[key];
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
};

// Improved check for offline mode
export const shouldUseOfflineMode = (): boolean => {
  // If we're in offline mode, check if it's time to try online again
  if (isOfflineMode) {
    const now = Date.now();
    if (now - lastOnlineCheck > OFFLINE_CHECK_INTERVAL) {
      // Schedule a background check but don't block current request
      setTimeout(() => checkOnlineStatus(), 0);
    }
  }
  
  return isOfflineMode;
};

// Function to check if we can reconnect to Supabase
const checkOnlineStatus = async (): Promise<boolean> => {
  const now = Date.now();
  
  // Prevent concurrent status checks
  if (now - lastOnlineCheck < 5000) {
    return !isOfflineMode;
  }
  
  lastOnlineCheck = now;
  
  try {
    // Create an AbortController for timeout instead of using AbortSignal.timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Simple ping to check connectivity
      const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
        method: 'HEAD',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      // If successful, we're online
      if (response.ok) {
        if (isOfflineMode) {
          console.log('Connection restored, exiting offline mode');
          isOfflineMode = false;
        }
        return true;
      }
      
      // If we get here with a non-OK response, stay in offline mode
      isOfflineMode = true;
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (_error) {
    // Network error, assume we're offline
    isOfflineMode = true;
    console.warn('Network error, switching to offline mode');
    return false;
  }
};

/**
 * Initialize Supabase client 
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true
  }
});

// Reset offline mode and force the next request to try the real API
export const retryOnlineMode = async (): Promise<boolean> => {
  lastOnlineCheck = 0; // Force a fresh check
  isOfflineMode = false; // Temporarily assume we're online
  return checkOnlineStatus();
};

// Get current connection status for UI display
export const getConnectionStatus = () => {
  return {
    isOfflineMode,
    lastSuccessTimestamp: lastOnlineCheck,
    failedRequestCount: Object.keys(failedRequests).length
  };
};

/**
 * List of valid tables for typed Supabase queries
 */
type ValidTables = keyof Database['public']['Tables'] | 'quests' | 'events';

/**
 * Get a type-safe reference to a table
 * @param tableName The name of the table to access
 * @returns A reference to the table that can be used for queries
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTable(tableName: ValidTables): any {
  // We need to suppress TypeScript's strict type checking here
  // because we're adding custom tables that might not be in the Database type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(tableName as any);
}

/**
 * Type definitions for Supabase query responses
 */
type SupabaseQueryResult<T> = {
  data: T[] | null;
  error: unknown;
  count?: number; // Add count for pagination support
};

type SupabaseSingleResult<T> = {
  data: T | null;
  error: unknown;
};

/**
 * Utility function to suppress TypeScript errors when we know types are compatible but TS can't verify
 */
function suppressTs<T>(value: unknown): T {
  return value as T;
}

/**
 * Helper function to ensure type safety when working with Supabase queries
 * This addresses TypeScript compatibility issues between Supabase's PostgrestBuilder and our Promise types
 */
function asQueryResult<T>(query: unknown): Promise<SupabaseQueryResult<T>> {
  return Promise.resolve(query) as Promise<SupabaseQueryResult<T>>;
}

function asSingleResult<T>(query: unknown): Promise<SupabaseSingleResult<T>> {
  return Promise.resolve(query) as Promise<SupabaseSingleResult<T>>;
}

/**
 * Safely execute a Supabase query with proper typings
 * This function wraps a query to make it TypeScript friendly
 */
function safeQuery<T>(queryFn: () => unknown): () => Promise<SupabaseQueryResult<T>> {
  return () => asQueryResult<T>(queryFn());
}

/**
 * Safely execute a Supabase single-result query with proper typings
 * This function wraps a query to make it TypeScript friendly
 */
function safeSingleQuery<T>(queryFn: () => unknown): () => Promise<SupabaseSingleResult<T>> {
  return () => asSingleResult<T>(queryFn());
}

/**
 * Ping the Supabase service to check connectivity
 * This is useful for manually testing the connection
 */
export const pingSupabase = async (): Promise<{ success: boolean; latency: number }> => {
  try {
    const startTime = Date.now();
    
    // Use AbortController for timeout instead of AbortSignal.timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Simple lightweight fetch to check connectivity
      const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      const endTime = Date.now();
      return { 
        success: response.ok, 
        latency: endTime - startTime 
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return { 
      success: false, 
      latency: 0 
    };
  }
};

/**
 * Custom error class for database operations to standardize error formats
 */
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly hint?: string;
  
  constructor(message: string, code: string = 'UNKNOWN_ERROR', details: unknown = null, hint?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
  
  static fromSupabaseError(error: unknown): DatabaseError {
    if (!error) return new DatabaseError('Unknown database error');
    
    // Handle Supabase error format
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      const code = (err.code as string) || 'UNKNOWN_ERROR';
      const message = (err.message as string) || 'Unknown database error';
      const details = err.details || null;
      const hint = (err.hint as string) || undefined;
      
      return new DatabaseError(message, code, details, hint);
    }
    
    return new DatabaseError(String(error));
  }
}

/**
 * Enhanced retry function with improved backoff and failure tracking
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in ms
 * @param timeout Optional timeout in ms
 * @returns Promise with the result of the function
 */
export const simpleRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 500,
  timeout?: number
): Promise<T> => {
  let retries = 0;
  
  const execute = async (): Promise<T> => {
    try {
      // Check if we're in offline mode before even trying
      if (shouldUseOfflineMode()) {
        throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
      }
      
      // If timeout is specified, use AbortController
      if (timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          // Wrap the function call with a timeout
          const result = await Promise.race([
            fn(),
            new Promise<never>((_, reject) => {
              controller.signal.addEventListener('abort', () => {
                reject(new DatabaseError('Request timed out', 'TIMEOUT_ERROR'));
              });
            })
          ]);
          
          return result;
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        // Execute without timeout
        return await fn();
      }
    } catch (error) {
      // Don't retry if we're explicitly in offline mode
      if (error instanceof DatabaseError && error.code === 'OFFLINE_MODE') {
        throw error;
      }
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      retries++;
      const jitter = Math.random() * 300; // Add randomness to prevent thundering herd
      const waitTime = initialDelay * Math.pow(2, retries - 1) + jitter; 
      console.log(`Retry ${retries}/${maxRetries} after ${waitTime.toFixed(0)}ms...`);
      
      return new Promise((resolve) => {
        setTimeout(() => resolve(execute()), waitTime);
      });
    }
  };
  
  return execute();
};

// Define a type for RPC methods
type SupabaseRPC = {
  (func: string, params?: Record<string, unknown>): unknown;
};

/**
 * Fetch all entity types for a campaign in a single batch
 * Optimized to use DB indices and cache effectively
 */
export const fetchAllEntitiesForCampaign = async (campaignId: string, options: { 
  pageSize?: number,
  page?: number,
  forceRefresh?: boolean,
  timeout?: number
} = {}) => {
  const { pageSize = 100, page = 1, forceRefresh = false, timeout = 10000 } = options;
  const cacheKey = generateCacheKey('all_entities', campaignId);
  
  // Check cache first, even before starting any debounced or deduplicated operations
  if (!forceRefresh && isCacheValid(cacheKey)) {
    console.log(`Cache hit for ${cacheKey}`);
    return dataCache[cacheKey].data;
  }
  
  // Unique key for deduplication/debouncing
  const requestKey = `fetchAll_${campaignId}_${page}_${pageSize}`;
  
  // Combine debounce and deduplicate
  return debounce(requestKey, () => 
    deduplicateRequest(requestKey, async () => {
      try {
        if (shouldUseOfflineMode()) {
          throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
        }
        
        // Define base entity type for common fields
        interface EntityBase {
          id: string;
          name: string;
          description: string | null;
          campaign_id: string;
          created_at: string;
          updated_at: string;
        }
        
        type NPC = EntityBase;
        type Location = EntityBase;
        type Faction = EntityBase;
        type Item = EntityBase;
        
        // Calculate offsets for pagination
        const offset = (page - 1) * pageSize;
        
        // Use Promise.all with proper typing for parallel requests
        const [npcsResult, locationsResult, factionsResult, itemsResult] = await Promise.all([
          simpleRetry(safeQuery<NPC>(() => 
            supabase
              .from("npcs")
              .select('id, name, description, campaign_id, created_at, updated_at', { count: 'exact' })
              .eq("campaign_id", campaignId)
              .order('name')
              .range(offset, offset + pageSize - 1)
          ), 2, 500, timeout),
          simpleRetry(safeQuery<Location>(() => 
            supabase
              .from("locations")
              .select('id, name, description, campaign_id, created_at, updated_at', { count: 'exact' })
              .eq("campaign_id", campaignId)
              .order('name')
              .range(offset, offset + pageSize - 1)
          ), 2, 500, timeout),
          simpleRetry(safeQuery<Faction>(() => 
            supabase
              .from("factions")
              .select('id, name, description, campaign_id, created_at, updated_at', { count: 'exact' })
              .eq("campaign_id", campaignId)
              .order('name')
              .range(offset, offset + pageSize - 1)
          ), 2, 500, timeout),
          simpleRetry(safeQuery<Item>(() => 
            supabase
              .from("items")
              .select('id, name, description, campaign_id, created_at, updated_at', { count: 'exact' })
              .eq("campaign_id", campaignId)
              .order('name')
              .range(offset, offset + pageSize - 1)
          ), 2, 500, timeout),
        ]);
        
        // Handle errors - if any query had an error, throw it
        if (npcsResult.error) throw DatabaseError.fromSupabaseError(npcsResult.error);
        if (locationsResult.error) throw DatabaseError.fromSupabaseError(locationsResult.error);
        if (factionsResult.error) throw DatabaseError.fromSupabaseError(factionsResult.error);
        if (itemsResult.error) throw DatabaseError.fromSupabaseError(itemsResult.error);
        
        const result = {
          npcs: npcsResult.data || [],
          locations: locationsResult.data || [],
          factions: factionsResult.data || [],
          items: itemsResult.data || [],
          total_count: (npcsResult.count || 0) + (locationsResult.count || 0) + 
                       (factionsResult.count || 0) + (itemsResult.count || 0),
          has_more: ((npcsResult.count || 0) > pageSize) || ((locationsResult.count || 0) > pageSize) ||
                    ((factionsResult.count || 0) > pageSize) || ((itemsResult.count || 0) > pageSize)
        };
        
        // Cache the result
        dataCache[cacheKey] = {
          data: result,
          timestamp: Date.now(),
          campaignId
        };
        
        // Also cache individual entity types with pagination info
        dataCache[generateCacheKey('npcs', campaignId)] = {
          data: { data: npcsResult.data, count: npcsResult.count, error: null },
          timestamp: Date.now(),
          campaignId,
          tableName: 'npcs'
        };
        
        dataCache[generateCacheKey('locations', campaignId)] = {
          data: { data: locationsResult.data, count: locationsResult.count, error: null },
          timestamp: Date.now(),
          campaignId,
          tableName: 'locations'
        };
        
        dataCache[generateCacheKey('factions', campaignId)] = {
          data: { data: factionsResult.data, count: factionsResult.count, error: null },
          timestamp: Date.now(),
          campaignId,
          tableName: 'factions'
        };
        
        dataCache[generateCacheKey('items', campaignId)] = {
          data: { data: itemsResult.data, count: itemsResult.count, error: null },
          timestamp: Date.now(),
          campaignId,
          tableName: 'items'
        };
        
        return result;
      } catch (error) {
        console.error('Error fetching all entities:', error);
        
        // Return mock data for offline mode
        const { getMockEntities } = await import('../data/mockEntities');
        
        const mockData = {
          npcs: getMockEntities('npc'),
          locations: getMockEntities('location'),
          factions: getMockEntities('faction'),
          items: getMockEntities('item'),
          total_count: 0,
          has_more: false
        };
        
        return mockData;
      }
    })
  );
};

// Type-safe query helpers with offline mode awareness
export const fetchCampaignById = async (campaignId: string, timeout: number = 10000) => {
  const cacheKey = generateCacheKey('campaigns_by_id', campaignId);
  
  // Try cache first
  if (isCacheValid(cacheKey)) {
    console.log(`Cache hit for ${cacheKey}`);
    return dataCache[cacheKey].data;
  }
  
  // Use deduplication for concurrent requests
  const requestKey = `campaign_${campaignId}`;
  
  return debounce(requestKey, () => 
    deduplicateRequest(requestKey, async () => {
      try {
        if (shouldUseOfflineMode()) {
          throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
        }
        
        const result = await simpleRetry(
          safeSingleQuery<Database['public']['Tables']['campaigns']['Row']>(() => 
            supabase
              .from("campaigns")
              .select()
              .eq("id", campaignId)
              .single()
          ),
          2,  // maxRetries
          500, // initialDelay
          timeout
        );
        
        // Cache the result
        dataCache[cacheKey] = {
          data: result,
          timestamp: Date.now(),
          campaignId
        };
        
        return result;
      } catch (_error) {
        // Log the fallback operation
        console.warn('Falling back to mock campaign data');
        
        const mockData = {
          data: {
            id: campaignId,
            name: "Local Campaign",
            description: "This is a locally cached campaign (offline mode)",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null
        };
        
        // Cache the mock result too
        dataCache[cacheKey] = {
          data: mockData,
          timestamp: Date.now(),
          campaignId
        };
        
        return mockData;
      }
    })
  );
};

// Function helper to fetch entity data with unified caching and error handling
const fetchEntityData = async <T>(
  tableName: keyof Database['public']['Tables'], 
  campaignId: string,
  selectFields: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraConditions?: (query: any) => any, // Using any here is acceptable for query builder chains
  mockFallback?: () => T[],
  timeout: number = 10000 // Default timeout of 10 seconds
): Promise<SupabaseQueryResult<T>> => {
  const cacheKey = generateCacheKey(tableName, campaignId);
  
  // Try to use cached data first
  if (isCacheValid(cacheKey)) {
    console.log(`Cache hit for ${cacheKey}`);
    return dataCache[cacheKey].data as SupabaseQueryResult<T>;
  }
  
  // Unified request key
  const requestKey = `${tableName}_${campaignId}`;
  
  return deduplicateRequest(requestKey, async () => {
    try {
      // Offline mode is checked inside simpleRetry now
      let query = supabase
        .from(tableName)
        .select(selectFields)
        .eq("campaign_id", campaignId)
        .order('name');
        
      // Apply any extra conditions
      if (extraConditions) {
        query = extraConditions(query);
      }
      
      // Pass timeout to simpleRetry
      const result = await simpleRetry(safeQuery<T>(() => query), 2, 500, timeout);
      
      // Cache the result
      dataCache[cacheKey] = {
        data: result,
        timestamp: Date.now(),
        campaignId,
        tableName
      };
      
      return result;
    } catch (_error) {
      // Log the fallback operation
      console.warn(`Falling back to mock ${tableName} data`);
      
      let mockData: SupabaseQueryResult<T>;
      
      if (mockFallback) {
        mockData = {
          data: mockFallback(),
          error: null
        };
      } else {
        const { getMockEntities } = await import('../data/mockEntities');
        mockData = {
          data: getMockEntities(tableName.slice(0, -1)) as unknown as T[],
          error: null
        };
      }
      
      // Cache the mock result too
      dataCache[cacheKey] = {
        data: mockData,
        timestamp: Date.now(),
        campaignId,
        tableName
      };
      
      return mockData;
    }
  });
};

export const fetchNPCsByCampaignId = async (campaignId: string) => {
  return fetchEntityData<Database['public']['Tables']['npcs']['Row']>(
    'npcs',
    campaignId,
    `
              id, 
              name, 
              description, 
      role, 
      personality, 
      appearance, 
      goals, 
      faction_id, 
      location_id, 
              created_at, 
              updated_at
    `
  );
};

export const fetchLocationsByCampaignId = async (campaignId: string) => {
  return fetchEntityData<Database['public']['Tables']['locations']['Row']>(
    'locations',
          campaignId,
    `
      id, 
      name, 
      description, 
      type, 
      parent_location_id, 
      details, 
      created_at, 
      updated_at
    `
  );
};

export const fetchFactionsByCampaignId = async (campaignId: string) => {
  return fetchEntityData<Database['public']['Tables']['factions']['Row']>(
    'factions',
    campaignId,
    `
              id, 
              name, 
              description, 
      goals, 
      leader, 
      members, 
      resources, 
              created_at, 
              updated_at
    `
  );
};

export const fetchItemsByCampaignId = async (campaignId: string) => {
  return fetchEntityData<Database['public']['Tables']['items']['Row']>(
    'items',
    campaignId,
    `
              id, 
              name, 
              description, 
              current_holder,
              tags, 
              created_at, 
              updated_at
    `
  );
};

export const fetchSessionPlansByCampaignId = async (campaignId: string) => {
  return fetchEntityData<Database['public']['Tables']['session_plans']['Row']>(
    'session_plans',
    campaignId,
    `
              id, 
              title, 
              summary, 
              objectives, 
              involved_entities, 
              story_beats, 
              tags, 
              difficulty, 
              estimated_duration, 
              created_at, 
              updated_at
    `,
    (query) => query.order('created_at', { ascending: false }),
    () => [] // Empty fallback for session plans
  );
};

export const fetchStoryArcsByCampaignId = async (campaignId: string) => {
  return fetchEntityData<Database['public']['Tables']['story_arcs']['Row']>(
    'story_arcs',
    campaignId,
                `
                id, 
                title, 
                description, 
                nodes, 
                connections, 
                tags, 
                created_at, 
                updated_at
    `,
    undefined,
    () => [] // Empty fallback for story arcs
  );
};

/**
 * Fetches all entity relationships for a campaign
 */
export const fetchEntityRelationships = async (campaignId: string): Promise<SupabaseQueryResult<EntityRelationship>> => {
  const requestKey = `entity_relationships_${campaignId}`;
  
  return deduplicateRequest(requestKey, async () => {
    try {
      if (shouldUseOfflineMode()) {
        throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
      }
      
      const result = await simpleRetry(() => 
        // Use any type to bypass TypeScript restrictions
        supabase
          .from('entity_relationships' as any)
          .select('*')
          .eq('campaign_id', campaignId)
      );
      
      const data = result.data;
      const error = result.error;
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching entity relationships:', error);
      
      // Fall back to mock data in development or offline mode
      if (import.meta.env.DEV || isOfflineMode) {
        return { 
          data: [], // You can add mock relationships here if needed
          error: null 
        };
      }
      
      return { data: null, error: error as Error };
    }
  });
};

/**
 * Fetches entity relationships with detailed entity information
 */
export const fetchEntityRelationshipsWithDetails = async (campaignId: string): Promise<SupabaseQueryResult<EntityRelationshipDisplay>> => {
  try {
    // First fetch all relationships
    const relationshipsResult = await fetchEntityRelationships(campaignId);
    if (relationshipsResult.error) throw relationshipsResult.error;
    if (!relationshipsResult.data) return { data: [], error: null };
    
    // Then fetch all entities for this campaign to get their names and types
    const entitiesResult = await fetchAllEntitiesForCampaign(campaignId);
    if (!entitiesResult || (entitiesResult as any).error) throw (entitiesResult as any).error;
    
    // Extract all entities from the result
    const allEntities: Entity[] = [
      ...((entitiesResult as any).npcs || []),
      ...((entitiesResult as any).locations || []), 
      ...((entitiesResult as any).factions || []),
      ...((entitiesResult as any).items || [])
    ];
    
    // Create a map of entity IDs to entities for quick lookup
    const entityMap = new Map<string, Entity>();
    allEntities.forEach(entity => {
      if (entity && entity.id) {
        entityMap.set(entity.id, entity);
      }
    });
    
    // Enrich the relationships with entity details
    const enrichedRelationships: EntityRelationshipDisplay[] = relationshipsResult.data
      .filter(rel => entityMap.has(rel.source_id) && entityMap.has(rel.target_id))
      .map(rel => {
        const sourceEntity = entityMap.get(rel.source_id)!;
        const targetEntity = entityMap.get(rel.target_id)!;
        
        return {
          id: rel.id,
          source: {
            id: sourceEntity.id,
            name: sourceEntity.name,
            type: sourceEntity.type
          },
          target: {
            id: targetEntity.id,
            name: targetEntity.name,
            type: targetEntity.type
          },
          relationship_type: rel.relationship_type,
          description: rel.description,
          strength: rel.strength,
          bidirectional: rel.bidirectional
        };
      });
    
    return { data: enrichedRelationships, error: null };
  } catch (error) {
    console.error('Error fetching entity relationships with details:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * Creates a new entity relationship
 */
export const createEntityRelationship = async (
  relationship: EntityRelationshipInsert
): Promise<SupabaseQueryResult<EntityRelationship>> => {
  console.log('createEntityRelationship called with data:', relationship);
  console.log('Auth status:', await supabase.auth.getSession());

  try {
    if (shouldUseOfflineMode()) {
      console.log('Using offline mode, will return mock data');
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    console.log('Preparing to insert relationship into entity_relationships table');
    const startTime = performance.now();
    
    // Fix the type issues by using a more generic approach
    const { data, error } = await simpleRetry(() => {
      console.log('Executing Supabase insert operation...');
      return supabase
        .from('entity_relationships')
        .insert(relationship as any)
        .select()
        .single();
    });
    
    const endTime = performance.now();
    console.log(`API call completed in ${endTime - startTime}ms`);
    
    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('Relationship created successfully:', data);
    
    // Clear cache for this campaign's relationships
    clearCacheByPattern(`entity_relationships_${relationship.campaign_id}`);
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating entity relationship:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * Updates an existing entity relationship
 */
export const updateEntityRelationship = async (
  id: string,
  updates: EntityRelationshipUpdate
): Promise<SupabaseQueryResult<EntityRelationship>> => {
  try {
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await simpleRetry(() => 
      supabase
        .from('entity_relationships' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()
    );
    
    const data = result.data;
    const error = result.error;
    
    if (error) throw error;
    
    // Clear cache for this campaign's relationships
    if (data) {
      clearCacheByPattern(`entity_relationships_${data.campaign_id}`);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating entity relationship:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * Deletes an entity relationship
 */
export const deleteEntityRelationship = async (
  id: string,
  campaignId: string
): Promise<SupabaseQueryResult<null>> => {
  try {
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await simpleRetry(() => 
      supabase
        .from('entity_relationships' as any)
        .delete()
        .eq('id', id)
    );
    
    const error = result.error;
    
    if (error) throw error;
    
    // Clear cache for this campaign's relationships
    clearCacheByPattern(`entity_relationships_${campaignId}`);
    
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting entity relationship:', error);
    return { data: null, error: error as Error };
  }
};

// Add the clearCacheByPattern function which is missing
export const clearCacheByPattern = (pattern: string): void => {
  Object.keys(dataCache)
    .filter(key => key.includes(pattern))
    .forEach(key => delete dataCache[key]);
};

// Add this type augmentation to incorporate entity_relationships into the Database type
declare module '../supabase/types' {
  interface Database {
    public: {
      Tables: {
        entity_relationships: {
          Row: {
            id: string;
            campaign_id: string;
            source_id: string;
            target_id: string;
            relationship_type: string;
            description: string | null;
            strength: number;
            bidirectional: boolean;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            campaign_id: string;
            source_id: string;
            target_id: string;
            relationship_type: string;
            description?: string | null;
            strength?: number;
            bidirectional?: boolean;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            campaign_id?: string;
            source_id?: string;
            target_id?: string;
            relationship_type?: string;
            description?: string | null;
            strength?: number;
            bidirectional?: boolean;
            created_at?: string;
            updated_at?: string;
          };
        };
      };
    };
  }
}

/**
 * Log agent actions to the database for tracking and analysis
 */
export const logAgentAction = async (
  campaignId: string,
  sessionId: string,
  agentType: string,
  action: string,
  details: any,
  output: any
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('agent_logs')
      .insert({
        campaign_id: campaignId,
        session_id: sessionId,
        agent_type: agentType,
        action_type: action,
        details: details,
        output: output,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging agent action:', error);
    }
  } catch (error) {
    console.error('Failed to log agent action:', error);
  }
};
