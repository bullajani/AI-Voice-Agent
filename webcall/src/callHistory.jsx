import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CSS/callHistory.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const CallHistory = () => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  
  // NEW: Add these states for structured data extraction
  const [extractedData, setExtractedData] = useState({});
  const [extractingData, setExtractingData] = useState({});
  const [selectedDataCall, setSelectedDataCall] = useState(null);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      
      // ADD AUTHENTICATION
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/calls/history`, {
        headers: {
          'Authorization': `Bearer ${token}`, // ← ADD THIS LINE
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCalls(data.calls || []);
        console.log('📋 Fetched calls:', data.calls); // Debug log
      } else {
        console.error('Failed to fetch call history:', data.message);
        // If unauthorized, redirect to login
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Function to extract structured data
  const extractStructuredData = async (call) => {
    // FIX: Use the correct field name for callId
    const callId = call.callId || call.call_id || call._id;
    
    console.log('🔍 Extracting data for call:', callId, 'Call object:', call);
    
    if (!callId) {
      console.error('❌ No callId found in call object');
      alert('Cannot extract data: Call ID not found');
      return;
    }
    
    if (extractingData[callId] || extractedData[callId]) {
      return;
    }

    setExtractingData(prev => ({ ...prev, [callId]: true }));

    try {
      console.log('🤖 Starting extraction for call:', callId);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/calls/extract-data/${callId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('📥 Extraction response:', data);
      
      if (data.success) {
        setExtractedData(prev => ({ ...prev, [callId]: data.structured_data }));
        console.log('✅ Success! Extracted data:', data.structured_data);
      } else {
        console.error('❌ Extraction failed:', data.message);
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          alert(`Failed to extract data: ${data.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      alert(`Network error: ${error.message}`);
    } finally {
      setExtractingData(prev => ({ ...prev, [callId]: false }));
    }
  };

  // NEW: Helper functions for status styling
  const getDriverStatusIcon = (status) => {
    const icons = {
      'Driving': '🚛',
      'Delayed': '⏰',
      'Arrived': '📍',
      'Unloading': '📦'
    };
    return icons[status] || '🚛';
  };

  const getDriverStatusColor = (status) => {
    const colors = {
      'Driving': '#2196F3',
      'Delayed': '#ff9800', 
      'Arrived': '#4CAF50',
      'Unloading': '#9C27B0'
    };
    return colors[status] || '#666';
  };

  const getOutcomeColor = (outcome) => {
    return outcome === 'Arrival Confirmation' ? '#4CAF50' : '#2196F3';
  };

  const formatDuration = (duration) => {
    if (!duration) return '0s';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'declined': return '#f44336';
      case 'failed': return '#ff9800';
      case 'in-progress': return '#2196F3';
      default: return '#666';
    }
  };

  const viewCallAnalysis = (call) => {
    navigate('/call-analysis', { state: { call } });
  };

  const startNewCall = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // not logged in -> go to signup/login
      navigate('/signup');
      return;
    }
    // logged in -> go to Agent Config where user creates agent and starts calls
    navigate('/agent-config');
  };

  // Add this button to go back to agent config
  const goToAgentConfig = () => {
    navigate('/agent-config');
  };

  if (loading) {
    return (
      <div className="call-history-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading call history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="call-history-container">
      <div className="call-history-header">
        <h1>
          <span className="icon">📞</span>
          Call History
        </h1>
        <button className="new-call-btn" onClick={startNewCall}>
          <span className="icon">➕</span>
          New Call
        </button>
      </div>

      {/* Add this button in your JSX */}
      <div className="mb-6">
        <button
          onClick={goToAgentConfig}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          ← Back to Agent Config
        </button>
      </div>

      <div className="call-history-stats">
        <div className="stat-card">
          <div className="stat-value">{calls.length}</div>
          <div className="stat-label">Total Calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {calls.filter(call => call.status === 'completed').length}
          </div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {calls.reduce((total, call) => total + (call.duration || 0), 0)}s
          </div>
          <div className="stat-label">Total Duration</div>
        </div>
      </div>

      <div className="call-history-list">
        {calls.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📞</div>
            <h3>No calls yet</h3>
            <p>Start your first call to see history here</p>
            <button className="start-first-call-btn" onClick={startNewCall}>
              Start First Call
            </button>
          </div>
        ) : (
          calls.map((call, index) => {
            const callId = call.call_id || call._id;
            const structuredData = extractedData[callId];
            const isExtracting = extractingData[callId];
            
            return (
              <div key={call._id || index} className="call-history-item">
                <div className="call-basic-info">
                  <div className="call-avatar">
                    <span className="avatar-icon">🤖</span>
                  </div>
                  <div className="call-details">
                    <div className="call-title">
                      <span className="agent-name">{call.agentName || 'AI Agent'}</span>
                      <span 
                        className="call-status"
                        style={{ color: getStatusColor(call.status) }}
                      >
                        {call.status || 'unknown'}
                      </span>
                    </div>
                    <div className="call-meta">
                      <span className="meta-item">
                        <span className="icon">👤</span>
                        {call.driverName || call.metadata?.driverName}
                      </span>
                      <span className="meta-item">
                        <span className="icon">📦</span>
                        {call.loadNumber || call.metadata?.loadNumber}
                      </span>
                      <span className="meta-item">
                        <span className="icon">📞</span>
                        {call.phoneNumber || call.metadata?.phoneNumber}
                      </span>
                    </div>
                    <div className="call-timing">
                      <span className="time">
                        {new Date(call.startTime || call.createdAt).toLocaleString()}
                      </span>
                      <span className="duration">
                        Duration: {formatDuration(call.duration)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NEW: Structured Data Extraction Section */}
                <div className="structured-data-section">
                  {!structuredData && !isExtracting && (
                    <button 
                      className="extract-data-btn"
                      onClick={() => extractStructuredData(call)}
                    >
                      <span className="icon">🤖</span>
                      Extract Business Data
                    </button>
                  )}
                  
                  {isExtracting && (
                    <div className="extraction-loading">
                      <div className="spinner-small"></div>
                      <span>AI is extracting business data from call transcript...</span>
                    </div>
                  )}
                  
                  {structuredData && (
                    <div className="structured-data-preview">
                      <div className="data-header">
                        <h4>
                          <span className="icon">📊</span>
                          Extracted Business Data
                        </h4>
                        <button 
                          className="toggle-data-btn"
                          onClick={() => setSelectedDataCall(selectedDataCall === callId ? null : callId)}
                        >
                          {selectedDataCall === callId ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>
                      
                      {/* Quick Summary */}
                      <div className="data-summary">
                        <div className="summary-item">
                          <span 
                            className="outcome-badge"
                            style={{ backgroundColor: getOutcomeColor(structuredData.call_outcome) }}
                          >
                            {structuredData.call_outcome}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span 
                            className="status-badge"
                            style={{ color: getDriverStatusColor(structuredData.driver_status) }}
                          >
                            {getDriverStatusIcon(structuredData.driver_status)} {structuredData.driver_status}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="location-text">
                            📍 {structuredData.current_location}
                          </span>
                        </div>
                      </div>
                      
                      {/* Detailed Data (Expandable) */}
                      {selectedDataCall === callId && (
                        <div className="detailed-data">
                          <div className="data-grid">
                            <div className="data-item">
                              <div className="data-label">Call Outcome</div>
                              <div className="data-value">
                                <span 
                                  className="outcome-badge"
                                  style={{ backgroundColor: getOutcomeColor(structuredData.call_outcome) }}
                                >
                                  {structuredData.call_outcome}
                                </span>
                              </div>
                            </div>
                            
                            <div className="data-item">
                              <div className="data-label">Driver Status</div>
                              <div className="data-value">
                                <span 
                                  className="status-badge"
                                  style={{ color: getDriverStatusColor(structuredData.driver_status) }}
                                >
                                  {getDriverStatusIcon(structuredData.driver_status)} {structuredData.driver_status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="data-item">
                              <div className="data-label">Current Location</div>
                              <div className="data-value">
                                📍 {structuredData.current_location}
                              </div>
                            </div>
                            
                            <div className="data-item">
                              <div className="data-label">ETA</div>
                              <div className="data-value">
                                🕐 {structuredData.eta}
                              </div>
                            </div>
                            
                            <div className="data-item">
                              <div className="data-label">Delay Reason</div>
                              <div className="data-value">
                                {structuredData.delay_reason === 'None' ? '✅ No Delays' : `⚠️ ${structuredData.delay_reason}`}
                              </div>
                            </div>
                            
                            <div className="data-item">
                              <div className="data-label">Unloading Status</div>
                              <div className="data-value">
                                📦 {structuredData.unloading_status}
                              </div>
                            </div>
                            
                            <div className="data-item">
                              <div className="data-label">POD Reminder</div>
                              <div className="data-value">
                                {structuredData.pod_reminder_acknowledged ? '✅ Acknowledged' : '❌ Not Acknowledged'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* EXISTING: Call Actions */}
                <div className="call-actions">
                  <button 
                    className="view-analysis-btn"
                    onClick={() => viewCallAnalysis(call)}
                  >
                    <span className="icon">📊</span>
                    View Analysis
                  </button>
                  
                  {call.transcript && call.transcript.length > 0 && (
                    <button 
                      className="view-transcript-btn"
                      onClick={() => setSelectedCall(selectedCall === call._id ? null : call._id)}
                    >
                      <span className="icon">📝</span>
                      {selectedCall === call._id ? 'Hide' : 'Show'} Transcript
                    </button>
                  )}
                </div>

                {/* EXISTING: Expandable Transcript */}
                {selectedCall === call._id && call.transcript && (
                  <div className="call-transcript">
                    <h4>Transcript</h4>
                    <div className="transcript-messages">
                      {call.transcript.map((message, idx) => (
                        <div key={idx} className={`message ${message.role}`}>
                          <span className="speaker">
                            {message.role === 'user' ? 'Driver' : 'Agent'}:
                          </span>
                          <span className="text">{message.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW: Extracted Data Display (Tailwind CSS) */}
                {extractedData[call.callId] && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">📊 Extracted Business Data</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Driver Status:</strong> {extractedData[call.callId].driver_status}</div>
                      <div><strong>Call Outcome:</strong> {extractedData[call.callId].call_outcome}</div>
                      <div><strong>Current Location:</strong> {extractedData[call.callId].current_location}</div>
                      <div><strong>ETA:</strong> {extractedData[call.callId].eta}</div>
                      <div><strong>Load Status:</strong> {extractedData[call.callId].loadStatus}</div>
                      <div><strong>Sentiment:</strong> {extractedData[call.callId].sentiment}</div>
                      {extractedData[call.callId].delay_reason !== 'None' && (
                        <div><strong>Delay Reason:</strong> {extractedData[call.callId].delay_reason}</div>
                      )}
                      <div><strong>POD Acknowledged:</strong> {extractedData[call.callId].pod_reminder_acknowledged ? 'Yes' : 'No'}</div>
                    </div>
                    {extractedData[call.callId].note && (
                      <p className="text-xs text-gray-600 mt-2">{extractedData[call.callId].note}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CallHistory;