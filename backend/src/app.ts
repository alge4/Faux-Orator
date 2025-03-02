import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { initializeDatabase } from './models/index';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignRoutes';
import { initializePassport } from './config/passport';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
initializePassport();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost'}`);
        console.log(`Backend URL: ${process.env.BACKEND_URL || 'http://localhost:3000'}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();

export default app;
