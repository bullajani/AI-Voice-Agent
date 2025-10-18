import express from 'express';
import retellLLMService from '../services/retellLLMService.js';

const router = express.Router();

/**
 * Webhook Routes
 * Handle Retell AI webhook events
 */

// POST /api/webhooks/retell - Main Retell AI webhook endpoint
router.post('/retell', async (req, res) => {
  try {
    console.log('🔔 Received Retell webhook:', req.body.event);

    const response = await retellLLMService.processWebhookEvent(req.body);

    res.json(response);

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

// GET /api/webhooks/health - Webhook health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Webhook endpoints are active',
    timestamp: new Date().toISOString()
  });
});

export default router;