import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/types";

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
const DEFAULT_TIMEOUT = 8000;

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,        // Number of consecutive failures before opening circuit
  failureRateThreshold: 50,   // Percentage of failures that triggers circuit open
  resetTimeout: 30000,        // Time in ms before attempting half-open state
  minimumRequests: 10,        // Minimum requests needed before evaluating circuit state
  requestTimeout: 8000        // Timeout in ms for individual requests
};

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation - requests pass through
  OPEN = 'OPEN',         // Circuit is open - requests are immediately rejected
  HALF_OPEN = 'HALF_OPEN' // Testing phase - allowing limited requests to check if service is back
}

// Circuit breaker implementation
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private lastStateChangeTimestamp: number = Date.now();
  private _lastSuccessTimestamp: number = 0;
  
  constructor(private config = CIRCUIT_BREAKER_CONFIG) {
    this.resetCounters();
  }
  
  // Getters for private fields to expose read-only access
  get failureCount(): number {
    return this.failures;
  }
  
  get requestCount(): number {
    return this.totalRequests;
  }
  
  get successCount(): number {
    return this.successfulRequests;
  }
  
  get lastSuccessTimestamp(): number {
    return this._lastSuccessTimestamp;
  }
  
  // Reset all counters to initial values
  private resetCounters(): void {
    this.failures = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
  }
  
  // Track a successful request
  public recordSuccess(): void {
    this.totalRequests++;
    this.successfulRequests++;
    this.failures = 0; // Reset consecutive failures
    this._lastSuccessTimestamp = Date.now();
    
    // If we're in HALF_OPEN and have enough successes, close the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.changeState(CircuitState.CLOSED);
    }
  }
  
  // Track a failed request
  public recordFailure(): void {
    this.totalRequests++;
    this.failures++;
    
    const failureRate = this.getFailureRate();
    
    // If we have enough requests and failure rate exceeds threshold, open circuit
    if (this.totalRequests >= this.config.minimumRequests && 
        failureRate >= this.config.failureRateThreshold) {
      this.changeState(CircuitState.OPEN);
    }
    
    // If we have consecutive failures exceeding threshold, open circuit
    if (this.failures >= this.config.failureThreshold) {
      this.changeState(CircuitState.OPEN);
    }
  }
  
  // Get the current failure rate percentage
  private getFailureRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.failures / this.totalRequests) * 100;
  }
  
  // Change the circuit state with logging
  private changeState(newState: CircuitState): void {
    if (this.state !== newState) {
      console.log(`Circuit breaker state changed from ${this.state} to ${newState}`);
      this.state = newState;
      
      if (newState === CircuitState.OPEN) {
        this.lastStateChangeTimestamp = Date.now();
      } else if (newState === CircuitState.CLOSED) {
        // Reset counters when closing the circuit
        this.resetCounters();
      }
    }
  }
  
  // Check if the circuit allows a request to proceed
  public allowRequest(): boolean {
    // Check if it's time to transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const timeElapsed = Date.now() - this.lastStateChangeTimestamp;
      if (timeElapsed >= this.config.resetTimeout) {
        this.changeState(CircuitState.HALF_OPEN);
      }
    }
    
    // Only allow requests if circuit is CLOSED or in HALF_OPEN state with limited requests
    return this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN;
  }
  
  // Get the current state
  public get currentState(): CircuitState {
    return this.state;
  }
}

// Track connection state globally
const connectionState = {
  lastSuccessTimestamp: 0,
  consecutiveFailures: 0,
  isOfflineMode: false
};

// Initialize the circuit breaker
const circuitBreaker = new CircuitBreaker();

// Register a listener for circuit breaker state changes
circuitBreaker.onStateChange((newState) => {
  // When circuit opens, explicitly set offline mode
  if (newState === CircuitState.OPEN) {
    connectionState.isOfflineMode = true;
    console.warn("Circuit breaker OPEN: Switching to offline mode");
  } 
  // When circuit closes, attempt to reconnect
  else if (newState === CircuitState.CLOSED) {
    connectionState.isOfflineMode = false;
    console.log("Circuit breaker CLOSED: Resuming normal operation");
  }
});

/**
 * Cache storage with improved type definitions
 */
