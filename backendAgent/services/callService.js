import Call from '../models/Call.js';

/**
 * Service class for Call-related business logic
 */
class CallService {
  /**
   * Create a new call record
   * @param {Object} callData - Call data
   * @returns {Promise<Object>} Created call
   */
  async createCall({ driverName, phoneNumber, loadNumber, retellCallId, metadata }) {
    try {
      const call = new Call({
        driverName: driverName?.trim(),
        phoneNumber: phoneNumber?.trim(),
        loadNumber: loadNumber?.trim(),
        retellCallId,
        metadata,
        status: 'initiated'
      });

      const savedCall = await call.save();
      console.log('💾 Call saved to database:', savedCall._id);
      return savedCall;
    } catch (error) {
      console.error('❌ Error creating call:', error);
      throw new Error(`Database Error: ${error.message}`);
    }
  }

  /**
   * Get call by ID
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Call record
   */
  async getCallById(callId) {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }
      return call;
    } catch (error) {
      console.error('❌ Error fetching call:', error);
      throw error;
    }
  }

  /**
   * Add transcript to a call
   * @param {string} callId - Call ID
   * @param {string} text - Transcript text
   * @param {string} role - Speaker role (agent/user)
   * @returns {Promise<Object>} Updated call
   */
  async addTranscript(callId, text, role = 'agent') {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      await call.addTranscript(text, role);
      console.log('📝 Transcript added to call:', callId);
      return call;
    } catch (error) {
      console.error('❌ Error adding transcript:', error);
      throw error;
    }
  }

  /**
   * End a call
   * @param {string} callId - Call ID
   * @param {string} finalTranscript - Final transcript (optional)
   * @returns {Promise<Object>} Updated call
   */
  async endCall(callId, finalTranscript) {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      if (finalTranscript) {
        await call.addTranscript(finalTranscript, 'system');
      }

      await call.endCall();
      console.log('📞 Call ended:', callId, `Duration: ${call.formattedDuration}`);
      return call;
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  /**
   * Get recent calls
   * @param {number} limit - Number of calls to fetch
   * @returns {Promise<Array>} List of calls
   */
  async getRecentCalls(limit = 10) {
    try {
      const calls = await Call.getRecentCalls(limit);
      return calls;
    } catch (error) {
      console.error('❌ Error fetching recent calls:', error);
      throw error;
    }
  }

  /**
   * Get calls by driver name
   * @param {string} driverName - Driver name
   * @returns {Promise<Array>} List of calls
   */
  async getCallsByDriver(driverName) {
    try {
      const calls = await Call.findByDriver(driverName);
      return calls;
    } catch (error) {
      console.error('❌ Error fetching calls by driver:', error);
      throw error;
    }
  }

  /**
   * Get call statistics
   * @returns {Promise<Object>} Call statistics
   */
  async getCallStats() {
    try {
      const totalCalls = await Call.countDocuments();
      const activeCalls = await Call.countDocuments({ status: 'active' });
      const completedCalls = await Call.countDocuments({ status: 'ended' });
      const failedCalls = await Call.countDocuments({ status: 'failed' });

      const avgDuration = await Call.aggregate([
        { $match: { duration: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
      ]);

      return {
        totalCalls,
        activeCalls,
        completedCalls,
        failedCalls,
        averageDuration: avgDuration[0]?.avgDuration || 0
      };
    } catch (error) {
      console.error('❌ Error fetching call stats:', error);
      throw error;
    }
  }
}

export default new CallService();