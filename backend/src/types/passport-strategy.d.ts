declare module "passport-strategy" {
  import { Request } from "express";

  export declare class Strategy {
    name?: string;
    authenticate(req: Request, options?: Record<string, any>): void;
    success(user: any, info?: any): void;
    fail(challenge?: any, status?: number): void;
    redirect(url: string, status?: number): void;
    pass(): void;
    error(err: Error): void;
  }
}
