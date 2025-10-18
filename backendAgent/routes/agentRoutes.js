import express from 'express';
import {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent as configDeleteAgent,
  createLLM,
  createRetellAgent,
  testAgent,
  createDefaults,
  getLLMDetails,
  getAgentStats
} from '../controllers/agentConfigController.js';
import { deleteAgent } from '../controllers/agentConfigController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { createWebCall } from '../controllers/callController.js';
import AgentConfig from '../models/AgentConfig.js';

const router = express.Router();

/**
 * Agent Configuration Routes
 * All routes for managing LLM agent configurations
 */

// POST /api/agents - Create new agent configuration
router.post('/', createAgent);

// GET /api/agents - Get all agent configurations  
router.get('/', getAgents);

// GET /api/agents/stats - Get agent usage statistics
router.get('/stats', getAgentStats);

// POST /api/agents/defaults - Create default agent configurations
router.post('/defaults', createDefaults);

// GET /api/agents/:id - Get specific agent configuration
router.get('/:id', getAgentById);

// PUT /api/agents/:id - Update agent configuration
router.put('/:id', updateAgent);

// DELETE /api/agents/:id - Delete agent configuration
router.delete('/:id', deleteAgent);

// POST /api/agents/:id/create-llm - Create Retell LLM from configuration
router.post('/:id/create-llm', createLLM);

// POST /api/agents/:id/create-agent - Create Retell Agent from configuration  
router.post('/:id/create-agent', createRetellAgent);

// GET /api/agents/:id/llm - Get LLM details
router.get('/:id/llm', getLLMDetails);

// POST /api/agents/:id/test - Test agent with web call
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName, phoneNumber, loadNumber } = req.body;

    console.log('🧪 Testing agent:', id, 'with data:', req.body);

    // Find the agent
    const agent = await AgentConfig.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    console.log('🔍 Agent found:', {
      name: agent.name,
      hasRetellAgent: agent.hasRetellAgent,
      retellAgentId: agent.retellAgentId
    });

    // Check if agent has retell agent OR retell agent ID
    if (!agent.hasRetellAgent && !agent.retellAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent not ready for testing. Please create Retell agent first.'
      });
    }

    // Create test call data
    const callData = {
      driverName: driverName || 'Test Driver',
      phoneNumber: phoneNumber || '+1234567890',
      loadNumber: loadNumber || 'TEST123',
      agentConfigId: id
    };

    console.log('🚀 Creating test call with data:', callData);

    // Create a mock request object for createWebCall
    const mockReq = {
      body: callData,
      userId: req.userId
    };

    // Create mock response object to capture the result
    let testResult = null;
    const mockRes = {
      json: (data) => {
        testResult = data;
        return mockRes;
      },
      status: (code) => {
        return mockRes;
      }
    };

    // Call the createWebCall function
    await createWebCall(mockReq, mockRes);

    // Return the result to the frontend
    if (testResult && testResult.success) {
      return res.json({
        success: true,
        message: 'Test call created successfully',
        call_id: testResult.callId,
        access_token: testResult.accessToken,
        agent_name: agent.name
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create test call'
      });
    }

  } catch (error) {
    console.error('❌ Test agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test agent: ' + error.message
    });
  }
});

// Debug route to check agent status
router.get('/:id/debug', async (req, res) => {
  try {
    const agent = await AgentConfig.findById(req.params.id);
    res.json({
      found: !!agent,
      hasRetellAgent: agent?.hasRetellAgent,
      retellAgentId: agent?.retellAgentId,
      name: agent?.name,
      fullAgent: agent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;