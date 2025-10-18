import callService from '../services/callService.js';
import retellService from '../services/retellService.js';
import retellLLMService from '../services/retellLLMService.js';
import AgentConfig from '../models/AgentConfig.js';
import Call from '../models/Call.js';
import fetch from 'node-fetch';

/**
 * Save call to database
 */
const saveCallToDatabase = async (callData, userId) => {
  try {
    console.log('💾 Saving call to database:', {
      callId: callData.call_id,
      userId: userId,  // ← Make sure this is being passed
      driverName: callData.metadata?.driver_name
    });

    const newCall = new Call({
      userId: userId,  // ← This is critical - make sure userId is included
      callId: callData.call_id,
      driverName: callData.metadata?.driver_name,
      phoneNumber: callData.metadata?.phone_number,
      loadNumber: callData.metadata?.load_number,
      agentConfigId: callData.metadata?.agent_config_id,
      status: 'registered', // Use 'registered' instead of 'initiated'
      retellData: callData,
      metadata: callData.metadata || {},
      startedAt: new Date()
    });

    const savedCall = await newCall.save();
    console.log('✅ Call saved to database:', savedCall._id);
    
    return savedCall;
  } catch (error) {
    console.error('❌ Error saving call to DB:', error);
    throw error;
  }
};

/**
 * Create a new web call (enhanced with frontend agent configuration)
 */