interface CacheStorage {
  [key: string]: {
    data: any;
    timestamp: number;
    campaignId?: string;
    tableName?: string;
  };
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache lifetime
const dataCache: CacheStorage = {};

// Check if a cache entry is still valid
const isCacheValid = (cacheKey: string): boolean => {
  const cacheEntry = dataCache[cacheKey];
  if (!cacheEntry) return false;
  
  const now = Date.now();
  return now - cacheEntry.timestamp < CACHE_TTL;
};

// Generate cache key
const generateCacheKey = (tableName: string, campaignId?: string): string => {
  return campaignId 
    ? `${tableName}_${campaignId}` 
    : tableName;
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

// Create Supabase client with improved error handling
export const supabase = createClient<Database>(
  supabaseUrl || "",
  supabaseKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        "X-Client-Info": "faux-orator-app", 
      },
      fetch: (...args: [RequestInfo | URL, RequestInit?]): Promise<Response> => {
        // Check if the circuit breaker allows this request
        if (!circuitBreaker.allowRequest()) {
          console.warn('Circuit breaker preventing request');
          return Promise.reject(new Error('Circuit breaker open'));
        }
        
        const fetchPromise = fetch(...args);
        
        // Add a timeout to all requests
        const timeoutPromise = new Promise<Response>((_, reject) => {
          setTimeout(() => {
            connectionState.consecutiveFailures++;
            circuitBreaker.recordFailure();
            reject(new Error(`Request timed out after ${DEFAULT_TIMEOUT}ms`));
          }, DEFAULT_TIMEOUT);
        });
        
        // Race between the fetch and the timeout
        return Promise.race([fetchPromise, timeoutPromise])
          .then((response) => {
            if (!response.ok) {
              connectionState.consecutiveFailures++;
              circuitBreaker.recordFailure();
              throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            // Record successful request
            connectionState.lastSuccessTimestamp = Date.now();
            connectionState.consecutiveFailures = 0;
            circuitBreaker.recordSuccess();
            
            return response;
          })
          .catch((error) => {
            // Only record network errors once
            if (!(error.message.includes('timed out') || error.message.includes('HTTP error'))) {
              connectionState.consecutiveFailures++;
              circuitBreaker.recordFailure();
            }
            throw error;
          });
      }
    }
  }
);

// Check if we should use offline mode
export const shouldUseOfflineMode = () => {
  // If circuit breaker is open, always use offline mode
  if (circuitBreaker.currentState === CircuitState.OPEN) {
    return true;
  }
  
  // If we've explicitly switched to offline mode due to consecutive failures
  if (connectionState.isOfflineMode) {
    // Every 30 seconds, allow a retry to online mode
    const timeSinceLastSuccess = Date.now() - connectionState.lastSuccessTimestamp;
    if (timeSinceLastSuccess > 30000) {
      // Allow a retry, but don't reset offline mode until it succeeds
      return false;
    }
    return true;
  }
  
  // Not in offline mode
  return false;
};

