// src/CallPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { useNavigate, useLocation } from 'react-router-dom';
import "./CSS/call.css";

export default function CallPage() {
  const clientRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const initializationRef = useRef(false);

  const [isCalling, setIsCalling] = useState(false);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [conversationData, setConversationData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [retryCount, setRetryCount] = useState(0);

  // Initialize call when component mounts
  useEffect(() => {
    const callData = location.state;
    console.log('🔍 Call data received:', callData);

    // If no call data, redirect to agent config
    if (!callData) {
      console.log('⚠️ No call data found, redirecting to agent config...');
      navigate('/agent-config');
      return;
    }

    // Check if accessing /active-call directly without proper flow
    if (!callData.access_token && !callData.callAccepted) {
      console.log('⚠️ Direct access detected, redirecting to agent config...');
      navigate('/agent-config');
      return;
    }

    // Only start if call was accepted from incoming call page
    if (callData?.callAccepted && callData?.access_token && !initializationRef.current) {
      initializationRef.current = true;
      console.log('🚀 Starting call initialization after acceptance...');
      startCall(callData.access_token, callData);
    } else if (!callData?.callAccepted) {
      console.log('⚠️ No call acceptance detected, redirecting...');
      navigate('/agent-config');
    }
  }, [location.state, navigate]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (isCallStarted && !callEnded) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallStarted, callEnded]);

  const startCall = async (accessToken, callData, isRetry = false) => {
    try {
      setIsCalling(true);
      setConnectionStatus('connecting');
      console.log(`🎤 ${isRetry ? 'Retrying' : 'Starting'} call initialization...`);

      // Clean up any existing client
      if (clientRef.current) {
        try {
          console.log('🧹 Cleaning up existing client...');
          await clientRef.current.stopCall();
          clientRef.current = null;
        } catch (e) {
          console.warn('Cleanup warning:', e);
        }
      }

      // CRITICAL: Wait before creating new client to avoid conflicts
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create new Retell client with enhanced configuration
      console.log('🔄 Creating new RetellWebClient...');
      const retellWebClient = new RetellWebClient({
        enableUpdate: true,
        // Add timeout configurations
        audioConfig: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      clientRef.current = retellWebClient;

      // Set up event listeners with enhanced error handling
      retellWebClient.on("call_started", () => {
        console.log("✅ 🔥 CALL STARTED - Agent should be speaking!");
        setIsCallStarted(true);
        setIsCalling(false);
        setConnectionStatus('connected');
        setRetryCount(0);
      });

      retellWebClient.on("call_ended", () => {
        console.log("📞 Call ended");
        setCallEnded(true);
        setIsCallStarted(false);
        setConnectionStatus('ended');
      });

      retellWebClient.on("error", (error) => {
        console.error("❌ Retell error:", error);
        setConnectionStatus('error');
        
        // Handle specific timeout errors with retry logic
        if (error.message?.includes('timeout') || error.message?.includes('engine not connected')) {
          console.log('🔄 Timeout detected, attempting retry...');
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              startCall(accessToken, callData, true);
            }, 2000);
            return;
          }
        }
        
        setIsCalling(false);
        alert(`Call error: ${error.message}`);
      });

      retellWebClient.on("update", (update) => {
        console.log("📡 Update received:", update);
        setLastUpdate(new Date());
        
        if (update.transcript && Array.isArray(update.transcript)) {
          const formatted = update.transcript.map((item, index) => ({
            role: item.role || 'agent',
            content: item.content || item.text || '',
            timestamp: new Date().toLocaleTimeString(),
            id: `${item.role}_${Date.now()}_${index}`
          })).filter(item => item.content.trim());

          if (formatted.length > 0) {
            console.log("📝 Setting transcript:", formatted);
            setConversationData(formatted);
          }
        }
      });

      retellWebClient.on("conversationStarted", () => {
        console.log("🗣️ 🔥 CONVERSATION STARTED!");
        setConnectionStatus('conversation_active');
      });

      retellWebClient.on("agent_start_talking", () => {
        console.log("🗣️ 🔥 AGENT STARTED TALKING!");
      });

      retellWebClient.on("user_start_talking", () => {
        console.log("👤 USER STARTED TALKING");
      });

      // CRITICAL: Enhanced microphone setup with better error handling
      console.log('🎤 Requesting microphone permission...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,  // Higher sample rate
            channelCount: 1
          }
        });
        
        console.log('✅ Microphone permission granted');
        console.log('🎵 Audio stream details:', {
          tracks: stream.getAudioTracks().length,
          settings: stream.getAudioTracks()[0]?.getSettings()
        });
        
        // Stop the stream - Retell will handle audio
        stream.getTracks().forEach(track => track.stop());
      } catch (micError) {
        console.error('❌ Microphone error:', micError);
        throw new Error(`Microphone permission required: ${micError.message}`);
      }

      // CRITICAL: Enhanced call start with timeout handling
      console.log('🚀 Starting Retell call with enhanced config...');
      
      // Set a manual timeout for connection
      const connectionTimeout = setTimeout(() => {
        console.warn('⚠️ Connection timeout reached, retrying...');
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          startCall(accessToken, callData, true);
        }
      }, 15000); // 15 second timeout

      try {
        await retellWebClient.startCall({
          accessToken: accessToken,
          enableUpdate: true,
          // Add additional configuration to prevent timeouts
          audioConfig: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        clearTimeout(connectionTimeout);
        console.log('✅ 🔥 Call initialization complete!');
        setConnectionStatus('call_started');

      } catch (startError) {
        clearTimeout(connectionTimeout);
        throw startError;
      }

    } catch (error) {
      console.error('❌ Error starting call:', error);
      setIsCalling(false);
      setConnectionStatus('error');
      
      // Retry logic for connection errors
      if ((error.message?.includes('timeout') || error.message?.includes('engine')) && retryCount < 3) {
        console.log(`🔄 Retrying connection (attempt ${retryCount + 1}/3)...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          startCall(accessToken, callData, true);
        }, 3000);
      } else {
        alert(`Failed to start call: ${error.message}`);
      }
    }
  };

  const stopCall = async () => {
    console.log('🔄 Stopping call...');
    try {
      if (clientRef.current) {
        await clientRef.current.stopCall();
      }
    } catch (error) {
      console.error('Error stopping call:', error);
    }
    
    setIsCallStarted(false);
    setCallEnded(true);
    setConnectionStatus('ended');
    
    setTimeout(() => {
      navigate('/call-history');
    }, 2000);
  };

  const forceRestart = () => {
    console.log('🔄 Force restarting call...');
    setRetryCount(0);
    initializationRef.current = false;
    setIsCalling(false);
    setIsCallStarted(false);
    setConnectionStatus('idle');
    
    const callData = location.state;
    if (callData?.access_token) {
      setTimeout(() => {
        initializationRef.current = true;
        startCall(callData.access_token, callData);
      }, 1000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting...');
      if (clientRef.current) {
        try {
          clientRef.current.stopCall();
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, []);

  const callData = location.state || {};

  // Add this to handle call ending
  const handleCallEnd = () => {
    console.log('📞 Call ended, navigating to call history');
    
    // Navigate to call history after call ends
    navigate('/call-history');
  };

  // Make sure your call component calls this when call ends
  useEffect(() => {
    // ... existing call setup code ...
    
    // Listen for call end events
    if (clientRef.current) {
      clientRef.current.on('call_ended', handleCallEnd);
      clientRef.current.on('error', handleCallEnd);
    }
    
    return () => {
      if (clientRef.current) {
        clientRef.current.off('call_ended', handleCallEnd);
        clientRef.current.off('error', handleCallEnd);
      }
    };
  }, [navigate]);

  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Enhanced Debug Info */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: '#333',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: '200px'
      }}>
        <div><strong>Status:</strong> {connectionStatus}</div>
        <div><strong>Duration:</strong> {formatTime(callDuration)}</div>
        <div><strong>Transcript:</strong> {conversationData.length} items</div>
        <div><strong>Retries:</strong> {retryCount}/3</div>
        <div><strong>Last Update:</strong> {lastUpdate.toLocaleTimeString()}</div>
        <button 
          onClick={forceRestart}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            marginTop: '8px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          🔄 Force Restart
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>📞 Voice Agent Call</h1>
        <p style={{ color: '#666' }}>
          Agent: <strong>{callData.agentName || 'AI Agent'}</strong>
        </p>
      </div>

      {/* Connection Status */}
      {(isCalling || connectionStatus === 'connecting') && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffeaa7',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '15px',
            animation: 'spin 2s linear infinite'
          }}>
            🔄
          </div>
          <h3>
            {retryCount > 0 ? `Retrying Connection (${retryCount}/3)` : 'Connecting to Agent...'}
          </h3>
          <p>Please wait while we establish the connection with Retell AI.</p>
          <div style={{ color: '#856404', fontSize: '14px', marginTop: '10px' }}>
            <div>✅ Microphone: Ready</div>
            <div>🔗 Status: {connectionStatus}</div>
            <div>🤖 Agent will speak first when connected!</div>
            {retryCount > 0 && (
              <div style={{ color: '#dc3545', marginTop: '8px' }}>
                🔄 Handling connection timeout - retrying...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Call */}
      {(isCallStarted || connectionStatus === 'conversation_active') && !callEnded && (
        <div style={{
          background: '#d4edda',
          border: '3px solid #28a745',
          padding: '25px',
          borderRadius: '15px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '15px', 
            marginBottom: '20px' 
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#dc3545',
              animation: 'blink 1s infinite'
            }}></div>
            <h3 style={{ margin: 0, color: '#155724' }}>
              🔴 LIVE CALL ACTIVE
            </h3>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🤖</div>
            <h4 style={{ color: '#28a745', margin: '0 0 15px 0' }}>
              {callData.agentName || 'AI Agent'}
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              <div><strong>👤 Driver:</strong><br/>{callData.driverName || 'Unknown'}</div>
              <div><strong>📦 Load:</strong><br/>{callData.loadNumber || 'Unknown'}</div>
              <div><strong>📞 Phone:</strong><br/>{callData.phoneNumber || 'Unknown'}</div>
              <div><strong>⏱️ Duration:</strong><br/>{formatTime(callDuration)}</div>
            </div>

            <div style={{
              background: '#28a745',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '25px',
              display: 'inline-block',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              🔥 AGENT IS SPEAKING - LISTEN!
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={stopCall}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
              }}
            >
              📞 End Call
            </button>
          </div>
        </div>
      )}

      {/* Call Ended */}
      {callEnded && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          padding: '25px',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <h3>📞 Call Ended</h3>
          <p>Total duration: {formatTime(callDuration)}</p>
          <button 
            onClick={() => navigate('/call-history')}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            📊 View Call History
          </button>
        </div>
      )}

      {/* Enhanced Transcript */}
      <div style={{
        background: '#f8f9fa',
        border: '2px solid #dee2e6',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ 
          margin: '0 0 15px 0',
          borderBottom: '2px solid #dee2e6',
          paddingBottom: '10px',
          textAlign: 'center'
        }}>
          📝 Live Transcript ({conversationData.length} messages)
        </h3>
        
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          minHeight: '150px'
        }}>
          {conversationData.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#6c757d',
              padding: '50px 20px',
              fontStyle: 'italic'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>👂</div>
              <strong style={{ fontSize: '18px' }}>Waiting for conversation...</strong>
              <div style={{ fontSize: '14px', marginTop: '10px', lineHeight: '1.6' }}>
                <div>Connection: <strong>{connectionStatus}</strong></div>
                <div>Call Active: <strong>{isCallStarted ? '✅' : '❌'}</strong></div>
                <div style={{ color: '#28a745', marginTop: '8px' }}>
                  🔊 <strong>Agent should speak first!</strong>
                </div>
                <div style={{ color: '#007bff', marginTop: '5px' }}>
                  Make sure your speakers/headphones are on
                </div>
              </div>
            </div>
          ) : (
            conversationData.map((item, index) => (
              <div 
                key={item.id || index}
                style={{
                  marginBottom: '12px',
                  padding: '15px',
                  borderRadius: '12px',
                  background: item.role === 'user' ? '#e3f2fd' : '#f1f8e9',
                  border: `2px solid ${item.role === 'user' ? '#bbdefb' : '#c8e6c9'}`,
                  animation: index === conversationData.length - 1 ? 'slideIn 0.3s ease-out' : 'none'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <strong style={{ 
                    color: item.role === 'user' ? '#1976d2' : '#388e3c',
                    fontSize: '16px'
                  }}>
                    {item.role === 'user' ? '👤 Driver' : '🤖 Agent'}
                  </strong>
                  <small style={{ 
                    color: '#666',
                    background: 'rgba(0,0,0,0.1)',
                    padding: '4px 8px',
                    borderRadius: '10px'
                  }}>
                    {item.timestamp}
                  </small>
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  lineHeight: '1.5',
                  color: '#333'
                }}>
                  {item.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}