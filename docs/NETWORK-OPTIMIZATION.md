# Network Traffic Optimization in Faux Orator

This document outlines the network traffic optimization strategies implemented in the Faux Orator application to reduce excessive API calls and provide better user experience during connectivity issues.

## Overview

The Faux Orator application communicates with Supabase for data storage and retrieval. To optimize network traffic and handle connectivity issues gracefully, we've implemented several strategies:

1. **Enhanced Request Deduplication**
2. **Smart Caching**
3. **Failure Tracking & Backoff**
4. **Offline Mode Handling**
5. **UI Status Feedback**

## Key Components

### Request Deduplication

Prevents multiple identical requests from being sent simultaneously or in rapid succession:

```typescript
const deduplicateRequest = <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  // If there's already a pending request for this key, return it
  if (cacheKey in pendingRequests) {
    console.log(
      `Request deduplication: Reusing pending request for ${cacheKey}`
    );
    return pendingRequests[cacheKey] as Promise<T>;
  }

  // Create and store the promise
  const promise = fetchFn().finally(() => {
    // Remove from pending requests when done
    delete pendingRequests[cacheKey];
  });

  pendingRequests[cacheKey] = promise;
  return promise;
};
```

### Smart Caching

The caching system stores data with TTL (Time To Live) to reduce redundant network requests:

```typescript
const isCacheValid = (cacheKey: string): boolean => {
  const cacheEntry = dataCache[cacheKey];
  if (!cacheEntry) return false;

  const now = Date.now();
  return now - cacheEntry.timestamp < CACHE_TTL;
};
```

### Failure Tracking & Backoff

Tracks failed requests and implements exponential backoff to prevent hammering failing endpoints:

```typescript
const failedRequests: Record<string, { count: number; lastAttempt: number }> =
  {};

// In retry logic:
retries++;
const jitter = Math.random() * 300; // Add randomness
const waitTime = initialDelay * Math.pow(2, retries - 1) + jitter;
```

### Offline Mode

Detects connection problems and switches to offline mode to use cached data:

```typescript
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
```

### Unified Entity Fetching

Consolidated multiple similar entity fetch functions into a single helper function:

```typescript
const fetchEntityData = async <T>(
  tableName: keyof Database["public"]["Tables"],
  campaignId: string,
  selectFields: string,
  extraConditions?: (query: any) => any,
  mockFallback?: () => T[]
): Promise<SupabaseQueryResult<T>> => {
  // Implementation that applies all optimization strategies
};
```

## User Interface Feedback

The application provides real-time connection status feedback through the ConnectionStatus component:

- Connection state indicator (green, orange, red)
- Offline mode status
- Failed request count
- Last successful connection time
- Network latency measurements
- Manual retry button

## Benefits

1. **Reduced API Traffic**: Eliminates redundant network requests through deduplication and caching
2. **Better Error Handling**: Implements proper backoff to avoid hammering failing endpoints
3. **Improved User Experience**: Provides visual feedback about connectivity and graceful degradation
4. **Resilience**: Falls back to cached data when necessary
5. **Performance**: Reduces latency by avoiding unnecessary network calls

## Monitoring

Network request patterns can be observed in the browser's Developer Tools Network tab. The implementation significantly reduces:

1. Duplicate requests
2. Rapid successive requests to the same endpoint
3. Repeated requests to failing endpoints
