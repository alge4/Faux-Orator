# Circuit Breaker Pattern in Faux Orator

This document explains the implementation of the Circuit Breaker pattern in Faux Orator to protect against cascading failures when the Supabase database service experiences issues.

## Overview

The Circuit Breaker pattern prevents an application from repeatedly attempting to execute an operation that's likely to fail, allowing it to continue operating without waiting for the fault to be fixed or wasting resources while the fault persists.

## Implementation Details

### Circuit States

The circuit breaker has three states:

1. **CLOSED** - Normal operation. Requests flow through to the service.
2. **OPEN** - Service is failing. Requests are immediately rejected without attempting to call the service.
3. **HALF_OPEN** - Testing phase. A limited number of requests are allowed through to test if the service has recovered.

### Configuration

The circuit breaker is configured with the following parameters:

```typescript
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Number of failures before opening circuit
  resetTimeout: 30000, // 30 seconds before trying to close circuit
  openStateTimeout: 60000, // 1 minute in full open state
  halfOpenStateMaxRequests: 3, // Allow limited requests in half-open state
  windowSize: 10, // Size of the rolling window to track error rate
  errorThresholdPercentage: 50, // Percentage of errors to trigger circuit breaker
};
```

### How It Works

1. **Normal Operation (CLOSED)**:

   - All requests pass through normally
   - Success and failure results are tracked
   - If failures exceed thresholds, circuit opens

2. **Failure Mode (OPEN)**:

   - All requests are immediately rejected
   - Application falls back to cached data
   - After `resetTimeout`, circuit transitions to HALF_OPEN

3. **Recovery Testing (HALF_OPEN)**:
   - Limited requests are allowed through
   - If successful, circuit closes and normal operation resumes
   - If failures occur, circuit returns to OPEN state

### UI Indicator

The application includes a connection status indicator that shows:

- The current circuit state
- Whether the application is in offline mode
- Time since last successful connection
- Connection latency
- A button to manually retry connections

## Integration with Caching

The circuit breaker works in conjunction with the existing caching system:

1. When the circuit is OPEN, all database requests are blocked
2. The application automatically falls back to cached data
3. Cached data has a 2-minute TTL (time to live)
4. Cache is cleared when successful write operations occur

## Benefits

- **Prevents Cascading Failures**: Blocks repeated requests to failing services
- **Fail Fast**: Quickly identifies when services are unavailable
- **Self Healing**: Automatically tests recovery without overloading services
- **Enhanced User Experience**: Provides visual feedback about connection state
- **Graceful Degradation**: Falls back to cached data when necessary

## Error Detection Logic

The circuit breaker monitors both:

1. **Consecutive Failures**: Opens after 5 consecutive failures
2. **Error Rate**: Opens if more than 50% of requests in the rolling window fail

## Manual Control

Users can:

- View the current circuit state through the UI indicator
- Manually force a retry when in offline mode
- See real-time stats on connection health
