import express, { Request, Response } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { verifyAzureToken } from "../middleware/authMiddleware";
import logger from "../utils/logger";
import crypto from "crypto";
import { Session } from "express-session";
import fetch from "node-fetch";

// Custom type for session with PKCE data
interface CustomSession {
  pkceVerifier?: string;
}

// Custom type for request with PKCE challenge
interface CustomRequest extends Request {
  pkceChallenge?: string;
}

// Extend Express Request type to include passport-specific properties
interface RequestWithLogout extends express.Request {
  logout: (callback: (err: Error | null) => void) => void;
}

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost";

// Generate JWT token
const generateToken = (user: any) => {
  return jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "7d" });
};

// Microsoft authentication routes
router.get(
  "/microsoft",
  (req: Request, res: Response, next) => {
    logger.info("Starting Microsoft authentication", {
      hasSession: !!req.session,
      sessionID: req.sessionID || "none",
    });

    // Add session cookie settings
    if (req.session) {
      req.session.cookie.secure = process.env.NODE_ENV === "production";
      req.session.cookie.sameSite = "lax";
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Ensure we have a session
    if (!req.session) {
      logger.error("No session available for PKCE authentication flow");
      return res.redirect(`${frontendUrl}/login?error=no_session`);
    }

    // Generate PKCE verifier and challenge
    const verifier = crypto.randomBytes(64).toString("base64url");
    const challenge = crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url");

    // Store PKCE verifier in session for later use during token exchange
    if (req.session) {
      (req.session as any as CustomSession).pkceVerifier = verifier;

      logger.info("Generated PKCE for authentication request", {
        verifierLength: verifier.length,
        challengeLength: challenge.length,
        sessionID: req.sessionID,
      });
    }

    // Force the session to be saved before redirecting to Azure
    if (typeof req.session.save === "function") {
      req.session.save((err) => {
        if (err) {
          logger.error("Error saving session before auth", {
            error: err.message,
            sessionID: req.sessionID,
          });
          return res.redirect(`${frontendUrl}/login?error=session_error`);
        }
        logger.info(
          "Session saved successfully, proceeding with authentication",
          { sessionID: req.sessionID }
        );

        // After the session is saved, proceed with authentication
        (req as CustomRequest).pkceChallenge = challenge; // Make challenge available to passport
        next();
      });
    } else {
      logger.info(
        "Session save function not available, proceeding with authentication"
      );
      (req as CustomRequest).pkceChallenge = challenge; // Make challenge available to passport
      next();
    }
  },
  (req: CustomRequest, res: Response, next) => {
    // Get the challenge we saved in the previous middleware
    const challenge = req.pkceChallenge;

    // Log the redirect URI being used for authentication
    logger.info("Initiating authentication with redirect URI", {
      redirectUri: process.env.AZURE_REDIRECT_URI,
    });

    passport.authenticate("azure-ad-openidconnect", {
      prompt: "select_account",
      failureRedirect: `${frontendUrl}/login?error=auth_failed`,
      failWithError: true,
      session: true,
      // Explicitly include the code_challenge and method
      extraAuthReqQueryParams: {
        code_challenge: challenge,
        code_challenge_method: "S256",
      },
    })(req, res, next);
  }
);

// Handle GET callback for PKCE flow (query parameters)
router.get("/microsoft/callback", async (req: Request, res: Response, next) => {
  logger.info("Received GET callback from Microsoft", {
    query: req.query,
    error: req.query.error,
    code: req.query.code
      ? `${req.query.code.toString().substring(0, 10)}...`
      : "none",
    hasSession: !!req.session,
    sessionID: req.sessionID || "none",
    hasState: !!req.query.state,
  });

  // If there's an error in the query params, handle it
  if (req.query.error) {
    logger.error("OAuth error received", {
      error: req.query.error,
      description: req.query.error_description,
      sessionID: req.sessionID,
    });
    return res.redirect(
      `${frontendUrl}/login?error=${req.query.error}&error_description=${req.query.error_description}`
    );
  }

  // Get the authorization code
  const code = req.query.code?.toString();
  if (!code) {
    logger.error("No authorization code received");
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  // Get the PKCE verifier from session
  if (!req.session) {
    logger.error("No session available for token exchange");
    return res.redirect(`${frontendUrl}/login?error=no_session`);
  }

  const verifier = (req.session as any as CustomSession).pkceVerifier;
  if (!verifier) {
    logger.warn("Missing PKCE verifier in session for token exchange", {
      sessionID: req.sessionID,
      hasQueryVerifier: !!req.query.code_verifier,
    });

    // Emergency fallback - accept code_verifier from query param (only in dev)
    // This should only be used for debugging and testing
    if (process.env.NODE_ENV !== "production" && req.query.code_verifier) {
      logger.warn("Using emergency code_verifier from query param (DEV ONLY)", {
        usingQueryParam: true,
      });

      // Store it in session for the exchange
      (req.session as any as CustomSession).pkceVerifier = req.query
        .code_verifier as string;
    } else {
      // No fallback available, redirect with error
      logger.error(
        "Missing PKCE verifier for token exchange with no fallback",
        {
          sessionID: req.sessionID,
        }
      );
      return res.redirect(`${frontendUrl}/login?error=missing_verifier`);
    }
  }

  // At this point we should have a verifier, either from session or emergency fallback
  const finalVerifier = (req.session as any as CustomSession)
    .pkceVerifier as string;

  logger.info("PKCE verifier check before token exchange", {
    hasVerifier: !!finalVerifier,
    verifierPreview: finalVerifier
      ? `${finalVerifier.substring(0, 5)}...${finalVerifier.substring(
          finalVerifier.length - 5
        )}`
      : "none",
    sessionID: req.sessionID,
  });

  try {
    // Skip passport authentication and implement direct token exchange for public client
    const params = new URLSearchParams();
    params.append("client_id", process.env.AZURE_CLIENT_ID || "");
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.AZURE_REDIRECT_URI || "");
    params.append("code_verifier", finalVerifier);

    // Log the actual redirect URI to help with debugging
    logger.info("Using redirect URI for token exchange", {
      redirectUri: process.env.AZURE_REDIRECT_URI,
    });

    logger.info("Starting direct token exchange for public client", {
      verifierLength: finalVerifier.length,
      codeLength: code.length,
      usingClientSecret: false,
    });

    // Use fetch for direct token exchange
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const tokenData = await response.json();

    if (!response.ok) {
      logger.error("Token exchange failed", {
        status: response.status,
        error: tokenData.error,
        errorDescription: tokenData.error_description,
      });
      return res.redirect(
        `${frontendUrl}/login?error=${tokenData.error}&error_description=${tokenData.error_description}`
      );
    }

    // Parse the ID token
    const idToken = tokenData.id_token;
    if (!idToken) {
      logger.error("No ID token received");
      return res.redirect(`${frontendUrl}/login?error=no_id_token`);
    }

    // Decode the JWT token (not verifying signature here)
    const tokenParts = idToken.split(".");
    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());

    // Find or create user based on ID token claims
    let [user, created] = await User.findOrCreate({
      where: { azureAdUserId: payload.oid } as any,
      defaults: {
        email: payload.email || payload.preferred_username,
        username: payload.name,
        role: "Player", // Default role
      } as any,
    });

    if (created) {
      logger.info("Created new user from Microsoft login", {
        userId: user.id,
        email: user.email,
      });
    }

    // Generate JWT token for the client
    const jwtToken = generateToken({
      id: user.id,
      azureAdUserId: user.azureAdUserId,
      email: user.email,
      role: user.role,
    });

    // Redirect to frontend with token
    const redirectUrl = `${frontendUrl}/auth/callback?token=${jwtToken}`;
    logger.info("Authentication successful, redirecting with token");
    return res.redirect(redirectUrl);
  } catch (error) {
    logger.error("Error during token exchange", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.redirect(
      `${frontendUrl}/login?error=token_exchange_failed&error_description=${encodeURIComponent(
        error instanceof Error ? error.message : "Unknown error"
      )}`
    );
  }
});

// Handle POST callback for PKCE flow
router.post(
  "/microsoft/callback",
  async (req: Request, res: Response, next) => {
    logger.info("Received POST callback from Microsoft", {
      body: req.body ? "present" : "missing",
      error: req.body?.error,
      code: req.body?.code
        ? `${req.body.code.toString().substring(0, 10)}...`
        : "none",
      hasSession: !!req.session,
      sessionID: req.sessionID || "none",
      hasState: !!req.body?.state,
    });

    // If there's an error in the body, handle it
    if (req.body?.error) {
      logger.error("OAuth error received in POST", {
        error: req.body.error,
        description: req.body.error_description,
        sessionID: req.sessionID,
      });
      return res.redirect(
        `${frontendUrl}/login?error=${req.body.error}&error_description=${req.body.error_description}`
      );
    }

    // Get the authorization code
    const code = req.body?.code?.toString();
    if (!code) {
      logger.error("No authorization code received in POST callback");
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    // Get the PKCE verifier from session
    if (!req.session) {
      logger.error("No session available for token exchange in POST callback");
      return res.redirect(`${frontendUrl}/login?error=no_session`);
    }

    const verifier = (req.session as any as CustomSession).pkceVerifier;
    if (!verifier) {
      logger.warn(
        "Missing PKCE verifier in session for token exchange (POST)",
        {
          sessionID: req.sessionID,
          hasBodyVerifier: !!req.body.code_verifier,
        }
      );

      // Emergency fallback - accept code_verifier from request body (only in dev)
      if (process.env.NODE_ENV !== "production" && req.body.code_verifier) {
        logger.warn(
          "Using emergency code_verifier from request body (DEV ONLY)",
          {
            usingBodyParam: true,
          }
        );

        // Store it in session for the exchange
        (req.session as any as CustomSession).pkceVerifier =
          req.body.code_verifier;
      } else {
        // No fallback available
        logger.error(
          "Missing PKCE verifier for token exchange (POST) with no fallback",
          {
            sessionID: req.sessionID,
          }
        );
        return res.redirect(`${frontendUrl}/login?error=missing_verifier`);
      }
    }

    // At this point we should have a verifier, either from session or emergency fallback
    const finalVerifier = (req.session as any as CustomSession)
      .pkceVerifier as string;

    logger.info("PKCE verifier check before token exchange (POST)", {
      hasVerifier: !!finalVerifier,
      verifierPreview: finalVerifier
        ? `${finalVerifier.substring(0, 5)}...${finalVerifier.substring(
            finalVerifier.length - 5
          )}`
        : "none",
    });

    try {
      // Skip passport authentication and implement direct token exchange for public client
      const params = new URLSearchParams();
      params.append("client_id", process.env.AZURE_CLIENT_ID || "");
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      // Use the same redirect URI that was used during authorization request
      params.append("redirect_uri", process.env.AZURE_REDIRECT_URI || "");
      params.append("code_verifier", finalVerifier);

      // Log the actual redirect URI to help with debugging
      logger.info("Using redirect URI for token exchange (POST)", {
        redirectUri: process.env.AZURE_REDIRECT_URI,
      });

      logger.info("Starting direct token exchange for public client (POST)", {
        verifierLength: finalVerifier.length,
        codeLength: code.length,
        usingClientSecret: false,
      });

      // Use fetch for direct token exchange
      const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      const tokenData = await response.json();

      if (!response.ok) {
        logger.error("Token exchange failed (POST)", {
          status: response.status,
          error: tokenData.error,
          errorDescription: tokenData.error_description,
        });
        return res.redirect(
          `${frontendUrl}/login?error=${tokenData.error}&error_description=${tokenData.error_description}`
        );
      }

      // Parse the ID token
      const idToken = tokenData.id_token;
      if (!idToken) {
        logger.error("No ID token received in POST callback");
        return res.redirect(`${frontendUrl}/login?error=no_id_token`);
      }

      // Decode the JWT token (not verifying signature here)
      const tokenParts = idToken.split(".");
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], "base64").toString()
      );

      // Find or create user based on ID token claims
      let [user, created] = await User.findOrCreate({
        where: { azureAdUserId: payload.oid } as any,
        defaults: {
          email: payload.email || payload.preferred_username,
          username: payload.name,
          role: "Player", // Default role
        } as any,
      });

      if (created) {
        logger.info("Created new user from Microsoft login (POST)", {
          userId: user.id,
          email: user.email,
        });
      }

      // Generate JWT token for the client
      const jwtToken = generateToken({
        id: user.id,
        azureAdUserId: user.azureAdUserId,
        email: user.email,
        role: user.role,
      });

      // Redirect to frontend with token
      const redirectUrl = `${frontendUrl}/auth/callback?token=${jwtToken}`;
      logger.info("Authentication successful via POST, redirecting with token");
      return res.redirect(redirectUrl);
    } catch (error) {
      logger.error("Error during token exchange (POST)", {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.redirect(
        `${frontendUrl}/login?error=token_exchange_failed&error_description=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error"
        )}`
      );
    }
  }
);

// Get current user
router.get("/me", verifyAzureToken, (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

// Logout endpoint
router.post("/logout", (req, res) => {
  logger.info("User logout requested");
  // JWT is stateless, so we don't need to invalidate it server-side
  // The client should remove the token from storage
  res.json({ message: "Logout successful" });
});

// Logout route
router.get("/logout", (req: Request, res: Response) => {
  logger.info("User logout requested");

  // Destroy the session
  if (req.session) {
    req.session.destroy(function (err: any) {
      if (err) {
        logger.error("Error destroying session", err);
      }
      // Redirect to login page
      res.redirect(`${frontendUrl}/login`);
    });
  } else {
    // Redirect to login page if no session
    res.redirect(`${frontendUrl}/login`);
  }
});

// Diagnostic endpoint for session state (development only)
if (process.env.NODE_ENV !== "production") {
  router.get("/check-session", (req: Request, res: Response) => {
    // Type that includes our custom session properties
    interface CustomSession {
      pkceVerifier?: string;
    }

    const sessionInfo = {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      cookie: req.session?.cookie
        ? {
            maxAge: req.session.cookie.maxAge,
            secure: req.session.cookie.secure,
            httpOnly: req.session.cookie.httpOnly,
          }
        : null,
      pkceVerifier: (req.session as any as CustomSession)?.pkceVerifier
        ? "exists"
        : "not found",
      user: req.user ? "authenticated" : "not authenticated",
    };

    logger.info("Session check requested", { sessionInfo });
    res.json(sessionInfo);
  });
}

// Diagnostic endpoint for Azure configuration (development only)
if (process.env.NODE_ENV !== "production") {
  router.get("/check-config", (req: Request, res: Response) => {
    const configInfo = {
      clientID: process.env.AZURE_CLIENT_ID ? "configured" : "missing",
      clientIDValue: process.env.AZURE_CLIENT_ID?.substring(0, 8) + "...",
      tenantID: process.env.AZURE_TENANT_ID ? "configured" : "missing",
      redirectUrl: process.env.AZURE_REDIRECT_URI,
      clientSecretProvided: !!process.env.AZURE_CLIENT_SECRET,
      frontendUrl: process.env.FRONTEND_URL,
      environment: process.env.NODE_ENV || "development",
      // We're treating this as a public client
      clientType: "public",
    };

    logger.info("Azure configuration check requested", { config: configInfo });
    res.json(configInfo);
  });
}

// Verify ID token from SPA client
router.post("/verify-token", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "No ID token provided" });
    }

    logger.info("Received ID token from frontend for verification");

    try {
      // Decode the JWT token (in a production system, you should verify the signature)
      const tokenParts = idToken.split(".");
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], "base64").toString()
      );

      // Validate the token is from our expected issuer
      const expectedIssuer = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`;
      if (!payload.iss || !payload.iss.startsWith(expectedIssuer)) {
        logger.error("Invalid token issuer", { issuer: payload.iss });
        return res.status(401).json({ message: "Invalid token issuer" });
      }

      // Check token audience matches our client ID
      if (payload.aud !== process.env.AZURE_CLIENT_ID) {
        logger.error("Invalid token audience", { audience: payload.aud });
        return res.status(401).json({ message: "Invalid token audience" });
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        logger.error("Token expired", { expiry: payload.exp, now });
        return res.status(401).json({ message: "Token expired" });
      }

      // Find or create user based on ID token claims
      let [user, created] = await User.findOrCreate({
        where: { azureAdUserId: payload.oid } as any,
        defaults: {
          email: payload.email || payload.preferred_username,
          username: payload.name,
          role: "Player", // Default role
        } as any,
      });

      if (created) {
        logger.info("Created new user from Microsoft ID token", {
          userId: user.id,
          email: user.email,
        });
      } else {
        logger.info("Found existing user from Microsoft ID token", {
          userId: user.id,
          email: user.email,
        });
      }

      // Generate JWT token for the client
      const jwtToken = generateToken({
        id: user.id,
        azureAdUserId: user.azureAdUserId,
        email: user.email,
        role: user.role,
      });

      // Return the token
      return res.json({
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error("Error decoding or validating ID token", error);
      return res.status(401).json({ message: "Invalid ID token" });
    }
  } catch (error) {
    logger.error("Error in verify-token endpoint", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
