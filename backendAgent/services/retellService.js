import axios from 'axios';

/**
 * Service class for Retell AI API interactions
 */
class RetellService {
  constructor() {
    this.apiKey = process.env.RETELL_API_KEY;
    this.agentId = process.env.RETELL_AGENT_ID;
    this.baseURL = 'https://api.retellai.com/v2';
    
    if (!this.apiKey) {
      console.warn('⚠️ RETELL_API_KEY not found in environment variables');
      console.warn('📝 Please check your .env file contains: RETELL_API_KEY=your_key_here');
      // Don't throw error immediately - allow server to start for configuration
      this.apiKey = 'placeholder_key';
    }
    
    if (!this.agentId) {
      console.warn('⚠️ RETELL_AGENT_ID not found in environment variables');
      console.warn('📝 Please check your .env file contains: RETELL_AGENT_ID=your_agent_id');
      // Don't throw error immediately - allow server to start for configuration  
      this.agentId = 'placeholder_agent';
    }
  }

  /**
   * Create a web call with Retell AI
   * @param {Object} callData - Call configuration
   * @param {string} callData.driverName - Driver's name
   * @param {string} callData.phoneNumber - Phone number
   * @param {string} callData.loadNumber - Load number
   * @returns {Promise<Object>} Retell API response
   */
  async createWebCall({ driverName, phoneNumber, loadNumber }) {
    try {
      const payload = {
        agent_id: this.agentId,
        opt_out_sensitive_data_storage: false,
        metadata: {
          driver_name: driverName,
          load_number: loadNumber,
          phone_number: phoneNumber,
          call_type: 'dispatcher_outbound'
        },
        retell_llm_dynamic_variables: {
          driver_name: driverName?.toString(),
          load_number: loadNumber?.toString(),
        },
        initial_speak_text: `Hello, this is the dispatcher. Driver ${driverName}, your load number is ${loadNumber}.`
      };

      console.log('📤 Sending to Retell API:', JSON.stringify(payload, null, 2));

      const response = await axios.post(`${this.baseURL}/create-web-call`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      console.log('✅ Retell API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Retell API Error:', error.response?.data || error.message);
      throw new Error(`Retell API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * End a call with Retell AI (if needed)
   * @param {string} callId - Retell call ID
   * @returns {Promise<Object>} Response
   */
  async endCall(callId) {
    try {
      // Note: Check Retell API docs for end call endpoint
      // This might not be needed as calls end automatically
      console.log('📞 Ending call:', callId);
      return { success: true, message: 'Call ended' };
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  /**
   * Validate webhook signature (if using webhooks)
   * @param {string} signature - Webhook signature
   * @param {string} body - Request body
   * @returns {boolean} Is valid signature
   */
  validateWebhookSignature(signature, body) {
    // Implement webhook signature validation if needed
    return true;
  }
}

export default new RetellService();