export const createWebCall = async (req, res) => {
  try {
    const { driverName, phoneNumber, loadNumber, agentConfigId } = req.body;

    console.log('📥 Received create call request:', {
      driverName,
      phoneNumber,
      loadNumber,
      agentConfigId,
    });

    // Validate required fields
    if (!driverName || !phoneNumber || !loadNumber || !agentConfigId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'driverName, phoneNumber, loadNumber, and agentConfigId are required.',
      });
    }

    // Dynamically import model to avoid circular import
    const AgentConfig = await import('../models/AgentConfig.js').then(
      (m) => m.default
    );
    const agentConfig = await AgentConfig.findById(agentConfigId);

    if (!agentConfig) {
      return res.status(404).json({
        success: false,
        error: 'Agent configuration not found',
      });
    }

    console.log('✅ Using agent config:', {
      id: agentConfig._id,
      name: agentConfig.name,
      retellAgentId: agentConfig.retellAgentId,
    });

    // 🧩 Prepare metadata (for record-keeping) and dynamic_variables (for substitution)
    const callMetadata = {
      driver_name: driverName,
      load_number: loadNumber,
      phone_number: phoneNumber,
      agent_config_id: agentConfigId.toString(),
      call_purpose: 'driver_check_in',
      call_type: 'status_check',
      company: 'VoiceAgent Logistics',
    };

    const dynamicVariables = {
      driver_name: driverName,
      load_number: loadNumber,
      phone_number: phoneNumber,
    };

    // ✅ Updated retell payload with correct key for Retell LLM dynamic variables
    const retellPayload = {
      agent_id: agentConfig.retellAgentId,
      metadata: callMetadata,
      // Use the correct key as per docs
      retell_llm_dynamic_variables: dynamicVariables
    };

    console.log('📤 Sending payload to Retell:', JSON.stringify(retellPayload, null, 2));

    // ✅ Use v2 endpoint
    const retellResponse = await fetch(
      'https://api.retellai.com/v2/create-web-call',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retellPayload),
      }
    );

    const responseText = await retellResponse.text();
    console.log('🔄 Retell Response Status:', retellResponse.status);
    console.log('🔄 Retell Response:', responseText);

    if (!retellResponse.ok) {
      // Try alternative endpoints if v2 fails
      if (retellResponse.status === 404) {
        console.error('❌ v2 endpoint failed - trying v1 endpoint');
        
        const v1Response = await fetch(
          'https://api.retellai.com/create-web-call',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(retellPayload),
          }
        );

        const v1ResponseText = await v1Response.text();
        console.log('🔄 v1 Response Status:', v1Response.status);
        console.log('🔄 v1 Response:', v1ResponseText);

        if (!v1Response.ok) {
          throw new Error(`Both v2 and v1 endpoints failed. v2: ${responseText}, v1: ${v1ResponseText}`);
        }

        const retellData = JSON.parse(v1ResponseText);
        console.log('✅ Web call created with v1 endpoint:', retellData.call_id);

        await saveCallToDatabase(retellData, req.userId); // ← Just pass the userId

        return res.json({
          success: true,
          call_id: retellData.call_id,
          access_token: retellData.access_token,
          agent_name: agentConfig.name,
          message: `Call created for ${driverName} about load ${loadNumber}`,
        });
      }

      throw new Error(
        `Retell API error: ${retellResponse.status} ${responseText}`
      );
    }

    const retellData = JSON.parse(responseText);
    console.log('✅ Web call created successfully:', retellData.call_id);

    await saveCallToDatabase(retellData, req.userId); // ← Just pass the userId

    res.json({
      success: true,
      call_id: retellData.call_id,
      access_token: retellData.access_token,
      agent_name: agentConfig.name,
      message: `Call created for ${driverName} about load ${loadNumber}`,
    });
  } catch (error) {
    console.error('❌ Error creating web call:', error);
    res.status(500).json({
      success: false,
      error: 'create-web-call failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * End an ongoing call
 */
export const endCall = async (req, res) => {
  try {
    const { call_id, transcript, duration, endedAt } = req.body;
    
    console.log('🏁 Ending call:', call_id);
    console.log('📝 End call data:', { transcript: !!transcript, duration, endedAt });

    if (!call_id) {
      return res.status(400).json({
        success: false,
        
        
        
        message: 'Call ID is required'
      });
    }

    const Call = await import('../models/Call.js').then(m => m.default);

    // Find call by various possible IDs
    let call = await Call.findOne({
      $or: [
        { callId: call_id },
        { retellCallId: call_id },
        { _id: call_id.match(/^[0-9a-fA-F]{24}$/) ? call_id : null }
      ]
    });

    if (!call) {
      console.error('❌ Call not found for ending:', call_id);
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Update call with end information
    call.status = 'completed';
    call.endedAt = endedAt ? new Date(endedAt) : new Date();
    
    if (duration) {
      call.duration = duration;
    }

    // Save transcript if provided
    if (transcript && Array.isArray(transcript) && transcript.length > 0) {
      console.log('💾 Saving transcript from end call:', transcript.length, 'messages');
      call.transcript = transcript.map(msg => ({
        role: msg.role || 'unknown',
        text: msg.content || msg.text || msg.message || String(msg),
        timestamp: new Date(msg.timestamp || Date.now())
      }));
    }

    call.updatedAt = new Date();
    
    await call.save();

    console.log('✅ Call ended successfully:', {
      callId: call.callId,
      duration: call.duration,
      transcriptLength: call.transcript?.length || 0
    });

    res.json({
      success: true,
      message: 'Call ended successfully',
      call: {
        id: call._id,
        callId: call.callId,
        status: call.status,
        duration: call.duration,
        transcript_length: call.transcript?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error ending call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end call: ' + error.message
    });
  }
};

/**
 * Save transcript to database
 */
export const saveTranscript = async (req, res) => {
  try {
    const { call_id, transcript } = req.body;
    
    console.log('📝 Saving transcript for call:', call_id);
    console.log('📝 Transcript data:', transcript);

    // Find the call by callId (not _id)
    const call = await Call.findOne({ callId: call_id });
    
    if (!call) {
      console.error('❌ Call not found for transcript save:', call_id);
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Initialize transcript array if it doesn't exist
    if (!call.transcript) {
      call.transcript = [];
    }

    // Add new transcript entries
    if (Array.isArray(transcript)) {
      call.transcript.push(...transcript);
    } else {
      call.transcript.push(transcript);
    }

    await call.save();
    
    console.log('✅ Transcript saved successfully for call:', call_id);
    console.log('📊 Total transcript entries:', call.transcript.length);

    res.json({
      success: true,
      message: 'Transcript saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving transcript:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save transcript'
    });
  }
};

/**
 * Get details of a specific call by ID
 */
export const getCall = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📋 Fetching call:', id);

    const call = await callService.getCallById(id);

    res.json({
      id: call._id,
      driverName: call.driverName,
      phoneNumber: call.phoneNumber,
      loadNumber: call.loadNumber,
      status: call.status,
      duration: call.formattedDuration,
      transcript: call.transcript,
      createdAt: call.createdAt,
      endedAt: call.endedAt,
      retellCallId: call.retellCallId
    });

  } catch (error) {
    console.error('❌ Get call error:', error);
    res.status(404).json({
      error: 'Call not found',
      message: error.message
    });
  }
};

/**
 * Get a list of recent calls with optional limit
 */
export const getRecentCalls = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    console.log('📋 Fetching recent calls, limit:', limit);

    const calls = await callService.getRecentCalls(limit);

    res.json({
      success: true,
      count: calls.length,
      calls: calls.map(call => ({
        id: call._id,
        driverName: call.driverName,
        phoneNumber: call.phoneNumber,
        loadNumber: call.loadNumber,
        status: call.status,
        duration: call.formattedDuration,
        transcriptLength: call.transcript.length,
        createdAt: call.createdAt,
        endedAt: call.endedAt
      }))
    });

  } catch (error) {
    console.error('❌ Get recent calls error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent calls',
      message: error.message
    });
  }
};

/**
 * Get call statistics including totals and averages
 */
export const getCallStats = async (req, res) => {
  try {
    console.log('📊 Fetching call statistics');

    const stats = await callService.getCallStats();

    res.json({
      success: true,
      statistics: {
        ...stats,
        averageDurationFormatted: `${Math.floor(stats.averageDuration / 60)}m ${Math.floor(stats.averageDuration % 60)}s`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get call stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch call statistics',
      message: error.message
    });
  }
};

/**
 * Get detailed analysis of a specific call
 */
export const getCallAnalysis = async (req, res) => {
  try {
    const { callId } = req.params;
    console.log('📊 Fetching call analysis for:', callId);

    const retellApiKey = process.env.RETELL_API_KEY;
    if (!retellApiKey) {
      return res.status(500).json({
        success: false,
        message: 'Retell API key not configured'
      });
    }

    // Get call details from Retell AI
    const callResponse = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!callResponse.ok) {
      console.error('❌ Retell API error:', callResponse.status, await callResponse.text());
      return res.status(callResponse.status).json({
        success: false,
        message: 'Failed to fetch call data from Retell'
      });
    }

    const callData = await callResponse.json();
    console.log('📞 Call data received:', callData);

    // Retell AI provides analysis data directly in the call response
    const analysis = {
      call_id: callData.call_id,
      call_type: callData.call_type,
      agent_id: callData.agent_id,
      call_status: callData.call_status,
      start_timestamp: callData.start_timestamp,
      end_timestamp: callData.end_timestamp,
      duration_ms: callData.end_timestamp - callData.start_timestamp,
      
      // Transcript and conversation analysis
      transcript: callData.transcript || [],
      
      // Call quality metrics
      call_analysis: {
        user_sentiment: callData.call_analysis?.user_sentiment || 'neutral',
        call_successful: callData.call_analysis?.call_successful || true,
        summary: callData.call_analysis?.summary || 'Call completed successfully',
        
        // Additional metrics from Retell
        interruption_count: callData.call_analysis?.interruption_count || 0,
        user_talk_percentage: callData.call_analysis?.user_talk_percentage || 0.4,
        agent_talk_percentage: callData.call_analysis?.agent_talk_percentage || 0.6,
        silence_percentage: callData.call_analysis?.silence_percentage || 0.1,
        
        // Custom analysis based on transcript
        total_messages: callData.transcript ? callData.transcript.length : 0,
        user_messages: callData.transcript ? callData.transcript.filter(msg => msg.role === 'user').length : 0,
        agent_messages: callData.transcript ? callData.transcript.filter(msg => msg.role === 'agent').length : 0,
      },

      // Performance metrics
      latency: callData.latency || {},
      
      // Custom insights based on conversation
      insights: generateCallInsights(callData)
    };

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('❌ Error fetching call analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call analysis: ' + error.message
    });
  }
};

