import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index';

// Define the interface here
export interface AuthRequest extends Request {
    user?: User;
}

const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Bearer <token>

        try {
            // Verify the token using our own JWT secret
            const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jwt.verify(token, jwtSecret) as { id: string };
            
            // Find the user by ID
            const user = await User.findByPk(decoded.id);
            
            if (!user) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        } catch (err) {
            console.error('JWT verification error:', err);
            return res.sendStatus(403);
        }
    } else {
        res.sendStatus(401); // Unauthorized
    }
};

export default authenticateJWT;
