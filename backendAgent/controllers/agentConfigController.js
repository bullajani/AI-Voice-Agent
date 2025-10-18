import AgentConfig from '../models/AgentConfig.js';
import retellLLMService from '../services/retellLLMService.js';

/**
 * Create a new agent configuration
 */
export const createAgent = async (req, res) => {
  try {
    const {
      name,
      description,
      scenario,
      generalPrompt,
      beginMessage,
      voiceSettings,
      states,
      tools,
      dynamicVariables
    } = req.body;

    console.log('🤖 Creating agent configuration:', name);

    // Validate required fields
    if (!name || !generalPrompt || !beginMessage) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, general prompt, and begin message are required'
      });
    }

    // Create agent configuration in database ONLY (not Retell AI yet)
    const agentConfig = new AgentConfig({
      name,
      description: description || '',
      scenario: scenario || 'general',
      generalPrompt,
      beginMessage,
      voiceSettings: voiceSettings || {
        voiceId: '11labs-Adrian',
        speed: 1.0,
        temperature: 0.8
      },
      states: states || [],
      tools: tools || [],
      dynamicVariables: dynamicVariables ? new Map(Object.entries(dynamicVariables)) : new Map(),
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedAgent = await agentConfig.save();
    console.log('✅ Agent configuration created:', savedAgent._id);

    res.status(201).json({
      success: true,
      message: 'Agent configuration created successfully',
      data: {
        id: savedAgent._id,
        name: savedAgent.name,
        description: savedAgent.description,
        scenario: savedAgent.scenario,
        hasRetellLlm: !!savedAgent.retellLlmId,
        hasRetellAgent: !!savedAgent.retellAgentId,
        createdAt: savedAgent.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating agent configuration:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check the following fields:',
        validation_errors: validationErrors
      });
    }

    res.status(500).json({
      error: 'Failed to create agent configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get all agent configurations
 */
export const getAgents = async (req, res) => {
  try {
    const { scenario, active } = req.query;
    
    console.log('📋 Fetching agent configurations');

    let filter = {};
    if (scenario) filter.scenario = scenario;
    if (active !== undefined) filter.isActive = active === 'true';

    const agents = await AgentConfig.find(filter)
      .sort({ createdAt: -1 })
      .select('name description scenario isActive isPublished version usageCount lastUsed createdAt retellLlmId retellAgentId');

    const formattedAgents = agents.map(agent => ({
      id: agent._id,
      name: agent.name,
      description: agent.description,
      scenario: agent.scenario,
      hasRetellLlm: !!agent.retellLlmId,
      hasRetellAgent: !!agent.retellAgentId,
      version: agent.version,
      isActive: agent.isActive,
      isPublished: agent.isPublished,
      usageCount: agent.usageCount,
      lastUsed: agent.lastUsed,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    }));

    res.json({
      success: true,
      data: formattedAgents,
      count: formattedAgents.length
    });

  } catch (error) {
    console.error('❌ Error fetching agents:', error);
    res.status(500).json({
      error: 'Failed to fetch agent configurations',
      message: error.message
    });
  }
};

/**
 * Get single agent configuration by ID
 */
export const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📋 Fetching agent configuration:', id);

    const agent = await AgentConfig.findById(id);
    if (!agent) {
      return res.status(404).json({ 
        error: 'Agent configuration not found',
        message: `No agent found with ID: ${id}`
      });
    }

    // Convert Map to Object for frontend
    const dynamicVariablesObj = {};
    if (agent.dynamicVariables) {
      agent.dynamicVariables.forEach((value, key) => {
        dynamicVariablesObj[key] = value;
      });
    }

    res.json({
      success: true,
      data: {
        id: agent._id,
        name: agent.name,
        description: agent.description,
        scenario: agent.scenario,
        generalPrompt: agent.generalPrompt,
        beginMessage: agent.beginMessage,
        voiceSettings: agent.voiceSettings,
        states: agent.states,
        tools: agent.tools,
        dynamicVariables: dynamicVariablesObj,
        retellLlmId: agent.retellLlmId,
        retellAgentId: agent.retellAgentId,
        hasRetellLlm: !!agent.retellLlmId,
        hasRetellAgent: !!agent.retellAgentId,
        version: agent.version,
        isActive: agent.isActive,
        isPublished: agent.isPublished,
        usageCount: agent.usageCount,
        lastUsed: agent.lastUsed,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching agent:', error);
    res.status(500).json({
      error: 'Failed to fetch agent configuration',
      message: error.message
    });
  }
};

/**
 * Update agent configuration
 */
export const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔄 Updating agent configuration:', id);

    const agent = await AgentConfig.findById(id);
    if (!agent) {
      return res.status(404).json({ 
        error: 'Agent configuration not found',
        message: `No agent found with ID: ${id}`
      });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key === 'dynamicVariables' && updateData[key]) {
        agent[key] = new Map(Object.entries(updateData[key]));
      } else if (updateData[key] !== undefined) {
        agent[key] = updateData[key];
      }
    });

    agent.updatedAt = new Date();
    agent.version += 1;

    const savedAgent = await agent.save();

    res.json({
      success: true,
      message: 'Agent configuration updated successfully',
      data: {
        id: savedAgent._id,
        version: savedAgent.version,
        updatedAt: savedAgent.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error updating agent:', error);
    res.status(500).json({
      error: 'Failed to update agent configuration',
      message: error.message
    });
  }
};

/**
 * Delete agent configuration
 */
export const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting agent configuration:', id);

    const agent = await AgentConfig.findById(id);
    if (!agent) {
      return res.status(404).json({ 
        error: 'Agent configuration not found',
        message: `No agent found with ID: ${id}`
      });
    }

    await AgentConfig.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Agent configuration deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting agent:', error);
    res.status(500).json({
      error: 'Failed to delete agent configuration',
      message: error.message
    });
  }
};

/**
 * Create Retell LLM for existing agent config
 */
export const createLLM = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🤖 Creating Retell LLM for agent:', id);

    const agentConfig = await AgentConfig.findById(id);
    if (!agentConfig) {
      return res.status(404).json({ 
        error: 'Agent configuration not found',
        message: `No agent configuration found with ID: ${id}`
      });
    }

    if (agentConfig.retellLlmId) {
      return res.status(400).json({
        error: 'LLM already exists',
        message: 'This agent already has a Retell LLM created',
        llm_id: agentConfig.retellLlmId
      });
    }

    // Create LLM in Retell AI
    const llmResponse = await retellLLMService.createLLM(agentConfig);
    
    // Update agent config with LLM ID
    agentConfig.retellLlmId = llmResponse.llm_id;
    agentConfig.updatedAt = new Date();
    await agentConfig.save();

    res.json({
      success: true,
      message: 'Retell LLM created successfully',
      llm_id: llmResponse.llm_id,
      agent_config_id: agentConfig._id
    });

  } catch (error) {
    console.error('❌ Error creating Retell LLM:', error);
    res.status(500).json({
      error: 'Failed to create Retell LLM',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Create Retell Agent for existing agent config
 */
export const createRetellAgent = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🤖 Creating Retell Agent for config:', id);

    const agentConfig = await AgentConfig.findById(id);
    if (!agentConfig) {
      return res.status(404).json({ 
        error: 'Agent configuration not found',
        message: `No agent configuration found with ID: ${id}`
      });
    }

    if (!agentConfig.retellLlmId) {
      return res.status(400).json({
        error: 'LLM required',
        message: 'Please create a Retell LLM first before creating the agent'
      });
    }

    if (agentConfig.retellAgentId) {
      return res.status(400).json({
        error: 'Agent already exists',
        message: 'This configuration already has a Retell Agent created',
        agent_id: agentConfig.retellAgentId
      });
    }

    // Create Agent in Retell AI
    const agentResponse = await retellLLMService.createAgent(agentConfig);
    
    res.json({
      success: true,
      message: 'Retell Agent created successfully',
      agent_id: agentResponse.agent_id,
      agent_config_id: agentConfig._id
    });

  } catch (error) {
    console.error('❌ Error creating Retell Agent:', error);
    res.status(500).json({
      error: 'Failed to create Retell Agent',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Test agent with web call
 */
export const testAgent = async (req, res) => {
  try {
    const { id } = req.params; // This is the agent config ID
    const { phoneNumber, driverName, loadNumber } = req.body;

    console.log(`🧪 Testing agent ${id} with:`, { phoneNumber, driverName, loadNumber });

    const agentConfig = await AgentConfig.findById(id);
    if (!agentConfig) {
      return res.status(404).json({ 
        error: 'Agent configuration not found',
        message: `No agent found with ID: ${id}`
      });
    }

    // Check if agent has been created in Retell AI
    if (!agentConfig.retellAgentId) {
      return res.status(400).json({
        error: 'Retell Agent required',
        message: 'Please create a Retell Agent first before testing'
      });
    }

    console.log('✅ Agent config found:', {
      name: agentConfig.name,
      retellAgentId: agentConfig.retellAgentId,
      hasRetellLlm: !!agentConfig.retellLlmId
    });

    // Create web call data with the agent config ID
    const webCallData = {
      driverName,
      loadNumber,
      phoneNumber,
      agentConfigId: id // Include the agent config ID
    };

    console.log('🔄 Creating web call with data:', webCallData);

    // Call the web call endpoint directly
    const webCallResponse = await fetch(`http://localhost:8080/api/calls/create-web-call`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webCallData)
    });

    const webCallResult = await webCallResponse.json();
    console.log('📥 Web call response:', webCallResult);

    if (!webCallResponse.ok) {
      console.error('❌ Web call failed:', webCallResult);
      throw new Error(`Web call failed: ${webCallResult.error || 'Unknown error'}`);
    }

    res.json({
      success: true,
      message: 'Test call initiated successfully',
      call_id: webCallResult.call_id,
      web_call_link: webCallResult.web_call_link,
      access_token: webCallResult.access_token,
      agent_config: {
        id: agentConfig._id,
        name: agentConfig.name
      }
    });

  } catch (error) {
    console.error('❌ Test agent failed:', error);
    res.status(500).json({
      error: 'Failed to create test call',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Create default agent configurations
 */
export const createDefaults = async (req, res) => {
  try {
    console.log('🏭 Creating default agent configurations');

    // Check if defaults already exist
    const existingConfigs = await AgentConfig.countDocuments();
    
    if (existingConfigs > 0) {
      return res.status(400).json({
        error: 'Default configurations already exist',
        message: 'Use reset endpoint to recreate defaults'
      });
    }

    // Create default driver check-in agent
    const driverCheckinAgent = new AgentConfig({
      name: 'Driver Check-in Agent',
      description: 'Handles driver check-ins and status updates',
      scenario: 'driver_checkin',
      beginMessage: 'Hello! This is dispatch. I need to get your current status and location for today\'s load.',
      generalPrompt: 'You are a professional dispatch coordinator handling driver check-ins. Collect location, status, ETA updates, and any issues. Be efficient and helpful.',
      
      dynamicVariables: new Map([
        ['driver_name', 'Driver'],
        ['load_number', 'Unknown']
      ]),
      
      states: [],
      tools: [],
      
      version: 1,
      isActive: true,
      isPublished: true
    });

    await driverCheckinAgent.save();

    // Create default emergency protocol agent
    const emergencyAgent = new AgentConfig({
      name: 'Emergency Protocol Agent',
      description: 'Handles emergency situations and escalates to human dispatchers',
      scenario: 'emergency_protocol',
      beginMessage: 'I understand this is an emergency. I need to gather some quick information to get you the right help immediately.',
      generalPrompt: 'You are an emergency response agent. Your priority is safety. Quickly gather essential information and escalate to human dispatchers. Stay calm, be efficient, and prioritize getting help.',
      
      dynamicVariables: new Map([
        ['driver_name', 'Driver'],
        ['emergency_type', 'Unknown']
      ]),
      
      states: [],
      tools: [],
      
      version: 1,
      isActive: true,
      isPublished: true
    });

    await emergencyAgent.save();

    res.status(201).json({
      success: true,
      message: 'Default agent configurations created successfully',
      data: [
        {
          id: driverCheckinAgent._id,
          name: driverCheckinAgent.name,
          scenario: driverCheckinAgent.scenario
        },
        {
          id: emergencyAgent._id,
          name: emergencyAgent.name,
          scenario: emergencyAgent.scenario
        }
      ]
    });

  } catch (error) {
    console.error('❌ Error creating default configurations:', error);
    res.status(500).json({
      error: 'Failed to create default configurations',
      message: error.message
    });
  }
};

/**
 * Get Retell LLM details
 */
export const getLLMDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📋 Fetching LLM details for agent:', id);

    const agent = await AgentConfig.findById(id);

    if (!agent) {
      return res.status(404).json({
        error: 'Agent configuration not found'
      });
    }

    if (!agent.retellLlmId) {
      return res.status(404).json({
        error: 'No Retell LLM found for this agent',
        message: 'Create an LLM first using POST /:id/create-llm'
      });
    }

    const llmDetails = await retellLLMService.getLLM(agent.retellLlmId);

    res.json({
      success: true,
      data: {
        agent: {
          id: agent._id,
          name: agent.name,
          scenario: agent.scenario
        },
        llm: llmDetails.data
      }
    });

  } catch (error) {
    console.error('❌ Error fetching LLM details:', error);
    res.status(500).json({
      error: 'Failed to fetch LLM details',
      message: error.message
    });
  }
};

/**
 * Get agent usage statistics
 */
export const getAgentStats = async (req, res) => {
  try {
    console.log('📊 Fetching agent statistics');

    const stats = await AgentConfig.aggregate([
      {
        $group: {
          _id: null,
          totalAgents: { $sum: 1 },
          activeAgents: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          publishedAgents: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
          },
          totalUsage: { $sum: '$usageCount' }
        }
      }
    ]);

    const scenarioStats = await AgentConfig.aggregate([
      {
        $group: {
          _id: '$scenario',
          count: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' }
        }
      }
    ]);

    const recentlyUsed = await AgentConfig.find({ lastUsed: { $ne: null } })
      .sort({ lastUsed: -1 })
      .limit(5)
      .select('name scenario lastUsed usageCount');

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalAgents: 0,
          activeAgents: 0,
          publishedAgents: 0,
          totalUsage: 0
        },
        byScenario: scenarioStats,
        recentlyUsed: recentlyUsed.map(agent => ({
          id: agent._id,
          name: agent.name,
          scenario: agent.scenario,
          lastUsed: agent.lastUsed,
          usageCount: agent.usageCount
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching agent statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch agent statistics',
      message: error.message
    });
  }
};