import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';

// Generate JWT token
const generateToken = (user: any) => {
  return jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });
};

// Microsoft authentication routes
router.get('/microsoft', 
  (req, res, next) => {
    console.log('Starting Microsoft authentication');
    next();
  },
  passport.authenticate('azure-ad-openidconnect', { 
    prompt: 'select_account',
    failureRedirect: `${frontendUrl}/login` 
  })
);

// Changed back to POST since we're using responseMode: 'form_post'
router.post('/microsoft/callback',
  (req, res, next) => {
    console.log('Received callback from Microsoft');
    console.log('Body:', req.body);
    next();
  },
  passport.authenticate('azure-ad-openidconnect', { 
    failureRedirect: `${frontendUrl}/login`,
    session: false 
  }),
  (req, res) => {
    console.log('Authentication successful, generating token');
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Redirect to frontend with token
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
);

// Route to get current user
router.get('/me', 
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      // User is already attached to req by passport
      res.json({ user: req.user });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Logout route
router.post('/logout', (req: any, res) => {
  req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ message: 'Error during logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;