// Reset offline mode and force the next request to try the real API
export const retryOnlineMode = async (): Promise<boolean> => {
  try {
    // Ping Supabase to check connectivity
    const pingResult = await pingSupabase();
    
    if (pingResult.success) {
      // If ping is successful, we can try to go back online
      connectionState.isOfflineMode = false;
      connectionState.consecutiveFailures = 0;
      connectionState.lastSuccessTimestamp = Date.now();
      
      // Record success in the circuit breaker
      circuitBreaker.recordSuccess();
      
      console.log("Successfully reconnected to Supabase, exiting offline mode");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Failed to reconnect to Supabase:", error);
    return false;
  }
};

/**
 * Get the current connection status for display or diagnostics
 */
export const getConnectionStatus = () => {
  return {
    circuitState: circuitBreaker.currentState,
    isOfflineMode: shouldUseOfflineMode(),
    consecutiveFailures: circuitBreaker.failureCount,
    lastSuccessTimestamp: circuitBreaker.lastSuccessTimestamp,
    failureRate: circuitBreaker.requestCount > 0 
      ? ((circuitBreaker.requestCount - circuitBreaker.successCount) / circuitBreaker.requestCount) * 100 
      : 0
  };
};

/**
 * List of valid tables for typed Supabase queries
 */
type ValidTables = 'npcs' | 'locations' | 'factions' | 'items' | 'campaigns' | 
  'session_plans' | 'quests' | 'events' | 'users' | '_pings' | string;

/**
 * Get a type-safe reference to a table
 */
function getTable(tableName: ValidTables) {
  return supabase.from(tableName);
}

/**
 * Ping the Supabase service to check connectivity
 * This is useful for manually testing the connection
 */
export const pingSupabase = async (): Promise<{ success: boolean; latency: number }> => {
  try {
    // Use a simple query to test the connection
    const startTime = Date.now();
    await withRetry(() => 
      getTable('campaigns').select('id').limit(1), 
      1, // Only try once
      300 // Short timeout
    );
    const endTime = Date.now();
    
    // If we get here, the connection is working
    return { 
      success: true, 
      latency: endTime - startTime 
    };
  } catch (error) {
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
  public readonly details: any;
  public readonly hint?: string;
  
  constructor(message: string, code: string = 'UNKNOWN_ERROR', details: any = null, hint?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
  
  static fromSupabaseError(error: any): DatabaseError {
    if (!error) return new DatabaseError('Unknown database error');
    
    // Handle Supabase error format
    const code = error.code || 'UNKNOWN_ERROR';
    const message = error.message || 'Unknown database error';
    const details = error.details || null;
    const hint = error.hint || undefined;
    
    return new DatabaseError(message, code, details, hint);
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param delay Initial delay in ms
 * @returns Promise with the result of the function
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 300
): Promise<T> => {
  let retries = 0;
  
  const execute = async (): Promise<T> => {
    try {
      // Check if circuit breaker prevents requests
      if (!circuitBreaker.allowRequest()) {
        throw new DatabaseError('Circuit breaker open', 'CIRCUIT_OPEN');
      }
      
      // Check if we're in offline mode before trying
      if (shouldUseOfflineMode()) {
        throw new DatabaseError('Application is in offline mode', 'OFFLINE_MODE');
      }
      
      // Execute the function
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        console.error(`Failed after ${maxRetries} retries:`, error);
        throw error instanceof DatabaseError 
          ? error 
          : DatabaseError.fromSupabaseError(error);
      }
      
      retries++;
      const waitTime = delay * Math.pow(2, retries - 1);
      console.log(`Retry ${retries}/${maxRetries} after ${waitTime}ms...`);
      
      return new Promise((resolve) => {
        setTimeout(() => resolve(execute()), waitTime);
      });
    }
  };
  
  return execute();
};

/**
 * Type definitions for Supabase query responses
 */
type SupabaseQueryResult<T> = {
  data: T[] | null;
  error: any;
};

type SupabaseSingleResult<T> = {
  data: T | null;
  error: any;
};

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
 * Fetch all entity types for a campaign in a single batch
 * Optimized to use DB indices and cache effectively
 */
export const fetchAllEntitiesForCampaign = async (campaignId: string) => {
  const cacheKey = generateCacheKey('all_entities', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
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
    
    // Type aliases for each entity type
    type NPC = EntityBase;
    type Location = EntityBase;
    type Faction = EntityBase;
    type Item = EntityBase;
    
    // Use Promise.all with proper typing
    const [npcsResult, locationsResult, factionsResult, itemsResult] = await Promise.all([
      withRetry(safeQuery<NPC>(() => 
        supabase
          .from("npcs")
          .select('id, name, description, campaign_id, created_at, updated_at')
          .eq("campaign_id", campaignId)
      )),
      withRetry(safeQuery<Location>(() => 
        supabase
          .from("locations")
          .select('id, name, description, campaign_id, created_at, updated_at')
          .eq("campaign_id", campaignId)
      )),
      withRetry(safeQuery<Faction>(() => 
        supabase
          .from("factions")
          .select('id, name, description, campaign_id, created_at, updated_at')
          .eq("campaign_id", campaignId)
      )),
      withRetry(safeQuery<Item>(() => 
        supabase
          .from("items")
          .select('id, name, description, campaign_id, created_at, updated_at')
          .eq("campaign_id", campaignId)
      )),
    ]);
    
    // Handle errors properly
    if (npcsResult.error) throw DatabaseError.fromSupabaseError(npcsResult.error);
    if (locationsResult.error) throw DatabaseError.fromSupabaseError(locationsResult.error);
    if (factionsResult.error) throw DatabaseError.fromSupabaseError(factionsResult.error);
    if (itemsResult.error) throw DatabaseError.fromSupabaseError(itemsResult.error);
    
    const result = {
      npcs: npcsResult.data || [],
      locations: locationsResult.data || [],
      factions: factionsResult.data || [],
      items: itemsResult.data || [],
    };
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId
    };
    
    // Also cache individual entity types
    dataCache[generateCacheKey('npcs', campaignId)] = {
      data: { data: npcsResult.data, error: null },
      timestamp: Date.now(),
      campaignId,
      tableName: 'npcs'
    };
    
    dataCache[generateCacheKey('locations', campaignId)] = {
      data: { data: locationsResult.data, error: null },
      timestamp: Date.now(),
      campaignId,
      tableName: 'locations'
    };
    
    dataCache[generateCacheKey('factions', campaignId)] = {
      data: { data: factionsResult.data, error: null },
      timestamp: Date.now(),
      campaignId,
      tableName: 'factions'
    };
    
    dataCache[generateCacheKey('items', campaignId)] = {
      data: { data: itemsResult.data, error: null },
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
      items: getMockEntities('item')
    };
    
    return mockData;
  }
};

// Type-safe query helpers with offline mode awareness
export const fetchCampaignById = async (campaignId: string) => {
  const cacheKey = generateCacheKey('campaigns_by_id', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await withRetry(safeSingleQuery<Database['public']['Tables']['campaigns']['Row']>(() => 
      supabase
        .from("campaigns")
        .select()
        .eq("id", campaignId)
        .single()
    ));
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId
    };
    
    return result;
  } catch (error) {
    // If we're in offline mode or network errors occurred, return mock data
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
};

export const fetchNPCsByCampaignId = async (campaignId: string) => {
  const cacheKey = generateCacheKey('npcs', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await withRetry(safeQuery<Database['public']['Tables']['npcs']['Row']>(() => 
      supabase
        .from("npcs")
        .select(`
          id, 
          name, 
          description, 
          personality, 
          current_location, 
          status, 
          tags, 
          created_at, 
          updated_at
        `)
        .eq("campaign_id", campaignId)
        .order('name')
    ));
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId,
      tableName: 'npcs'
    };
    
    return result;
  } catch (error) {
    // Return mock data for offline mode
    console.warn('Falling back to mock NPC data');
    const { getMockEntities } = await import('../data/mockEntities');
    
    const mockData = {
      data: getMockEntities('npc'),
      error: null
    };
    
    // Cache the mock result too
    dataCache[cacheKey] = {
      data: mockData,
      timestamp: Date.now(),
      campaignId,
      tableName: 'npcs'
    };
    
    return mockData;
  }
};

export const fetchLocationsByCampaignId = async (campaignId: string) => {
  const cacheKey = generateCacheKey('locations', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await withRetry(safeQuery<Database['public']['Tables']['locations']['Row']>(() => 
      supabase
        .from("locations")
        .select(`
          id, 
          name, 
          description, 
          parent_location, 
          tags, 
          created_at, 
          updated_at
        `)
        .eq("campaign_id", campaignId)
        .order('name')
    ));
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId,
      tableName: 'locations'
    };
    
    return result;
  } catch (error) {
    // Return mock data for offline mode
    console.warn('Falling back to mock location data');
    const { getMockEntities } = await import('../data/mockEntities');
    
    const mockData = {
      data: getMockEntities('location'),
      error: null
    };
    
    // Cache the mock result too
    dataCache[cacheKey] = {
      data: mockData,
      timestamp: Date.now(),
      campaignId,
      tableName: 'locations'
    };
    
    return mockData;
  }
};

