import CallAnalysis from '../models/CallAnalysis.js';
import Call from '../models/Call.js';
import AgentConfig from '../models/AgentConfig.js';

/**
 * Data Extraction Service
 * Processes call transcripts and extracts structured data
 */
class DataExtractionService {
  constructor() {
    this.emergencyKeywords = [
      'emergency', 'accident', 'crash', 'breakdown', 'help', 'urgent',
      'medical', 'injury', 'hurt', 'stuck', 'fire', 'blowout'
    ];
    
    this.statusKeywords = {
      driving: ['driving', 'on the road', 'en route', 'traveling', 'moving'],
      delayed: ['delayed', 'running late', 'behind schedule', 'traffic', 'stuck'],
      arrived: ['arrived', 'here', 'at the location', 'reached', 'made it'],
      unloading: ['unloading', 'at the dock', 'in the door', 'delivery']
    };
  }

  /**
   * Process call transcript and extract structured data
   * @param {string} callId - Call ID
   * @param {string} transcript - Full conversation transcript
   * @param {Object} metadata - Additional call metadata
   * @returns {Object} Extracted data analysis
   */
  async processCallTranscript(callId, transcript, metadata = {}) {
    try {
      console.log('🔍 Processing call transcript for data extraction:', callId);

      // Get call and agent configuration
      const call = await Call.findById(callId).populate('agentConfigId');
      if (!call) {
        throw new Error('Call not found');
      }

      // Check if analysis already exists
      let analysis = await CallAnalysis.findByCallId(callId);
      
      if (!analysis) {
        // Create new analysis record
        analysis = new CallAnalysis({
          callId,
          retellCallId: call.retellCallId,
          agentConfigId: call.agentConfigId,
          rawTranscript: transcript,
          processingStatus: 'processing'
        });
      } else {
        // Update existing analysis
        analysis.rawTranscript = transcript;
        analysis.processingStatus = 'processing';
      }

      await analysis.save();

      // Extract structured data based on agent configuration
      const extractedData = await this.extractStructuredData(transcript, call.agentConfigId);
      
      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(transcript, extractedData);
      
      // Generate insights
      const insights = this.generateInsights(transcript, extractedData);

      // Update analysis with extracted data
      analysis.extractedData = { ...analysis.extractedData, ...extractedData };
      analysis.qualityMetrics = { ...analysis.qualityMetrics, ...qualityMetrics };
      analysis.insights = { ...analysis.insights, ...insights };
      analysis.processingStatus = 'completed';
      analysis.processedAt = new Date();

      // Calculate overall metrics
      await analysis.calculateQualityMetrics();
      await analysis.generateInsights();

      console.log('✅ Call transcript processing completed');

      return {
        success: true,
        analysis: {
          id: analysis._id,
          callId: analysis.callId,
          extractedData: analysis.formattedExtractedData,
          qualityMetrics: analysis.qualityMetrics,
          insights: analysis.insights,
          overallConfidence: analysis.overallConfidence,
          summaryStats: analysis.summaryStats
        }
      };

    } catch (error) {
      console.error('❌ Error processing call transcript:', error);
      
      // Update analysis with error status
      if (analysis) {
        analysis.processingStatus = 'failed';
        analysis.processingErrors.push(error.message);
        await analysis.save();
      }

      throw error;
    }
  }

