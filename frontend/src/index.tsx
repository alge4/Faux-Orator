import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from './auth/authConfig';

// Initialize MSAL instance with error handling
const initializeMsal = () => {
  try {
    const instance = new PublicClientApplication(msalConfig);
    
    // Register event callbacks
    instance.addEventCallback(event => {
      // Log success events but keep them at debug level
      if (event.eventType === EventType.LOGIN_SUCCESS) {
        console.log("MSAL: Login successful");
      } else if (event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) {
        console.log("MSAL: Token acquisition successful");
      }
      
      // Log errors at error level
      if (event.eventType === EventType.LOGIN_FAILURE || 
          event.eventType === EventType.ACQUIRE_TOKEN_FAILURE) {
        console.error("MSAL authentication error:", event.error);
      }
    });
    
    return instance;
  } catch (error) {
    console.error("Failed to initialize MSAL:", error);
    // Return a fallback instance that will trigger the error boundary in App.tsx
    return new PublicClientApplication(msalConfig);
  }
};

const msalInstance = initializeMsal();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// PERFORMANCE OPTIMIZATION:
// StrictMode is permanently disabled in production and development
// to prevent double mounting which causes WebSocket connection issues
// and excessive re-renders

root.render(
  <MsalProvider instance={msalInstance}>
    <App />
  </MsalProvider>
);

// Configure performance monitoring
reportWebVitals(metric => {
  // Only log performance issues that exceed thresholds
  if (
    (metric.name === 'FCP' && metric.value > 2000) || // First Contentful Paint > 2s
    (metric.name === 'LCP' && metric.value > 2500) || // Largest Contentful Paint > 2.5s
    (metric.name === 'CLS' && metric.value > 0.1) ||  // Cumulative Layout Shift > 0.1
    (metric.name === 'FID' && metric.value > 100) ||  // First Input Delay > 100ms
    (metric.name === 'TTFB' && metric.value > 600)    // Time to First Byte > 600ms
  ) {
    console.warn(`Performance issue: ${metric.name} = ${metric.value}`);
  }
});