export const fetchFactionsByCampaignId = async (campaignId: string) => {
  const cacheKey = generateCacheKey('factions', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await withRetry(safeQuery<Database['public']['Tables']['factions']['Row']>(() => 
      supabase
        .from("factions")
        .select(`
          id, 
          name, 
          description, 
          current_status, 
          tags, 
          created_at, 
          updated_at
        `)
        .eq("campaign_id", campaignId)
        .order('name')
    ));
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId,
      tableName: 'factions'
    };
    
    return result;
  } catch (error) {
    // Return mock data for offline mode
    console.warn('Falling back to mock faction data');
    const { getMockEntities } = await import('../data/mockEntities');
    
    const mockData = {
      data: getMockEntities('faction'),
      error: null
    };
    
    // Cache the mock result too
    dataCache[cacheKey] = {
      data: mockData,
      timestamp: Date.now(),
      campaignId,
      tableName: 'factions'
    };
    
    return mockData;
  }
};

export const fetchItemsByCampaignId = async (campaignId: string) => {
  const cacheKey = generateCacheKey('items', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await withRetry(safeQuery<Database['public']['Tables']['items']['Row']>(() => 
      supabase
        .from("items")
        .select(`
          id, 
          name, 
          description, 
          current_holder,
          tags, 
          created_at, 
          updated_at
        `)
        .eq("campaign_id", campaignId)
        .order('name')
    ));
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId,
      tableName: 'items'
    };
    
    return result;
  } catch (error) {
    // Return mock data for offline mode
    console.warn('Falling back to mock item data');
    const { getMockEntities } = await import('../data/mockEntities');
    
    const mockData = {
      data: getMockEntities('item'),
      error: null
    };
    
    // Cache the mock result too
    dataCache[cacheKey] = {
      data: mockData,
      timestamp: Date.now(),
      campaignId,
      tableName: 'items'
    };
    
    return mockData;
  }
};

