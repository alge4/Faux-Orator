import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/index";
import logger from "../utils/logger";

// Define the interface here
export interface AuthRequest extends Request {
  user?: User;
}

const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Bearer <token>

    try {
      // Verify the token using our own JWT secret
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.error("JWT_SECRET environment variable is not set");
        return res.status(500).json({ message: "Server configuration error" });
      }
      const decoded = jwt.verify(token, jwtSecret) as { id: string };

      // Find the user by ID
      const user = await User.findByPk(decoded.id);

      if (!user) {
        logger.warn("User not found for token");
        return res.status(403).json({ message: "Access forbidden" });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error("JWT verification error:", err);
      return res.sendStatus(403);
    }
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

interface JwtPayload {
  id: string;
  azureAdUserId: string;
  role: string;
  email: string;
  iat: number;
}

export const verifyAzureToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or invalid Authorization header");
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      logger.warn("No token provided in Authorization header");
      return res.status(401).json({ message: "Authentication token required" });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || "";
    if (!jwtSecret) {
      logger.error("JWT_SECRET environment variable is not set");
      return res.status(500).json({ message: "Server configuration error" });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      // Check token age
      const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
      const maxAge = 24 * 60 * 60; // 24 hours in seconds

      if (tokenAge > maxAge) {
        logger.warn("Token has expired", { userId: decoded.id, tokenAge });
        return res
          .status(401)
          .json({ message: "Token expired, please login again" });
      }

      // Find user in database
      const user = await User.findByPk(decoded.id);

      if (!user) {
        logger.warn("User not found for token");
        return res.status(403).json({ message: "Access forbidden" });
      }

      // Attach user to request
      (req as any).user = user;

      logger.info("User authenticated successfully", {
        userId: user.id,
        role: user.role,
      });

      next();
    } catch (error) {
      logger.error("Token verification failed", error);
      return res.status(401).json({ message: "Invalid authentication token" });
    }
  } catch (error) {
    logger.error("Authentication middleware error", error);
    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};

export default authenticateJWT;
