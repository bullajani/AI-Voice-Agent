import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found or deactivated'
      });
    }

    req.userId = decoded.userId;
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Invalid or malformed token'
    });
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin access required'
    });
  }
  next();
};

export default {
  authenticateToken,
  requireAdmin
};