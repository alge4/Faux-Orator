import passport from "passport";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import {
  OIDCStrategy,
  IOIDCStrategyOptionWithRequest,
} from "passport-azure-ad";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import crypto from "crypto";
import logger from "../utils/logger";
import { Request, Response } from "express";
import { Session } from "express-session";

// Load environment variables
const clientID = process.env.AZURE_CLIENT_ID || "";
const clientSecret = process.env.AZURE_CLIENT_SECRET || "";
const tenantID = process.env.AZURE_TENANT_ID || "";
const redirectUrl = process.env.AZURE_REDIRECT_URI || "";
const jwtSecret = process.env.JWT_SECRET || "your-secret-key";

// Log important configuration values
logger.info("Azure AD Configuration", {
  clientID: clientID ? "configured" : "missing",
  clientIDPrefix: clientID.substring(0, 8) + "...",
  tenantID: tenantID ? "configured" : "missing",
  redirectUrl: redirectUrl,
  usePKCE: false, // We're using manual PKCE implementation
});

// Type definition for extended session
interface SessionWithPKCE extends Session {
  pkceVerifier?: string;
}

// Generate PKCE code verifier and challenge
const generatePKCE = () => {
  // Generate a random code verifier
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  // Generate the code challenge from the verifier
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
};

// Store PKCE values (in a real app, this should be in a session or database)
const pkceStore = new Map<string, string>();

// Configure Azure AD Strategy
const azureAdOptions: IOIDCStrategyOptionWithRequest = {
  identityMetadata: `https://login.microsoftonline.com/${tenantID}/v2.0/.well-known/openid-configuration`,
  clientID: clientID,
  responseType: "code",
  responseMode: "query",
  redirectUrl: redirectUrl,
  allowHttpForRedirectUrl: true,
  clientSecret: clientSecret,
  validateIssuer: false,
  passReqToCallback: true as true,
  scope: ["profile", "email", "openid", "offline_access", "User.Read"],

  // Disable built-in PKCE since we're handling it manually
  usePKCE: false,

  // These settings are specific to public clients
  isB2C: false,
  loggingLevel: "info",
  loggingNoPII: process.env.NODE_ENV === "production",
  responseParameters: ["id_token", "code"],
  nonceLifetime: 600,
  nonceMaxAmount: 10,
  clockSkew: 300,
  targetFramework: {
    version: "4.0.0",
  },
};

// Export a function to initialize passport
export const initializePassport = () => {
  // Serialize user to the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Register the Azure AD OIDC strategy
  passport.use(
    "azure-ad-openidconnect",
    new OIDCStrategy(
      azureAdOptions,
      async (
        req: Request,
        iss: string,
        sub: string,
        profile: any,
        jwtClaims: any,
        accessToken: string,
        refreshToken: string,
        params: any,
        done: (err: Error | null, user?: any) => void
      ) => {
        try {
          logger.info("Azure AD authentication callback", {
            email: profile._json.email || profile._json.preferred_username,
            name: profile.displayName,
          });

          // Find or create user
          let [user, created] = await User.findOrCreate({
            where: { azureAdUserId: profile.oid } as any,
            defaults: {
              email: profile._json.email || profile._json.preferred_username,
              username: profile.displayName,
              role: "Player", // Default role
            } as any,
          });

          if (created) {
            logger.info("Created new user from Microsoft login", {
              userId: user.id,
              email: user.email,
            });
          }

          return done(null, user);
        } catch (error) {
          logger.error("Error in Azure AD authentication:", error);
          return done(error as Error, false);
        }
      }
    )
  );

  // Bearer Strategy for JWT token validation
  passport.use(
    new BearerStrategy(
      async (
        token: string,
        done: (error: Error | null, user?: any, info?: any) => void
      ) => {
        try {
          // Verify the JWT token
          const decoded = jwt.verify(token, jwtSecret) as { id: string };

          // Find the user by ID
          const user = await User.findByPk(decoded.id);

          if (!user) {
            return done(null, false);
          }

          return done(null, user, { scope: "all" });
        } catch (error) {
          return done(error as Error, false);
        }
      }
    )
  );
};

// Export PKCE functions for use in routes
export const pkce = { generatePKCE, pkceStore };
