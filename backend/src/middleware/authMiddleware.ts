import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { User } from '../models/index';

// Define the interface here
interface AuthRequest extends Request {
    user?: User;
}

// Create a JWKS client to verify Microsoft tokens
const client = jwksRsa({
    jwksUri: `https://login.microsoftonline.com/common/discovery/v2.0/keys`
});

// Function to get the signing key
const getSigningKey = (kid: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        client.getSigningKey(kid, (err: Error | null, key: any) => {
            if (err) {
                reject(err);
                return;
            }
            
            const signingKey = key.getPublicKey();
            resolve(signingKey);
        });
    });
};

const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Bearer <token>

        try {
            // Decode the token without verification to get the kid (key ID)
            const decodedToken = jwt.decode(token, { complete: true }) as { header: { kid: string } } | null;
            
            if (!decodedToken) {
                return res.sendStatus(403);
            }
            
            const kid = decodedToken.header.kid;
            const signingKey = await getSigningKey(kid);
            
            // Verify the token using environment variables
            const verified = jwt.verify(token, signingKey, {
                audience: process.env.AZURE_CLIENT_ID,
                issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`
            }) as { oid: string; name: string; preferred_username: string };
            
            // Find or create user based on the Microsoft ID
            const [user] = await User.findOrCreate({
                where: { microsoftId: verified.oid },
                defaults: {
                    name: verified.name,
                    email: verified.preferred_username
                }
            });

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