export const fetchSessionPlansByCampaignId = async (campaignId: string) => {
  const cacheKey = generateCacheKey('session_plans', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await withRetry(safeQuery<Database['public']['Tables']['session_plans']['Row']>(() => 
      supabase
        .from("session_plans")
        .select(`
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
        `)
        .eq("campaign_id", campaignId)
        .order('created_at', { ascending: false })
    ));
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId,
      tableName: 'session_plans'
    };
    
    return result;
  } catch (error) {
    // Return empty array for session plans in offline mode
    console.warn('Falling back to empty session plans data');
    
    const mockData = {
      data: [],
      error: null
    };
    
    // Cache the mock result too
    dataCache[cacheKey] = {
      data: mockData,
      timestamp: Date.now(),
      campaignId,
      tableName: 'session_plans'
    };
    
    return mockData;
  }
};

export const fetchStoryArcsByCampaignId = async (campaignId: string) => {
  const cacheKey = generateCacheKey('story_arcs', campaignId);
  
  try {
    // Try to use cached data first
    if (isCacheValid(cacheKey)) {
      return dataCache[cacheKey].data;
    }
    
    if (shouldUseOfflineMode()) {
      throw new DatabaseError('Using offline mode', 'OFFLINE_MODE');
    }
    
    const result = await asQueryResult<Database['public']['Tables']['story_arcs']['Row']>(
      withRetry(() => 
        supabase
          .from("story_arcs")
          .select(
            `
            id, 
            title, 
            description, 
            nodes, 
            connections, 
            tags, 
            created_at, 
            updated_at
          `
          )
          .eq("campaign_id", campaignId)
      )
    );
    
    // Cache the result
    dataCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      campaignId,
      tableName: 'story_arcs'
    };
    
    return result;
  } catch (error) {
    // Return empty array for story arcs in offline mode
    console.warn('Falling back to empty story arcs data');
    
    const mockData = {
      data: [],
      error: null
    };
    
    // Cache the mock result too
    dataCache[cacheKey] = {
      data: mockData,
      timestamp: Date.now(),
      campaignId,
      tableName: 'story_arcs'
    };
    
    return mockData;
  }
};

export const logAgentAction = async (
  campaignId: string,
  sessionId: string | null,
  agentType: string,
  action: string,
  input: any,
  output: any
) => {
  try {
    if (shouldUseOfflineMode()) {
      return { data: null, error: null };
    }
    
    return await withRetry(() => 
      supabase.from("agent_logs").insert({
        campaign_id: campaignId,
        session_id: sessionId,
        agent_type: agentType,
        action: action,
        input: input,
        output: output,
      })
    );
  } catch (error) {
    // Silently ignore log failures in offline mode
    console.warn('Failed to log agent action in offline mode');
    return { data: null, error: null };
  }
};

