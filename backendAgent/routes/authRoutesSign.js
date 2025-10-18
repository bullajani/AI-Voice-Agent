import express from 'express';
import { signup, login } from '../controllers/authController.js'; // Remove getProfile, logout - they don't exist
import { authenticateToken } from '../middlewares/auth.js';


const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes (add these functions to authController if needed)
// router.get('/profile', authenticateToken, getProfile);
// router.post('/logout', authenticateToken, logout);

// Remove this line - it's wrong: app.use('/api/auth', authRoutes);

export default router;



