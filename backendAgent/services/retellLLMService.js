import axios from 'axios';
import dotenv from 'dotenv';
import AgentConfig from '../models/AgentConfig.js';

dotenv.config();

/**
 * Retell LLM Service
 * Handles creation and management of Retell AI LLM agents
 */
class RetellLLMService {
  constructor() {
    this.apiKey = process.env.RETELL_API_KEY;
    this.baseURL = 'https://api.retellai.com';
    
    if (!this.apiKey) {
      console.warn('⚠️ RETELL_API_KEY not found in environment variables');
      console.warn('📝 Please check your .env file contains: RETELL_API_KEY=your_key_here');
      this.apiKey = 'placeholder_key';
    }
    
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create a new Retell LLM from agent configuration
   * @param {Object} agentConfig - Agent configuration object
   * @returns {Object} Created LLM response
   */
  async createLLM(agentConfig) {
    try {
      console.log('🤖 Creating Retell LLM for agent:', agentConfig.name);

      // Simplified LLM payload without complex tools to avoid validation errors
      const llmPayload = {
        model: "gpt-4o",
        model_temperature: 0.3,
        general_prompt: agentConfig.generalPrompt,
        begin_message: agentConfig.beginMessage,
        default_dynamic_variables: {
          driver_name: "{{driver_name}}",
          load_number: "{{load_number}}",
          phone_number: "{{phone_number}}"
        }
      };

      console.log('📤 Sending LLM creation request to Retell AI...');
      
      const response = await axios.post(
        `${this.baseURL}/create-retell-llm`,
        llmPayload,
        { headers: this.headers }
      );

      console.log('✅ Retell LLM created successfully:', response.data.llm_id);
      return response.data;

    } catch (error) {
      console.error('❌ Error creating LLM:', error.response?.data || error.message);
      throw new Error(`Failed to create LLM: ${error.response?.statusText || error.message}`);
    }
  }

  /**
   * Update existing Retell LLM
   * @param {string} llmId - Retell LLM ID
   * @param {Object} agentConfig - Updated agent configuration
   * @returns {Object} Update response
   */
  async updateLLM(llmId, agentConfig) {
    try {
      console.log('🔄 Updating Retell LLM:', llmId);

      const updatePayload = {
        model: "gpt-4o",
        model_temperature: 0.3,
        general_prompt: agentConfig.generalPrompt,
        begin_message: agentConfig.beginMessage,
        default_dynamic_variables: {
          driver_name: "{{driver_name}}",
          load_number: "{{load_number}}",
          phone_number: "{{phone_number}}"
        }
      };
      
      const response = await axios.patch(
        `${this.baseURL}/update-retell-llm/${llmId}`,
        updatePayload,
        { headers: this.headers }
      );

      console.log('✅ LLM updated successfully');

      agentConfig.version += 1;
      await agentConfig.save();

      return {
        success: true,
        llm_id: llmId,
        version: agentConfig.version,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error updating Retell LLM:', error.response?.data || error.message);
      throw new Error(`Failed to update LLM: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get LLM details from Retell AI
   * @param {string} llmId - Retell LLM ID
   * @returns {Object} LLM details
   */
  async getLLM(llmId) {
    try {
      console.log('📋 Fetching LLM details:', llmId);

      const response = await axios.get(
        `${this.baseURL}/get-retell-llm/${llmId}`,
        { headers: this.headers }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error fetching LLM:', error.response?.data || error.message);
      throw new Error(`Failed to fetch LLM: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List all Retell LLMs
   * @returns {Object} List of LLMs
   */
  async listLLMs() {
    try {
      console.log('📋 Fetching all LLMs');

      const response = await axios.get(
        `${this.baseURL}/list-retell-llms`,
        { headers: this.headers }
      );

      return {
        success: true,
        llms: response.data
      };

    } catch (error) {
      console.error('❌ Error listing LLMs:', error.response?.data || error.message);
      throw new Error(`Failed to list LLMs: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete Retell LLM
   * @param {string} llmId - Retell LLM ID
   * @returns {Object} Delete response
   */
  async deleteLLM(llmId) {
    try {
      console.log('🗑️ Deleting Retell LLM:', llmId);

      await axios.delete(
        `${this.baseURL}/delete-retell-llm/${llmId}`,
        { headers: this.headers }
      );

      console.log('✅ LLM deleted successfully');

      return { success: true };

    } catch (error) {
      console.error('❌ Error deleting LLM:', error.response?.data || error.message);
      throw new Error(`Failed to delete LLM: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create LLM from agent configuration ID
   * @param {string} agentConfigId - Agent configuration ID
   * @returns {Object} Created LLM response
   */
  async createLLMFromConfig(agentConfigId) {
    try {
      const agentConfig = await AgentConfig.findById(agentConfigId);
      
      if (!agentConfig) {
        throw new Error('Agent configuration not found');
      }

      if (agentConfig.retellLlmId) {
        throw new Error('LLM already exists for this configuration');
      }

      const llmResponse = await this.createLLM(agentConfig);
      
      // Save the LLM ID to the agent config
      agentConfig.retellLlmId = llmResponse.llm_id;
      await agentConfig.save();

      return llmResponse;

    } catch (error) {
      console.error('❌ Error creating LLM from config:', error.message);
      throw error;
    }
  }

  /**
   * Create Retell AI Agent (uses the LLM)
   * @param {Object} agentConfig - AgentConfig model instance
   * @returns {Object} - Retell agent response
   */
  async createAgent(agentConfig) {
    try {
      if (!agentConfig.retellLlmId) {
        throw new Error('LLM must be created first before creating agent');
      }

      console.log('🤖 Creating Retell AI Agent for:', agentConfig.name);

      const agentPayload = {
        response_engine: {
          type: 'retell-llm',
          llm_id: agentConfig.retellLlmId
        },
        agent_name: agentConfig.name,
        voice_id: '11labs-Adrian',
        voice_temperature: 0.8,
        voice_speed: 1.0,
        responsiveness: 0.9,
        interruption_sensitivity: 0.8,
        enable_backchannel: true,
        language: 'en-US',
        end_call_after_silence_ms: 120000,
        max_call_duration_ms: 1800000,
        webhook_url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:8080'}/api/webhooks/retell`
      };

      console.log('📡 Creating agent with payload:', agentPayload);

      const response = await axios.post(
        `${this.baseURL}/create-agent`,
        agentPayload,
        { headers: this.headers }
      );

      // Update the agent config with the Retell agent ID
      agentConfig.retellAgentId = response.data.agent_id;
      await agentConfig.save();

      console.log('✅ Retell AI Agent created successfully:', response.data.agent_id);

      return response.data;

    } catch (error) {
      console.error('❌ Error creating Retell AI Agent:', error.response?.data || error.message);
      throw new Error(`Failed to create Retell agent: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a web call with specific agent configuration
   * @param {string} agentConfigId - Agent configuration ID
   * @param {Object} callData - Call data (driver name, phone, etc.)
   * @returns {Object} Web call response
   */
  async createWebCallWithAgent(agentConfigId, callData) {
    try {
      const agentConfig = await AgentConfig.findById(agentConfigId);
      
      if (!agentConfig) {
        throw new Error('Agent configuration not found');
      }

      // Ensure LLM exists
      if (!agentConfig.retellLlmId) {
        console.log('📝 No LLM exists, creating one...');
        await this.createLLMFromConfig(agentConfigId);
        // Reload the config to get the updated LLM ID
        await agentConfig.reload();
      }

      // Ensure Agent exists
      if (!agentConfig.retellAgentId) {
        console.log('📝 No agent exists, creating one...');
        await this.createAgent(agentConfig);
        // Reload the config to get the updated Agent ID
        await agentConfig.reload();
      }

      // Prepare dynamic variables
      const dynamicVariables = {
        driver_name: callData.driverName || 'Driver',
        phone_number: callData.phoneNumber || '',
        load_number: callData.loadNumber || 'Unknown'
      };

      console.log('📞 Creating web call with agent:', agentConfig.name);

      const callPayload = {
        agent_id: agentConfig.retellAgentId,
        retell_llm_dynamic_variables: dynamicVariables,
        metadata: {
          agent_config_id: agentConfigId,
          scenario: agentConfig.scenario,
          driver_name: callData.driverName,
          load_number: callData.loadNumber
        }
      };

      console.log('📡 Calling Retell API with payload:', callPayload);

      const response = await axios.post(
        `${this.baseURL}/v2/create-web-call`,
        callPayload,
        { headers: this.headers }
      );

      console.log('✅ Web call created successfully:', response.data.call_id);

      return {
        success: true,
        call_id: response.data.call_id,
        access_token: response.data.access_token,
        web_call_link: response.data.web_call_link,
        agent_config: {
          id: agentConfig._id,
          name: agentConfig.name,
          scenario: agentConfig.scenario
        },
        dynamic_variables: dynamicVariables
      };

    } catch (error) {
      console.error('❌ Error creating web call with agent:', error.response?.data || error.message);
      throw new Error(`Failed to create web call: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process webhook event from Retell AI
   * @param {Object} webhookData - Webhook event data
   * @returns {Object} Response data
   */
  async processWebhookEvent(webhookData) {
    try {
      const { event, call } = webhookData;
      
      console.log('🔔 Processing webhook event:', event);

      switch (event) {
        case 'call_started':
          return await this.handleCallStarted(call);
        
        case 'call_ended':
          return await this.handleCallEnded(call);
        
        case 'call_analyzed':
          return await this.handleCallAnalyzed(call);
        
        case 'tool_call':
          return await this.handleToolCall(webhookData);
        
        default:
          console.log('ℹ️ Unhandled webhook event:', event);
          return { success: true, message: 'Event received' };
      }

    } catch (error) {
      console.error('❌ Error processing webhook:', error.message);
      throw error;
    }
  }

  /**
   * Handle call started event
   * @param {Object} call - Call data
   * @returns {Object} Response
   */
  async handleCallStarted(call) {
    console.log('🟢 Call started:', call.call_id);
    
    return {
      success: true,
      message: 'Call started successfully',
      next_action: 'continue'
    };
  }

  /**
   * Handle call ended event
   * @param {Object} call - Call data
   * @returns {Object} Response
   */
  async handleCallEnded(call) {
    console.log('🔴 Call ended:', call.call_id);
    
    return {
      success: true,
      message: 'Call ended, processing data'
    };
  }

  /**
   * Handle call analyzed event
   * @param {Object} call - Call data with analysis
   * @returns {Object} Response
   */
  async handleCallAnalyzed(call) {
    console.log('📊 Call analyzed:', call.call_id);
    
    return {
      success: true,
      structured_data: call.analysis || {},
      message: 'Call analysis processed'
    };
  }

  /**
   * Handle tool call event
   * @param {Object} webhookData - Webhook data with tool call
   * @returns {Object} Tool response
   */
  async handleToolCall(webhookData) {
    const { tool_call } = webhookData;
    console.log('🔧 Tool call:', tool_call.name);

    switch (tool_call.name) {
      case 'collect_structured_data':
        return await this.handleDataCollection(tool_call.arguments);
      
      case 'detect_emergency':
        return await this.handleEmergencyDetection(tool_call.arguments);
      
      default:
        return {
          success: true,
          result: 'Tool call processed'
        };
    }
  }

  /**
   * Handle structured data collection
   * @param {Object} data - Collected data
   * @returns {Object} Response
   */
  async handleDataCollection(data) {
    console.log('📝 Collecting structured data:', data);
    
    return {
      success: true,
      collected_data: data,
      message: 'Data collected successfully'
    };
  }

  /**
   * Handle emergency detection
   * @param {Object} emergencyData - Emergency data
   * @returns {Object} Response
   */
  async handleEmergencyDetection(emergencyData) {
    console.log('🚨 Emergency detected:', emergencyData);
    
    if (emergencyData.emergency_detected) {
      return {
        success: true,
        emergency_response: {
          escalate: true,
          priority: emergencyData.urgency_level,
          transfer_to_human: true
        },
        message: 'Emergency protocol activated'
      };
    }

    return {
      success: true,
      emergency_response: {
        escalate: false
      },
      message: 'No emergency detected'
    };
  }
}

export default new RetellLLMService();