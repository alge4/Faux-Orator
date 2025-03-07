import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { OIDCStrategy, IOIDCStrategyOptionWithRequest } from 'passport-azure-ad';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import crypto from 'crypto';

// Load environment variables
const clientID = process.env.AZURE_CLIENT_ID || '';
const clientSecret = process.env.AZURE_CLIENT_SECRET || '';
const tenantID = process.env.AZURE_TENANT_ID || 'consumers'; // Use 'consumers' for personal accounts
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

// Generate PKCE code verifier and challenge
const generatePKCE = () => {
  // Generate a random code verifier
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate the code challenge from the verifier
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
};

// Store PKCE values (in a real app, this should be in a session or database)
const pkceStore = new Map<string, string>();

// Configure Azure AD Strategy
const azureAdOptions: IOIDCStrategyOptionWithRequest = {
  identityMetadata: `https://login.microsoftonline.com/${tenantID}/v2.0/.well-known/openid-configuration`,
  clientID: clientID,
  responseType: 'id_token',  // Changed to just 'id_token' to avoid authorization code flow
  responseMode: 'form_post',
  redirectUrl: `${backendUrl}/api/auth/microsoft/callback`,
  allowHttpForRedirectUrl: true,  // Allow HTTP for development
  clientSecret: clientSecret,
  validateIssuer: false,  // Set to false for development
  passReqToCallback: true as true,
  scope: ['profile', 'email', 'openid'],  // Removed offline_access since we're not using refresh tokens
  loggingLevel: 'info',
  loggingNoPII: process.env.NODE_ENV === 'production'
};

// Initialize Passport strategies
export const initializePassport = () => {
  // Azure AD Strategy for handling Microsoft login
  passport.use('azure-ad-openidconnect', new OIDCStrategy(
    azureAdOptions,
    async (req: any, iss: any, sub: any, profile: any, jwtClaims: any, accessToken: any, refreshToken: any, params: any, done: any) => {
      try {
        console.log('Profile from Azure AD:', profile);
        console.log('JWT Claims:', jwtClaims);
        
        // Extract email from JWT claims or profile
        const email = jwtClaims.email || profile._json?.email || profile.emails?.[0]?.value || '';
        
        // Generate a unique username if not available
        let username = profile.displayName || profile.name || jwtClaims.name || '';
        if (!username) {
          username = email.split('@')[0] || 'user';
        }
        
        console.log('Using email:', email);
        console.log('Using username:', username);
        
        if (!email) {
          console.error('No email found in profile or JWT claims');
          return done(new Error('No email found in profile or JWT claims'), false);
        }
        
        // Find or create user based on Microsoft ID
        const [user, created] = await User.findOrCreate({
          where: { azureAdUserId: profile.oid || jwtClaims.oid || jwtClaims.sub },
          defaults: {
            username: username,
            email: email,
            password: 'microsoft-auth', // Placeholder password for OAuth users
            azureAdUserId: profile.oid || jwtClaims.oid || jwtClaims.sub,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            role: 'Player' // Default role
          }
        });

        if (created) {
          console.log('Created new user from Microsoft login:', user.username);
        } else {
          console.log('Found existing user from Microsoft login:', user.username);
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in Azure AD authentication:', error);
        return done(error, false);
      }
    }
  ));

  // Bearer Strategy for JWT token validation
  passport.use(new BearerStrategy(async (token, done) => {
    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, jwtSecret) as { id: string };
      
      // Find the user by ID
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return done(null, false);
      }
      
      return done(null, user, { scope: 'all' });
    } catch (error) {
      return done(error, false);
    }
  }));

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

// Export PKCE functions for use in routes
export const pkce = { generatePKCE, pkceStore };