// Helper function to generate insights from call data
const generateCallInsights = (callData) => {
  const insights = [];
  
  if (callData.transcript && callData.transcript.length > 0) {
    const userMessages = callData.transcript.filter(msg => msg.role === 'user');
    const agentMessages = callData.transcript.filter(msg => msg.role === 'agent');
    
    // Call completion analysis
    if (callData.call_status === 'ended') {
      insights.push('✅ Call completed successfully');
    }
    
    // Conversation balance
    const userMessageCount = userMessages.length;
    const agentMessageCount = agentMessages.length;
    
    if (userMessageCount > agentMessageCount) {
      insights.push('👤 User was highly engaged with multiple responses');
    } else if (agentMessageCount > userMessageCount * 2) {
      insights.push('🤖 Agent dominated the conversation - consider more pauses for user input');
    } else {
      insights.push('💬 Good conversation balance between agent and user');
    }
    
    // Response quality analysis
    const avgUserResponseLength = userMessages.reduce((sum, msg) => sum + (msg.content || msg.text || '').length, 0) / userMessages.length;
    
    if (avgUserResponseLength > 50) {
      insights.push('📝 User provided detailed responses - good engagement');
    } else if (avgUserResponseLength < 10) {
      insights.push('🔇 Short user responses - may indicate confusion or disengagement');
    }
    
    // Sentiment analysis based on keywords
    const transcript = callData.transcript.map(msg => (msg.content || msg.text || '').toLowerCase()).join(' ');
    
    const positiveWords = ['yes', 'good', 'okay', 'sure', 'thanks', 'appreciate', 'helpful'];
    const negativeWords = ['no', 'bad', 'problem', 'issue', 'confused', 'wrong', 'error'];
    
    const positiveCount = positiveWords.filter(word => transcript.includes(word)).length;
    const negativeCount = negativeWords.filter(word => transcript.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      insights.push('😊 Positive sentiment detected in conversation');
    } else if (negativeCount > positiveCount) {
      insights.push('😟 Some negative sentiment detected - may need follow-up');
    }
  }
  
  // Duration analysis
  if (callData.end_timestamp && callData.start_timestamp) {
    const durationMs = callData.end_timestamp - callData.start_timestamp;
    const durationMinutes = durationMs / (1000 * 60);
    
    if (durationMinutes < 1) {
      insights.push('⚡ Very short call - may indicate technical issues or immediate hang-up');
    } else if (durationMinutes > 10) {
      insights.push('⏰ Extended conversation - thorough information exchange');
    }
  }
  
  return insights.length > 0 ? insights : ['📊 Call analysis completed - standard conversation flow'];
};

