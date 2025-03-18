export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
    redirectUri:
      process.env.REACT_APP_REDIRECT_URI || "http://localhost:80/auth/callback",
    postLogoutRedirectUri: "/",
  },
  cache: {
    cacheLocation: "sessionStorage", // or 'localStorage'
    storeAuthStateInCookie: false, // Set to true if you have issues with IE11 or Edge
  },
};

// Define the scopes you need
export const loginRequest = {
  scopes: ["User.Read"], // Add any additional scopes your app requires
};

// Login type configuration
export const loginType = {
  redirect: true, // Use redirect for login (alternative is popup)
  // Additional configs like prompt can be added here
};
