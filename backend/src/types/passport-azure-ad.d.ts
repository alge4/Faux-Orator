declare module "passport-azure-ad" {
  import { Request } from "express";
  import { Strategy } from "passport-strategy";

  export interface IOIDCStrategyOptionWithRequest {
    identityMetadata: string;
    clientID: string;
    responseType?: string;
    responseMode?: string;
    redirectUrl: string;
    allowHttpForRedirectUrl?: boolean;
    clientSecret?: string;
    validateIssuer?: boolean;
    isB2C?: boolean;
    issuer?: string;
    passReqToCallback: true;
    scope?: string[];
    loggingLevel?: string;
    loggingNoPII?: boolean;
    nonceLifetime?: number;
    nonceMaxAmount?: number;
    usePKCE?: boolean;
    pkceMethod?: {
      method: string;
      challenge?: (verifier: string) => string;
    };
    pkceVerifier?: {
      generateVerifier: () => string;
      storeVerifier: (req: Request, verifier: string) => void;
      loadVerifier: (req: Request) => string | null;
    };
    responseParameters?: string[];
    clockSkew?: number;
    sessionKey?: string;
    targetFramework?: {
      version: string;
    };
  }

  export class OIDCStrategy extends Strategy {
    constructor(
      options: IOIDCStrategyOptionWithRequest,
      verify: (
        req: Request,
        iss: string,
        sub: string,
        profile: any,
        jwtClaims: any,
        accessToken: string,
        refreshToken: string,
        params: any,
        done: (err: Error | null, user?: any) => void
      ) => void
    );
  }
}

// Add declarations for missing modules
declare module "passport-http-bearer" {
  import { Strategy } from "passport-strategy";

  export class Strategy extends Strategy {
    constructor(
      verify: (
        token: string,
        done: (error: Error | null, user?: any, info?: any) => void
      ) => void
    );
  }
}

declare module "jsonwebtoken" {
  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string | Buffer,
    options?: object
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: object
  ): any;
}