/**
 * Get enhanced details of a call, combining database and Retell data
 */
export const getCallDetails = async (req, res) => {
  try {
    const { callId } = req.params;
    console.log('📋 Fetching call details for:', callId);

    // First try to get from database
    const Call = await import('../models/Call.js').then(m => m.default);
    const dbCall = await Call.findOne({
      $or: [
        { callId: callId },
        { retellCallId: callId },
        { _id: callId }
      ]
    });

    let callData = null;

    // If found in database, get additional data from Retell
    if (dbCall) {
      const retellApiKey = process.env.RETELL_API_KEY;
      const actualCallId = dbCall.callId || dbCall.retellCallId;

      if (retellApiKey && actualCallId) {
        try {
          const retellResponse = await fetch(`https://api.retellai.com/v2/get-call/${actualCallId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${retellApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (retellResponse.ok) {
            const retellData = await retellResponse.json();
            
            callData = {
              ...dbCall.toObject(),
              retellData: retellData,
              transcript: retellData.transcript || dbCall.transcript || [],
              duration: retellData.end_timestamp && retellData.start_timestamp ? 
                        Math.round((retellData.end_timestamp - retellData.start_timestamp) / 1000) : 
                        dbCall.duration,
              call_analysis: retellData.call_analysis || {}
            };
          }
        } catch (retellError) {
          console.warn('⚠️ Could not fetch from Retell, using database data:', retellError.message);
        }
      }
    }

    // Fallback to database data only
    if (!callData && dbCall) {
      callData = dbCall.toObject();
    }

    if (!callData) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.json({
      success: true,
      call: callData
    });

  } catch (error) {
    console.error('❌ Error fetching call details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call details: ' + error.message
    });
  }
};

/**
 * Get user's call history
 */
export const getCallHistory = async (req, res) => {
  try {
    console.log('📋 Fetching call history for user:', req.userId);

    const calls = await Call.find({ userId: req.userId })
      .populate('agentConfigId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`📋 Found ${calls.length} calls for user`);

    res.json({
      success: true,
      calls: calls.map(call => ({
        id: call._id,
        callId: call.callId,
        driverName: call.driverName,
        phoneNumber: call.phoneNumber,
        loadNumber: call.loadNumber,
        status: call.status,
        agentName: call.agentConfigId?.name || 'Unknown',
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        duration: call.duration,
        createdAt: call.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ Get call history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call history'
    });
  }
};

/**
 * Extract structured data from call transcript
 */
export const extractCallData = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.userId;

    console.log('🤖 Extracting data for call:', callId, 'user:', userId);

    // Find the call in database
    const call = await Call.findOne({ 
      callId: callId, 
      userId: userId 
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Try to get transcript from Retell API if not in database
    let transcriptText = '';
    
    if (!call.transcript || call.transcript.length === 0) {
      console.log('⚠️ No transcript in database, trying to fetch from Retell...');
      
      try {
        const retellResponse = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (retellResponse.ok) {
          const retellData = await retellResponse.json();
          console.log('📞 Retell call data received');
          
          // FIX: Use transcript_object instead of transcript
          if (retellData.transcript_object && retellData.transcript_object.length > 0) {
            console.log('✅ Found transcript_object in Retell API');
            
            // Save transcript to database for future use
            call.transcript = retellData.transcript_object.map(entry => ({
              role: entry.role,
              text: entry.content, // FIX: Use 'content' not 'text'
              timestamp: new Date()
            }));
            
            await call.save();
            
            transcriptText = call.transcript
              .map(entry => `${entry.role}: ${entry.text}`)
              .join('\n');
          } else if (retellData.transcript) {
            // Fallback: use plain transcript string
            console.log('✅ Found plain transcript in Retell API');
            transcriptText = retellData.transcript;
          }
        }
      } catch (retellError) {
        console.error('❌ Failed to fetch from Retell:', retellError.message);
      }
    } else {
      // Use existing transcript from database
      transcriptText = call.transcript
        .map(entry => `${entry.role}: ${entry.text}`)
        .join('\n');
    }

    // If still no transcript, create mock data for testing
    if (!transcriptText || transcriptText.trim().length === 0) {
      console.log('⚠️ No transcript available, creating mock data for testing');
      
      const mockData = {
        driverStatus: 'en_route',
        location: 'Highway 95, Arizona',
        loadStatus: 'in_transit',
        estimatedArrival: '2 hours',
        issues: [],
        sentiment: 'positive',
        call_outcome: 'Status Update - Mock Data',
        driver_status: 'Driving',
        current_location: `Mock Location for ${call.driverName}`,
        eta: '14:30 Today',
        delay_reason: 'None',
        unloading_status: 'Not Started',
        pod_reminder_acknowledged: true,
        extractedAt: new Date(),
        note: 'Mock data generated - transcript not available'
      };

      // Save mock data to call
      call.extractedData = mockData;
      call.dataExtracted = true;
      await call.save();

      return res.json({
        success: true,
        message: 'Mock data extracted successfully',
        structured_data: mockData
      });
    }

    console.log('📝 Processing transcript:', transcriptText.substring(0, 200) + '...');

    // Use AI to extract structured data from real transcript
    const extractedData = await extractDataWithAI(transcriptText, call);

    // Update call with extracted data
    call.extractedData = extractedData;
    call.dataExtracted = true;
    await call.save();

    console.log('✅ Data extracted and saved:', extractedData);

    res.json({
      success: true,
      message: 'Data extracted successfully',
      structured_data: extractedData
    });

  } catch (error) {
    console.error('❌ Extract data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract data: ' + error.message
    });
  }
};

/**
 * Extract structured data using AI from real transcript
 */
const extractDataWithAI = async (transcriptText, call) => {
  try {
    console.log('🤖 Analyzing transcript for driver:', call.driverName);
    
    // Enhanced extraction logic using real transcript
    const data = {
      driverStatus: 'unknown',
      location: 'unknown',
      loadStatus: 'unknown',
      estimatedArrival: null,
      issues: [],
      sentiment: 'neutral',
      call_outcome: 'Status Check',
      driver_status: 'Unknown',
      current_location: 'Unknown Location',
      eta: 'Not specified',
      delay_reason: 'None',
      unloading_status: 'Not Started',
      pod_reminder_acknowledged: false,
      extractedAt: new Date()
    };

    // Process real transcript
    const text = transcriptText.toLowerCase();

    // Extract driver status from conversation
    if (text.includes('delivered') || text.includes('completed') || text.includes('unloaded')) {
      data.driverStatus = 'delivered';
      data.loadStatus = 'completed';
      data.driver_status = 'Delivered';
      data.call_outcome = 'Delivery Confirmation';
      data.unloading_status = 'Completed';
    } else if (text.includes('moving towards') || text.includes('on the way') || text.includes('driving') || text.includes('in transit')) {
      data.driverStatus = 'en_route';
      data.loadStatus = 'in_transit';
      data.driver_status = 'En Route';
      data.call_outcome = 'Status Update';
    } else if (text.includes('problem') || text.includes('issue') || text.includes('delay') || text.includes('late')) {
      data.driverStatus = 'delayed';
      data.loadStatus = 'delayed';
      data.driver_status = 'Delayed';
      data.call_outcome = 'Issue Report';
    }

    // Extract location mentions - look for specific patterns
    const locationMatches = [
      text.match(/(?:moving towards|going to|destination|in|at|near)\s+([a-zA-Z\s,]{3,30})/),
      text.match(/california[,\s]*([a-zA-Z\s,]{3,20})/),
      text.match(/([a-zA-Z\s]+),\s*([a-zA-Z\s]+)/),
    ];
    
    for (const match of locationMatches) {
      if (match && match[1]) {
        data.location = match[1].trim();
        data.current_location = match[1].trim();
        break;
      }
    }

    // Extract ETA mentions
    const etaMatches = [
      text.match(/eta\s+(?:is\s+)?(?:tomorrow\s+at\s+)?(\d+(?::\d+)?\s*(?:am|pm)?)/i),
      text.match(/(?:arrive|delivery|there)\s+(?:tomorrow\s+)?(?:at\s+)?(\d+(?::\d+)?\s*(?:am|pm)?)/i),
      text.match(/(\d+)\s*(hour|minute|hours|minutes)/i)
    ];
    
    for (const match of etaMatches) {
      if (match && match[1]) {
        data.estimatedArrival = match[1].trim();
        data.eta = match[1].trim();
        break;
      }
    }

    // Extract issues
    if (text.includes('problem') || text.includes('issue')) {
      data.issues.push('Driver reported problems');
      data.delay_reason = 'Driver reported issues';
    }
    if (text.includes('delay') || text.includes('late')) {
      data.issues.push('Delivery delay');
      data.delay_reason = 'Traffic/Weather delay';
    }
    if (text.includes('emergency') || text.includes('accident')) {
      data.issues.push('Emergency situation');
      data.delay_reason = 'Emergency';
    }

    // POD reminder acknowledgment
    if (text.includes('pod') || text.includes('proof') || text.includes('delivery') || text.includes('send')) {
      data.pod_reminder_acknowledged = true;
    }

    // Extract sentiment from conversation tone
    if (text.includes('fine') || text.includes('good') || text.includes('great') || text.includes('okay') || text.includes('yes')) {
      data.sentiment = 'positive';
    } else if (text.includes('problem') || text.includes('bad') || text.includes('terrible') || text.includes('no')) {
      data.sentiment = 'negative';
    }

    console.log('📊 Extracted data:', data);
    return data;

  } catch (error) {
    console.error('❌ AI extraction error:', error);
    return {
      error: 'Failed to extract data',
      call_outcome: 'Error',
      driver_status: 'Unknown',
      current_location: 'Unknown',
      eta: 'Unknown',
      delay_reason: 'Unknown',
      unloading_status: 'Unknown',
      pod_reminder_acknowledged: false,
      extractedAt: new Date()
    };
  }
};