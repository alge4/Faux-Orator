import express, { Request, Response } from 'express';
import { User } from '../models/index'; // Updated path
import bcrypt from 'bcryptjs'; // For password hashing
import jwt from 'jsonwebtoken'; // For generating JWTs
import { Op } from 'sequelize'; // Import Op from Sequelize
import authenticateJWT, { AuthRequest } from '../middleware/authMiddleware'; // Import AuthRequest from middleware
// Import other route files as you create them (e.g., campaignRoutes)

const router = express.Router();

// User Registration
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { azureAdUserId, username, email, firstName, lastName, password } = req.body;

        // Basic validation (you should add more robust validation)
        if (!azureAdUserId || !username || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if user already exists (by email or Azure AD ID)
        const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { azureAdUserId }] } });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the user
        const newUser = await User.create({
            azureAdUserId,
            username,
            email,
            firstName,
            lastName,
            password: hashedPassword, // Store the hashed password
            role: 'Player', // Or determine the role based on your logic
        });

        // Generate a JWT (JSON Web Token) for authentication
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET || 'your-secret-key', {
            expiresIn: '1h', // Token expires in 1 hour (adjust as needed)
        });

        // Return the user data and token (excluding the password)
        res.status(201).json({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            token,
        });

    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// User Login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Find the user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your-secret-key', {
            expiresIn: '1h',
        });

        // Return the user data and token
        res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token,
        });

    } catch (error) {
        console.error("Error during user login:", error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Get Current User (Protected Route)
router.get('/me', authenticateJWT, (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    res.status(200).json(req.user);
});

// Add other routes here (e.g., router.use('/campaigns', campaignRoutes);)

export default router;