export const createSessionPlan = async (
  campaignId: string,
  sessionPlan: any
) => {
  try {
    if (shouldUseOfflineMode()) {
      throw new Error('Using offline mode');
    }
    
    const {
      title,
      summary,
      objectives,
      involvedEntities,
      storyBeats,
      tags,
      difficulty,
      estimatedDuration,
    } = sessionPlan;

    const result = await withRetry(() => 
      supabase
        .from("session_plans")
        .insert({
          campaign_id: campaignId,
          title,
          summary,
          objectives,
          involved_entities: involvedEntities,
          story_beats: storyBeats,
          tags,
          difficulty,
          estimated_duration: estimatedDuration,
        })
        .select()
        .single()
    );
    
    // Clear the session plans cache for this campaign
    clearCache('session_plans', campaignId);
    
    return result;
  } catch (error) {
    // Return a mock response for offline mode
    console.warn('Cannot create session plan in offline mode');
    return {
      data: {
        id: `local-${Date.now()}`,
        campaign_id: campaignId,
        ...sessionPlan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null
    };
  }
};

/**
 * Create a new entity in the specified table
 */
export const createEntity = async <T extends { campaign_id: string }>(
  tableName: 'npcs' | 'locations' | 'factions' | 'items' | 'session_plans' | 'campaigns' | 'quests' | 'events',
  data: T
): Promise<{ data: T | null; error: any }> => {
  try {
    // Check if we're in offline mode
    if (shouldUseOfflineMode()) {
      // In offline mode, create a mock entity
      const { createMockEntity } = await import('../data/mockEntities');
      const mockEntity = createMockEntity(tableName, data);
      
      return { data: mockEntity as T, error: null };
    }
    
    // Ensure updated_at is set
    const entityData = {
      ...data,
      updated_at: new Date().toISOString()
    };
    
    // Perform the real database operation
    const result = await withRetry(safeSingleQuery<T>(() => 
      getTable(tableName)
        .insert(entityData)
        .select()
        .single()
    ));
    
    // If successful, invalidate any relevant cache entries
    if (result.data) {
      clearCache(tableName, data.campaign_id);
      clearCache('all_entities', data.campaign_id);
    }
    
    return result;
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof DatabaseError ? error : DatabaseError.fromSupabaseError(error) 
    };
  }
};

/**
 * Update an existing entity and refresh the cache
 */
export const updateEntityAndCache = async (
  tableName: 'npcs' | 'locations' | 'factions' | 'items' | 'session_plans' | 'campaigns' | 'quests' | 'events',
  id: string,
  data: Record<string, unknown>,
  campaignId: string
) => {
  try {
    // Check if we're in offline mode
    if (shouldUseOfflineMode()) {
      // In offline mode, update a mock entity
      const { updateMockEntity } = await import('../data/mockEntities');
      const mockEntity = updateMockEntity(tableName, id, data);
      
      return { data: mockEntity, error: null };
    }
    
    // Ensure updated_at is set
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };
    
    // Perform the real database operation
    const result = await withRetry(safeSingleQuery<Record<string, unknown>>(() => 
      getTable(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ));
    
    // If successful, invalidate any relevant cache entries
    if (result.data) {
      clearCache(tableName, campaignId);
      clearCache('all_entities', campaignId);
    }
    
    return result;
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof DatabaseError ? error : DatabaseError.fromSupabaseError(error) 
    };
  }
};

/**
 * Delete an entity from the specified table
 */
export const deleteEntity = async (
  tableName: 'npcs' | 'locations' | 'factions' | 'items' | 'session_plans' | 'campaigns' | 'quests' | 'events',
  id: string,
  campaignId: string
) => {
  try {
    // Check if we're in offline mode
    if (shouldUseOfflineMode()) {
      // In offline mode, delete a mock entity
      const { deleteMockEntity } = await import('../data/mockEntities');
      const success = deleteMockEntity(tableName, id);
      
      return { data: { success }, error: null };
    }
    
    // Perform the real database operation
    const result = await withRetry(() => 
      getTable(tableName)
        .delete()
        .eq('id', id)
    );
    
    // If successful, invalidate any relevant cache entries
    if (!result.error) {
      clearCache(tableName, campaignId);
      clearCache('all_entities', campaignId);
    }
    
    return result;
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof DatabaseError ? error : DatabaseError.fromSupabaseError(error) 
    };
  }
};
