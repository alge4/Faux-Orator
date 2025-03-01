import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes'; // This path is correct
import { sequelize } from './models/index'; // This path is now correct

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS (allow requests from your frontend)
app.use(cors({
    origin: 'http://localhost:80' // Allow requests from your frontend's origin
}));
app.use(express.json());

// Use the user routes
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Faux Orator Backend is running!');
});

// Only start the server if this file is run directly
if (require.main === module) {
    // Test database connection first
    sequelize.authenticate()
        .then(() => {
            console.log('Database connection has been established successfully.');
            
            // Then sync the models
            return sequelize.sync({ force: false, alter: true });
        })
        .then(() => {
            console.log('Database synced successfully.');
            app.listen(port, () => {
                console.log(`Server is running on port ${port}`);
            });
        })
        .catch((err: any) => {
            console.error('Unable to connect to the database or sync models:', err);
        });
}

export default app;
