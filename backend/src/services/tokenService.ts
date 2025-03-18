import jwt from "jsonwebtoken";
import logger from "../utils/logger";

interface TokenPayload {
  id: string;
  azureAdUserId: string;
  role: "DM" | "Player" | "Observer";
  email: string;
}

class TokenService {
  private readonly jwtSecret: string;
  private readonly tokenExpiration: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "";
    this.tokenExpiration = process.env.TOKEN_EXPIRATION || "24h";

    if (!this.jwtSecret) {
      logger.error("JWT_SECRET environment variable is not set");
      throw new Error("JWT_SECRET environment variable is not set");
    }
  }

  generateToken(payload: TokenPayload): string {
    try {
      const token = jwt.sign(
        {
          ...payload,
          iat: Math.floor(Date.now() / 1000), // Issued at time
        },
        this.jwtSecret,
        { expiresIn: this.tokenExpiration }
      );

      logger.info("JWT token generated", {
        userId: payload.id,
        tokenExpiration: this.tokenExpiration,
      });

      return token;
    } catch (error) {
      logger.error("Error generating JWT token", error);
      throw new Error("Failed to generate authentication token");
    }
  }

  verifyToken(token: string): TokenPayload & { iat: number } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload & {
        iat: number;
      };
      return decoded;
    } catch (error) {
      logger.error("Error verifying JWT token", error);
      throw new Error("Invalid authentication token");
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.verifyToken(token);
      const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
      const maxAge = 24 * 60 * 60; // 24 hours in seconds

      return tokenAge > maxAge;
    } catch (error) {
      return true; // If we can't verify the token, consider it expired
    }
  }
}

export default new TokenService();