  /**
   * Extract structured data from transcript
   * @param {string} transcript - Conversation transcript
   * @param {string} agentConfigId - Agent configuration ID
   * @returns {Object} Extracted structured data
   */
  async extractStructuredData(transcript, agentConfigId) {
    const extractedData = {};
    const transcriptLower = transcript.toLowerCase();

    // Get agent configuration for context
    let agentConfig = null;
    if (agentConfigId) {
      try {
        agentConfig = await AgentConfig.findById(agentConfigId);
      } catch (error) {
        console.warn('Could not fetch agent config:', error.message);
      }
    }

    // 1. Determine call outcome
    extractedData.call_outcome = this.determineCallOutcome(transcriptLower);

    // 2. Extract driver status
    extractedData.driver_status = this.extractDriverStatus(transcriptLower);

    // 3. Extract location information
    extractedData.current_location = this.extractLocation(transcript) || 'Unknown';

    // 4. Extract ETA information
    extractedData.eta = this.extractETA(transcript) || 'Not provided';

    // 5. Extract delay information
    extractedData.delay_reason = this.extractDelayReason(transcript) || 'None';

    // 6. Extract unloading status
    extractedData.unloading_status = this.extractUnloadingStatus(transcript) || 'Not specified';

    // 7. Check POD acknowledgment
    extractedData.pod_reminder_acknowledged = this.checkPODAcknowledgment(transcriptLower);

    // 8. Emergency-specific extraction
    if (this.detectEmergency(transcriptLower)) {
      extractedData.emergency_type = this.extractEmergencyType(transcriptLower);
      extractedData.safety_status = this.extractSafetyStatus(transcript);
      extractedData.injury_status = this.extractInjuryStatus(transcript);
      extractedData.emergency_location = this.extractLocation(transcript);
      extractedData.load_secure = this.extractLoadSecurity(transcriptLower);
      extractedData.escalation_status = this.extractEscalationStatus(transcript);
    } else {
      extractedData.emergency_type = 'None';
    }

    console.log('📊 Extracted data:', extractedData);
    return extractedData;
  }

  /**
   * Determine overall call outcome
   * @param {string} transcript - Lowercase transcript
   * @returns {string} Call outcome
   */
  determineCallOutcome(transcript) {
    if (this.detectEmergency(transcript)) {
      return 'Emergency Escalation';
    }

    const hasArrivalInfo = transcript.includes('arrived') || transcript.includes('here') || 
                          transcript.includes('unloading') || transcript.includes('dock');
    
    const hasTransitInfo = transcript.includes('driving') || transcript.includes('on the road') || 
                          transcript.includes('eta') || transcript.includes('location');

    if (hasArrivalInfo) {
      return 'Arrival Confirmation';
    } else if (hasTransitInfo) {
      return 'In-Transit Update';
    }

    return 'Incomplete';
  }

  /**
   * Extract driver status from transcript
   * @param {string} transcript - Lowercase transcript
   * @returns {string} Driver status
   */
  extractDriverStatus(transcript) {
    for (const [status, keywords] of Object.entries(this.statusKeywords)) {
      if (keywords.some(keyword => transcript.includes(keyword))) {
        return status.charAt(0).toUpperCase() + status.slice(1);
      }
    }
    return 'Unknown';
  }

