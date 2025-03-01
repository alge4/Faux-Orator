import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index';

// Define the interface here (no import)
interface AuthRequest extends Request {
    user?: User;
}

const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Bearer <token>

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
            const user = await User.findByPk(decoded.id);

            if (!user) {
                return res.sendStatus(403); // Forbidden
            }

            req.user = user;
            next();
        } catch (err) {
            console.error(err);
            return res.sendStatus(403);
        }
    } else {
        res.sendStatus(401); // Unauthorized
    }
};

export { AuthRequest }; // Export the interface
export default authenticateJWT;
