import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CSS/callAnalysis.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const CallAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [call, setCall] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.call) {
      setCall(location.state.call);
      fetchCallAnalysis(location.state.call.call_id || location.state.call._id);
    }
  }, [location.state]);

  const fetchCallAnalysis = async (callId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/calls/analysis/${callId}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        console.error('Failed to fetch call analysis:', data.message);
      }
    } catch (error) {
      console.error('Error fetching call analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate('/call-history');
  };

  const formatDuration = (duration) => {
    if (!duration) return '0s';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  if (!call) {
    return (
      <div className="call-analysis-container">
        <div className="error-state">
          <h3>No call data found</h3>
          <button onClick={goBack}>Back to History</button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-analysis-container">
      {/* Header */}
      <div className="analysis-header">
        <button className="back-btn" onClick={goBack}>
          <span className="icon">←</span>
          Back to History
        </button>
        <h1>
          <span className="icon">📊</span>
          Call Analysis
        </h1>
      </div>

      {/* Call Overview */}
      <div className="call-overview">
        <div className="overview-card">
          <div className="call-avatar">
            <span className="avatar-icon">🤖</span>
          </div>
          <div className="call-info">
            <h2>{call.agentName || 'AI Agent'}</h2>
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
              <span>Started: {new Date(call.startTime || call.createdAt).toLocaleString()}</span>
              <span>Duration: {formatDuration(call.duration)}</span>
              <span className="status" style={{ color: call.status === 'completed' ? '#4CAF50' : '#f44336' }}>
                Status: {call.status || 'unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Content */}
      {loading ? (
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Analyzing call data...</p>
        </div>
      ) : (
        <div className="analysis-content">
          {/* Key Metrics */}
          <div className="metrics-section">
            <h3>
              <span className="icon">📈</span>
              Key Metrics
            </h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value">
                  {analysis?.sentiment?.overall || 'N/A'}
                </div>
                <div className="metric-label">Overall Sentiment</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {analysis?.engagement_score || 'N/A'}
                </div>
                <div className="metric-label">Engagement Score</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {analysis?.call_quality || 'N/A'}
                </div>
                <div className="metric-label">Call Quality</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {call.transcript?.length || 0}
                </div>
                <div className="metric-label">Total Messages</div>
              </div>
            </div>
          </div>

          {/* Sentiment Analysis */}
          {analysis?.sentiment && (
            <div className="sentiment-section">
              <h3>
                <span className="icon">😊</span>
                Sentiment Analysis
              </h3>
              <div className="sentiment-breakdown">
                <div className="sentiment-item">
                  <span className="sentiment-label">Positive</span>
                  <div className="sentiment-bar">
                    <div 
                      className="sentiment-fill positive"
                      style={{ width: `${analysis.sentiment.positive * 100}%` }}
                    ></div>
                  </div>
                  <span className="sentiment-percentage">
                    {Math.round(analysis.sentiment.positive * 100)}%
                  </span>
                </div>
                <div className="sentiment-item">
                  <span className="sentiment-label">Neutral</span>
                  <div className="sentiment-bar">
                    <div 
                      className="sentiment-fill neutral"
                      style={{ width: `${analysis.sentiment.neutral * 100}%` }}
                    ></div>
                  </div>
                  <span className="sentiment-percentage">
                    {Math.round(analysis.sentiment.neutral * 100)}%
                  </span>
                </div>
                <div className="sentiment-item">
                  <span className="sentiment-label">Negative</span>
                  <div className="sentiment-bar">
                    <div 
                      className="sentiment-fill negative"
                      style={{ width: `${analysis.sentiment.negative * 100}%` }}
                    ></div>
                  </div>
                  <span className="sentiment-percentage">
                    {Math.round(analysis.sentiment.negative * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Key Insights */}
          {analysis?.insights && (
            <div className="insights-section">
              <h3>
                <span className="icon">💡</span>
                Key Insights
              </h3>
              <div className="insights-list">
                {analysis.insights.map((insight, index) => (
                  <div key={index} className="insight-item">
                    <div className="insight-icon">💡</div>
                    <div className="insight-text">{insight}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript with Analysis */}
          {call.transcript && call.transcript.length > 0 && (
            <div className="transcript-section">
              <h3>
                <span className="icon">📝</span>
                Analyzed Transcript
              </h3>
              <div className="transcript-container">
                {call.transcript.map((message, index) => (
                  <div key={index} className={`transcript-message ${message.role}`}>
                    <div className="message-header">
                      <span className="speaker">
                        {message.role === 'user' ? 'Driver' : 'Agent'}
                      </span>
                      <span className="timestamp">
                        {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">
                      <p className="message-text">{message.text}</p>
                      {analysis?.message_analysis?.[index] && (
                        <div className="message-analysis">
                          <span className="analysis-tag sentiment">
                            {analysis.message_analysis[index].sentiment}
                          </span>
                          {analysis.message_analysis[index].keywords && (
                            <div className="keywords">
                              {analysis.message_analysis[index].keywords.map((keyword, kIndex) => (
                                <span key={kIndex} className="keyword-tag">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary & Recommendations */}
          {analysis?.summary && (
            <div className="summary-section">
              <h3>
                <span className="icon">📋</span>
                Call Summary
              </h3>
              <div className="summary-content">
                <p>{analysis.summary}</p>
                
                {analysis.recommendations && (
                  <div className="recommendations">
                    <h4>Recommendations:</h4>
                    <ul>
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallAnalysis;