declare module 'passport-azure-ad-oauth2' {
  import { Strategy as PassportStrategy } from 'passport-strategy';
  
  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    tenant?: string;
    resource?: string;
  }
  
  export interface VerifyCallback {
    (err: any, user?: any, info?: any): void;
  }
  
  export interface VerifyFunction {
    (accessToken: string, refreshToken: string, params: any, profile: any, done: VerifyCallback): void;
  }
  
  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    name: string;
    authenticate(req: any, options?: any): void;
  }
}
