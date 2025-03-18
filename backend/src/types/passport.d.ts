declare module "passport" {
  import express from "express";

  export interface AuthenticateOptions {
    prompt?: string;
    failureRedirect?: string;
    failWithError?: boolean;
    session?: boolean;
    extraAuthReqQueryParams?: Record<string, any>;
    extraTokenReqQueryParams?: Record<string, any>;
  }

  export interface PassportStatic {
    initialize(): express.Handler;
    session(): express.Handler;
    authenticate(
      strategy: string | string[],
      options?: AuthenticateOptions
    ): express.Handler;
    serializeUser<User, Done>(fn: (user: User, done: Done) => void): void;
    deserializeUser<Obj, Done>(fn: (obj: Obj, done: Done) => void): void;
    use(strategy: any): PassportStatic;
  }

  // Augment Express Request with passport properties
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      isUnauthenticated(): boolean;
      logIn(user: any, callback: (err: any) => void): void;
      login(user: any, callback: (err: any) => void): void;
      logOut(callback: (err: any) => void): void;
      logout(callback: (err: any) => void): void;
    }
  }

  const passport: PassportStatic;
  export default passport;
}
