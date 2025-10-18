import express from 'express';
import { 
  createWebCall, 
  saveTranscript, 
  endCall,
  getCallHistory,
  extractCallData  
} from '../controllers/callController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/web-call', authenticateToken, createWebCall);
router.get('/history', authenticateToken, getCallHistory);
router.post('/extract-data/:callId', authenticateToken, extractCallData); 

// Legacy route for backward compatibility  
router.post('/create-web-call', authenticateToken, createWebCall);

// Public routes (webhooks from Retell - no auth needed)
router.post('/save-transcript', saveTranscript);
router.post('/end-call', endCall);

export default router;