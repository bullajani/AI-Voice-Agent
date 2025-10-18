import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import './CSS/IncomingCall.css';

const IncomingCall = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [callData, setCallData] = useState(null);
  const [isRinging, setIsRinging] = useState(true);

  useEffect(() => {
    console.log('📞 Incoming call data:', location.state);
    
    if (location.state?.callCreated) {
      setCallData(location.state);
      
      // Auto-accept after 3 seconds for demo purposes (remove this in production)
      const autoAcceptTimer = setTimeout(() => {
        console.log('🔔 Auto-accepting call for demo...');
        acceptCall();
      }, 3000);

      return () => clearTimeout(autoAcceptTimer);
    } else {
      // No call data, redirect to home
      navigate('/');
    }
  }, [location.state, navigate]);

  const acceptCall = () => {
    console.log('✅ Call accepted, navigating to active call...');
    setIsRinging(false);
    
    // Navigate to active call with all data
    navigate('/active-call', {
      state: {
        ...callData,
        callAccepted: true
      }
    });
  };

  const rejectCall = () => {
    console.log('❌ Call rejected');
    setIsRinging(false);
    navigate('/');
  };

  if (!callData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px' 
      }}>
        Loading call...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      {/* Ringing Animation */}
      <div style={{
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '30px',
        animation: isRinging ? 'pulse 1.5s infinite' : 'none',
        border: '4px solid rgba(255, 255, 255, 0.3)'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '48px'
        }}>
          📞
        </div>
      </div>

      {/* Call Information */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '32px',
          fontWeight: 'bold'
        }}>
          📞 Incoming Call
        </h1>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '25px',
          marginTop: '20px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ 
            margin: '0 0 20px 0', 
            color: '#ffeb3b',
            fontSize: '24px'
          }}>
            🤖 {callData.agentName || 'AI Agent'}
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            <div>
              <strong>👤 Driver:</strong><br/>
              <span style={{ color: '#e3f2fd' }}>
                {callData.driverName || 'Unknown'}
              </span>
            </div>
            <div>
              <strong>📦 Load Number:</strong><br/>
              <span style={{ color: '#e3f2fd' }}>
                {callData.loadNumber || 'Unknown'}
              </span>
            </div>
            <div>
              <strong>📞 Phone:</strong><br/>
              <span style={{ color: '#e3f2fd' }}>
                {callData.phoneNumber || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(76, 175, 80, 0.2)',
          borderRadius: '10px',
          border: '1px solid rgba(76, 175, 80, 0.3)'
        }}>
          <div style={{ fontSize: '14px', color: '#c8e6c9' }}>
            ✅ Call Ready • 🎤 Agent will speak first • 🔊 Check your audio
          </div>
        </div>
      </div>

      {/* Call Actions */}
      <div style={{
        display: 'flex',
        gap: '30px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Accept Button */}
        <button
          onClick={acceptCall}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#4caf50',
            border: 'none',
            color: 'white',
            fontSize: '32px',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(76, 175, 80, 0.4)',
            transition: 'all 0.3s ease',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 12px 25px rgba(76, 175, 80, 0.6)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 8px 20px rgba(76, 175, 80, 0.4)';
          }}
        >
          📞
        </button>

        {/* Reject Button */}
        <button
          onClick={rejectCall}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#f44336',
            border: 'none',
            color: 'white',
            fontSize: '32px',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(244, 67, 54, 0.4)',
            transition: 'all 0.3s ease',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 12px 25px rgba(244, 67, 54, 0.6)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 8px 20px rgba(244, 67, 54, 0.4)';
          }}
        >
          ❌
        </button>
      </div>

      {/* Action Labels */}
      <div style={{
        display: 'flex',
        gap: '70px',
        justifyContent: 'center',
        marginTop: '15px',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        <span style={{ color: '#4caf50' }}>Accept</span>
        <span style={{ color: '#f44336' }}>Reject</span>
      </div>

      {/* Auto-accept notification */}
      <div style={{
        marginTop: '30px',
        padding: '12px 20px',
        background: 'rgba(255, 193, 7, 0.2)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        fontSize: '14px',
        color: '#fff3c4'
      }}>
        🔔 Auto-accepting in 3 seconds for demo...
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(255, 255, 255, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default IncomingCall;