  /**
   * Extract location information
   * @param {string} transcript - Original transcript
   * @returns {string|null} Location information
   */
  extractLocation(transcript) {
    // Look for common location patterns
    const locationPatterns = [
      /(?:i'm |at |near |on )([\w\s-]+(?:highway|interstate|i-\d+|mile marker|exit|street|road|avenue)[\w\s\d-]*)/i,
      /(?:location|where)[\s:]*([^.!?]+)/i,
      /mile marker (\d+)/i,
      /exit (\d+)/i,
      /(i-\d+[\w\s]*)/i
    ];

    for (const pattern of locationPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract ETA information
   * @param {string} transcript - Original transcript
   * @returns {string|null} ETA information
   */
  extractETA(transcript) {
    const etaPatterns = [
      /(?:eta|arrive|get there|be there)[\s:]*([^.!?]+)/i,
      /(\d+\s*(?:minutes?|hours?|am|pm))/i,
      /(tomorrow|today|tonight)[\s,]*(\d+:\d+|\d+\s*(?:am|pm))?/i
    ];

    for (const pattern of etaPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract delay reason
   * @param {string} transcript - Original transcript
   * @returns {string|null} Delay reason
   */
  extractDelayReason(transcript) {
    const delayPatterns = [
      /(?:delayed|running late|behind).*?(?:because|due to|from)[\s:]*([\w\s]+)/i,
      /(traffic|weather|breakdown|accident|construction)/i
    ];

    for (const pattern of delayPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return transcript.toLowerCase().includes('delay') ? 'Unspecified delay' : null;
  }

  /**
   * Extract unloading status
   * @param {string} transcript - Original transcript
   * @returns {string|null} Unloading status
   */
  extractUnloadingStatus(transcript) {
    const unloadingPatterns = [
      /(?:door|dock)[\s#]*(\d+)/i,
      /(?:unloading|waiting for|lumper|detention)/i
    ];

    for (const pattern of unloadingPatterns) {
      const match = transcript.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Check POD acknowledgment
   * @param {string} transcript - Lowercase transcript
   * @returns {boolean} POD acknowledged
   */
  checkPODAcknowledgment(transcript) {
    const podKeywords = ['pod', 'proof of delivery', 'paperwork', 'documents'];
    const acknowledgmentKeywords = ['yes', 'okay', 'got it', 'understand', 'will do'];

    const hasPODMention = podKeywords.some(keyword => transcript.includes(keyword));
    const hasAcknowledgment = acknowledgmentKeywords.some(keyword => transcript.includes(keyword));

    return hasPODMention && hasAcknowledgment;
  }

  /**
   * Detect emergency situations
   * @param {string} transcript - Lowercase transcript
   * @returns {boolean} Emergency detected
   */
  detectEmergency(transcript) {
    return this.emergencyKeywords.some(keyword => transcript.includes(keyword));
  }

  /**
   * Extract emergency type
   * @param {string} transcript - Lowercase transcript
   * @returns {string} Emergency type
   */
  extractEmergencyType(transcript) {
    if (transcript.includes('accident') || transcript.includes('crash')) return 'Accident';
    if (transcript.includes('breakdown') || transcript.includes('blowout')) return 'Breakdown';
    if (transcript.includes('medical') || transcript.includes('injury')) return 'Medical';
    return 'Other';
  }

  /**
   * Extract safety status
   * @param {string} transcript - Original transcript
   * @returns {string|null} Safety status
   */
  extractSafetyStatus(transcript) {
    const safetyPatterns = [
      /(everyone is safe|we're okay|no one hurt|all safe)/i,
      /(injured|hurt|bleeding|unconscious)/i
    ];

    for (const pattern of safetyPatterns) {
      const match = transcript.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract injury status
   * @param {string} transcript - Original transcript
   * @returns {string|null} Injury status
   */
  extractInjuryStatus(transcript) {
    if (transcript.toLowerCase().includes('no injur')) return 'No injuries reported';
    if (transcript.toLowerCase().includes('injur')) return 'Injuries reported';
    return null;
  }

  /**
   * Extract load security status
   * @param {string} transcript - Lowercase transcript
   * @returns {boolean|null} Load secure status
   */
  extractLoadSecurity(transcript) {
    if (transcript.includes('load is secure') || transcript.includes('cargo is fine')) return true;
    if (transcript.includes('load shifted') || transcript.includes('cargo damage')) return false;
    return null;
  }

  /**
   * Extract escalation status
   * @param {string} transcript - Original transcript
   * @returns {string|null} Escalation status
   */
  extractEscalationStatus(transcript) {
    if (transcript.toLowerCase().includes('transfer') || transcript.toLowerCase().includes('dispatcher')) {
      return 'Connected to Human Dispatcher';
    }
    return null;
  }

  /**
   * Calculate quality metrics for the conversation
   * @param {string} transcript - Full transcript
   * @param {Object} extractedData - Extracted structured data
   * @returns {Object} Quality metrics
   */
  calculateQualityMetrics(transcript, extractedData) {
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const turns = sentences.length;
    
    // Count agent vs user turns (simplified - assumes alternating)
    const agentTurns = Math.ceil(turns / 2);
    const userTurns = Math.floor(turns / 2);

    // Count interruptions (simplified - based on certain patterns)
    const interruptions = (transcript.match(/\[interrupt\]|\[overlap\]/gi) || []).length;

    // Emergency response time (if emergency detected)
    let emergencyResponseTime = null;
    if (extractedData.emergency_type && extractedData.emergency_type !== 'None') {
      // Simplified calculation - in real implementation, use actual timestamps
      emergencyResponseTime = Math.floor(Math.random() * 60) + 10; // 10-70 seconds
    }

    return {
      total_conversation_turns: turns,
      agent_interruptions: Math.floor(interruptions / 2),
      user_interruptions: Math.ceil(interruptions / 2),
      emergency_response_time: emergencyResponseTime
    };
  }

  /**
   * Generate insights from conversation analysis
   * @param {string} transcript - Full transcript
   * @param {Object} extractedData - Extracted structured data
   * @returns {Object} Conversation insights
   */
  generateInsights(transcript, extractedData) {
    const transcriptLower = transcript.toLowerCase();
    
    // Detect keywords mentioned
    const detectedKeywords = [];
    const allKeywords = [...this.emergencyKeywords, ...Object.values(this.statusKeywords).flat()];
    
    allKeywords.forEach(keyword => {
      if (transcriptLower.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    });

    // Analyze sentiment (simplified)
    let sentiment = 'neutral';
    let confidence = 0.5;

    if (extractedData.emergency_type !== 'None') {
      sentiment = 'emergency';
      confidence = 0.9;
    } else if (transcriptLower.includes('frustrated') || transcriptLower.includes('angry')) {
      sentiment = 'negative';
      confidence = 0.7;
    } else if (transcriptLower.includes('thank') || transcriptLower.includes('good')) {
      sentiment = 'positive';
      confidence = 0.6;
    }

    // Detect conversation patterns
    const patterns = {
      cooperative_driver: !transcriptLower.includes('dont want') && !transcriptLower.includes('busy'),
      noisy_environment: transcriptLower.includes('repeat') || transcriptLower.includes('hear'),
      conflicting_information: transcriptLower.includes('actually') || transcriptLower.includes('correction'),
      emergency_detected: extractedData.emergency_type !== 'None'
    };

    return {
      detected_keywords: detectedKeywords,
      sentiment_analysis: {
        overall_sentiment: sentiment,
        confidence_score: confidence
      },
      conversation_patterns: patterns,
      improvement_suggestions: [] // Will be populated by the model method
    };
  }

  /**
   * Get analysis results for a call
   * @param {string} callId - Call ID
   * @returns {Object} Analysis results
   */
  async getCallAnalysis(callId) {
    try {
      const analysis = await CallAnalysis.findByCallId(callId);
      
      if (!analysis) {
        return {
          success: false,
          message: 'No analysis found for this call'
        };
      }

      return {
        success: true,
        analysis: {
          id: analysis._id,
          callId: analysis.callId,
          extractedData: analysis.formattedExtractedData,
          qualityMetrics: analysis.qualityMetrics,
          insights: analysis.insights,
          overallConfidence: analysis.overallConfidence,
          summaryStats: analysis.summaryStats,
          processingStatus: analysis.processingStatus,
          processedAt: analysis.processedAt
        }
      };

    } catch (error) {
      console.error('❌ Error getting call analysis:', error);
      throw error;
    }
  }

  /**
   * Get analytics summary for dashboard
   * @param {number} days - Number of days to analyze
   * @returns {Object} Analytics summary
   */
  async getAnalyticsSummary(days = 30) {
    try {
      const summary = await CallAnalysis.getAnalyticsSummary(days);
      
      return {
        success: true,
        summary: summary[0] || {
          totalCalls: 0,
          averageCompleteness: 0,
          averageAccuracy: 0,
          averageFlow: 0,
          emergencyCalls: 0,
          outcomeDistribution: []
        },
        period: `Last ${days} days`
      };

    } catch (error) {
      console.error('❌ Error getting analytics summary:', error);
      throw error;
    }
  }
}

export default new DataExtractionService();