export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || "",
    authority: "https://login.microsoftonline.com/consumers",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

// Add scopes for the ID token to be used at Microsoft identity platform endpoints
export const loginRequest = {
  scopes: ["User.Read"]
};

// Add endpoints here for Microsoft Graph API services you'd like to use
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};
