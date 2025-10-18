import express from 'express';
import callRoutes from './callRoutes.js';
import agentRoutes from './agentRoutes.js';
import authRoutes from './authRoutesSign.js';
import * as callController from '../controllers/callController.js';

const router = express.Router();

/**
 * Main API Router
 * Consolidates all API routes
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VoiceAgent API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Basic Calls',
      'Agent Configuration',
      'Authentication',
      'LLM Management', 
      'Webhook Processing',
      'Data Extraction'
    ]
  });
});

// Legacy route aliases for backward compatibility
router.post('/create-web-call', callController.createWebCall);
router.post('/save-transcript', callController.saveTranscript);
router.post('/end-call', callController.endCall);

// Call routes (legacy and new)
router.use('/calls', callRoutes);

// Agent configuration routes
router.use('/agents', agentRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// ✅ FIXED: 404 handler (replaces the problematic router.all('*'))
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'POST /api/calls/web-call',
      'GET /api/agents',
      'POST /api/create-web-call'
    ]
  });
});

export default router;