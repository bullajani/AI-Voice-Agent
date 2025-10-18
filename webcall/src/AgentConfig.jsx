import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CSS/AgentConfig.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const AgentConfig = () => {
  const navigate = useNavigate();
  
  const [agents, setAgents] = useState([]); // Initialize as empty array
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ADD MISSING STATE VARIABLES
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state for agent configuration
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scenario: 'driver_checkin',
    model: 'gpt-4o', 
    modelTemperature: 0.3,
    startSpeaker: 'agent',
    beginMessage: '',
    generalPrompt: '',
    dynamicVariables: {},
    states: [],
    dataFields: [],
    advancedSettings: {
      enableBackchanneling: true,
      enableFillerWords: true,
      interruptionSensitivity: 'medium',
      responseSpeed: 'normal',
      enableEmergencyDetection: true,
      emergencyKeywords: ['emergency', 'accident', 'breakdown', 'help', 'urgent']
    }
  });

  // Test call form state
  const [testData, setTestData] = useState({
    driverName: 'John Doe',
    phoneNumber: '+1234567890',
    loadNumber: 'LOAD123'
  });

  // Selected agent ID for call interface
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Keep current test call info locally so we don't navigate away
  const [currentCall, setCurrentCall] = useState(null);
  
  // Call form state
  const [callForm, setCallForm] = useState({
    driverName: 'John Miller',
    phoneNumber: '+15551234567',
    loadNumber: 'LOAD123'
  });
  const [isStartingCall, setIsStartingCall] = useState(false);

  useEffect(() => {
    debugTokenStatus(); // ← ADD THIS
    fetchAgents();
  }, []);

  const debugTokenStatus = () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Token Debug:');
    console.log('- Token exists:', !!token);
    console.log('- Token length:', token?.length);
    console.log('- Token preview:', token?.substring(0, 30) + '...');
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('- Token expires:', new Date(payload.exp * 1000));
        console.log('- Token valid:', Date.now() < payload.exp * 1000);
        console.log('- User ID:', payload.userId);
      } catch (e) {
        console.log('- Token decode error:', e.message);
      }
    }
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching agents from:', `${API_URL}/api/agents`);
      
      const response = await fetch(`${API_URL}/api/agents`);
      const data = await response.json();
      
      console.log('📥 Response data:', data);
      
      if (data.success && data.data) {
        setAgents(data.data); // Fix: use data.data instead of data.agents
        console.log('✅ Agents loaded:', data.data.length);

        // Auto-select the working agent (Dispina)
        const workingAgent = data.data.find(agent => agent.hasRetellAgent);
        if (workingAgent) {
          setSelectedAgentId(workingAgent._id);
          setSelectedAgent(workingAgent); // ALSO SET SELECTED AGENT
        }
      } else {
        console.error('❌ Invalid response structure:', data);
        setAgents([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('❌ Error fetching agents:', error);
      setAgents([]); // Fallback to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentDetails = async (agentId) => {
    try {
      console.log('🔄 Fetching agent details for:', agentId);
      
      const response = await fetch(`${API_URL}/api/agents/${agentId}`);
      const data = await response.json();
      
      console.log('📥 Agent details response:', data);
      
      if (data.success && data.data) {
        const agent = data.data; // Fix: use data.data instead of data.agent
        setSelectedAgent(agent);
        setFormData({
          name: agent.name || '',
          description: agent.description || '',
          scenario: agent.scenario || 'driver_checkin',
          model: agent.model || 'gpt-4o',
          modelTemperature: agent.modelTemperature || 0.3,
          startSpeaker: agent.startSpeaker || 'agent',
          beginMessage: agent.beginMessage || '',
          generalPrompt: agent.generalPrompt || '',
          dynamicVariables: agent.dynamicVariables || {},
          states: agent.states || [],
          dataFields: agent.dataFields || [],
          advancedSettings: agent.advancedSettings || formData.advancedSettings
        });
      } else {
        console.error('❌ Failed to fetch agent details:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching agent details:', error);
    }
  };

  const createDefaultAgents = async () => {
    try {
      setLoading(true);
      console.log('🏭 Creating default agents...');
      
      const response = await fetch(`${API_URL}/api/agents/defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      console.log('📥 Default agents response:', data);
      
      if (data.success) {
        alert('Default agents created successfully!');
        fetchAgents();
      } else {
        alert(data.message || 'Error creating default agents');
      }
    } catch (error) {
      console.error('❌ Error creating defaults:', error);
      alert('Error creating default agents');
    } finally {
      setLoading(false);
    }
  };

  const saveAgent = async () => {
    try {
      setLoading(true);
      
      // Validation
      if (!formData.name || !formData.description || !formData.beginMessage || !formData.generalPrompt) {
        alert('Please fill in all required fields: Name, Description, Begin Message, and General Prompt');
        setLoading(false);
        return;
      }
      
      const url = isCreating 
        ? `${API_URL}/api/agents`
        : `${API_URL}/api/agents/${selectedAgent.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';

      console.log('💾 Saving agent:', { url, method, formData });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('📥 Save response:', data);

      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, data);
        throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
      }

      if (data.success) {
        alert(`Agent ${isCreating ? 'created' : 'updated'} successfully!`);
        setIsCreating(false);
        setIsEditing(false);
        fetchAgents();
        
        if (isCreating && data.data) {
          // Select the newly created agent
          fetchAgentDetails(data.data.id);
        }
      } else {
        alert(data.message || `Error ${isCreating ? 'creating' : 'updating'} agent`);
      }
    } catch (error) {
      console.error(`❌ Error saving agent:`, error);
      alert(`Error ${isCreating ? 'creating' : 'updating'} agent: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createLLM = async (agentId) => {
    try {
      setLoading(true);
      console.log('🤖 Creating LLM for agent:', agentId);
      
      const response = await fetch(`${API_URL}/api/agents/${agentId}/create-llm`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📥 LLM creation response:', data);

      if (data.success) {
        alert('Retell LLM created successfully!');
        fetchAgents();
        if (selectedAgent && selectedAgent.id === agentId) {
          fetchAgentDetails(agentId);
        }
      } else {
        alert(data.message || 'Error creating LLM');
      }
    } catch (error) {
      console.error('❌ Error creating LLM:', error);
      alert('Error creating LLM');
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (agentId) => {
    try {
      setLoading(true);
      console.log('🤖 Creating Retell Agent for:', agentId);
      
      const response = await fetch(`${API_URL}/api/agents/${agentId}/create-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      console.log('📥 Agent creation response:', data);

      if (data.success) {
        alert('Retell Agent created successfully! You can now test calls.');
        fetchAgents();
        if (selectedAgent && selectedAgent.id === agentId) {
          fetchAgentDetails(agentId);
        }
      } else {
        alert(data.message || 'Error creating Agent');
      }
    } catch (error) {
      console.error('❌ Error creating Agent:', error);
      alert('Error creating Agent');
    } finally {
      setLoading(false);
    }
  };

  const testAgent = async (agentId) => {
    try {
      setLoading(true);
      console.log('🧪 Testing agent:', agentId, 'with data:', testData);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login first to test agents');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/agents/${agentId}/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      console.log('📥 Test response:', data);

      if (response.ok && data.success) {
        // Keep user on the Agent Config page — store call info locally
        setCurrentCall({
          access_token: data.access_token,
          callId: data.call_id,
          agentName: data.agent_name || selectedAgent?.name,
          driverName: testData.driverName,
          phoneNumber: testData.phoneNumber,
          loadNumber: testData.loadNumber,
          createdAt: Date.now()
        });
        alert('Test call created successfully! Call started — staying on this page.');
      } else {
        if (response.status === 400) {
          alert(`Cannot test agent: ${data.message}\n\nPlease create a Retell agent first by clicking "Create Agent"`);
        } else if (response.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          alert(data.message || 'Error creating test call');
        }
      }
    } catch (error) {
      console.error('❌ Error testing agent:', error);
      alert('Error creating test call: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startCreating = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedAgent(null);
    setFormData({
      name: '',
      description: '',
      scenario: 'driver_checkin',
      model: 'gpt-4o',
      modelTemperature: 0.3,
      startSpeaker: 'agent',
      beginMessage: '',
      generalPrompt: '',
      dynamicVariables: {},
      states: [],
      dataFields: [],
      advancedSettings: {
        enableBackchanneling: true,
        enableFillerWords: true,
        interruptionSensitivity: 'medium',
        responseSpeed: 'normal',
        enableEmergencyDetection: true,
        emergencyKeywords: ['emergency', 'accident', 'breakdown', 'help', 'urgent']
      }
    });
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedAgent) {
      fetchAgentDetails(selectedAgent.id);
    } else {
      setFormData({});
    }
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAdvancedSetting = (setting, value) => {
    setFormData(prev => ({
      ...prev,
      advancedSettings: {
        ...prev.advancedSettings,
        [setting]: value
      }
    }));
  };

  const handleCallInputChange = (e) => {
    setCallForm({
      ...callForm,
      [e.target.name]: e.target.value
    });
  };

  // FIXED: Simplified startCall function
  const startCall = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (!selectedAgent || !selectedAgent.hasRetellAgent) {
        alert('Please select a working agent first');
        return;
      }

      const callData = {
        driverName: callForm.driverName.trim() || "John Miller",
        phoneNumber: callForm.phoneNumber.trim() || "+15551234567", 
        loadNumber: callForm.loadNumber.trim() || "LOAD123",
        agentConfigId: selectedAgent.id,
      };

      const token = localStorage.getItem('token');

      console.log('🔄 Creating call with data:', callData);

      const response = await fetch(`${API_URL}/api/calls/web-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(callData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Call created:', data);

      if (data.success && data.access_token) {
        // 🔥 NAVIGATE TO INCOMING CALL PAGE FIRST
        navigate('/incoming-call', {
          state: {
            access_token: data.access_token,
            callId: data.call_id,
            agentName: data.agent_name || selectedAgent.name,
            driverName: callData.driverName,
            phoneNumber: callData.phoneNumber,
            loadNumber: callData.loadNumber,
            callCreated: true
          }
        });
      } else {
        throw new Error(data.message || 'Failed to create call');
      }

    } catch (err) {
      console.error("❌ Start call error:", err);
      setError("Failed to start call: " + err.message);
      alert("Failed to start call: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // REMOVED: Duplicate functions (navigateToCall and startDirectCall)
  // They were redundant with startCall function

  // Ensure agents is always an array
  const safeAgents = Array.isArray(agents) ? agents : [];

  const goToCallHistory = () => {
    navigate('/call-history');
  };

  return (
    <div className="agent-config-container">
      <div className="agent-config-header">
        <h1>🤖 AI Agent Configuration</h1>
        <p>Configure and manage your voice agents for logistics scenarios</p>
        
        {/* ERROR DISPLAY */}
        {error && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '12px',
            borderRadius: '8px',
            margin: '10px 0',
            textAlign: 'center'
          }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={() => setError('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#721c24',
                float: 'right',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✖️
            </button>
          </div>
        )}
      </div>

      <div className="agent-config-layout">
        {/* Left Panel - Agent List */}
        <div className="agents-panel">
          <div className="panel-header">
            <h2>Agents</h2>
            <div className="panel-actions">
              <button 
                onClick={startCreating}
                className="btn btn-primary"
                disabled={loading}
              >
                + New Agent
              </button>
              <button 
                onClick={createDefaultAgents}
                className="btn btn-secondary"
                disabled={loading}
              >
                Create Defaults
              </button>
            </div>
          </div>

          <div className="agents-list">
            {loading && safeAgents.length === 0 ? (
              <div className="loading">Loading agents...</div>
            ) : safeAgents.length === 0 ? (
              <div className="empty-state">
                <p>No agents configured</p>
                <button onClick={createDefaultAgents} className="btn btn-primary">
                  Create Default Agents
                </button>
              </div>
            ) : (
              safeAgents.map(agent => (
                <div 
                  key={agent.id}
                  className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                  onClick={() => fetchAgentDetails(agent.id)}
                >
                  <div className="agent-info">
                    <h3>{agent.name}</h3>
                    <p className="agent-description">{agent.description}</p>
                    <div className="agent-meta">
                      <span className={`scenario ${agent.scenario}`}>
                        {agent.scenario?.replace('_', ' ') || 'Unknown'}
                      </span>
                      <span className={`status ${agent.isActive ? 'active' : 'inactive'}`}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {agent.hasRetellLlm && <span className="llm-badge">LLM</span>}
                      {agent.hasRetellAgent && <span className="agent-badge">Agent</span>}
                    </div>
                    <div className="agent-stats">
                      <small>Used {agent.usageCount || 0} times</small>
                      {agent.lastUsed && (
                        <small>Last: {new Date(agent.lastUsed).toLocaleDateString()}</small>
                      )}
                    </div>
                  </div>
                </div>
              ))
           ) }
          </div>
        </div>

        {/* Right Panel - Agent Details/Editor */}
        <div className="details-panel">
          {!selectedAgent && !isCreating ? (
            <div className="welcome-screen">
              <h2>Welcome to Agent Configuration</h2>
              <p>Select an agent from the list to view details, or create a new one.</p>
              
              <div className="feature-highlights">
                <div className="feature">
                  <h3>🎯 Scenario-Based Agents</h3>
                  <p>Pre-configured for driver check-ins and emergency protocols</p>
                </div>
                <div className="feature">
                  <h3>🔄 State Management</h3>
                  <p>Dynamic conversation flows with intelligent state transitions</p>
                </div>
                <div className="feature">
                  <h3>📊 Data Extraction</h3>
                  <p>Structured data collection from voice conversations</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="agent-details">
              <div className="details-header">
                <h2>
                  {isCreating ? 'Create New Agent' : selectedAgent?.name}
                </h2>
                <div className="details-actions">
                  {!isEditing ? (
                    <>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="btn btn-secondary"
                      >
                        Edit
                      </button>
                      {selectedAgent && !selectedAgent.hasRetellLlm && (
                        <button 
                          onClick={() => createLLM(selectedAgent.id)}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          Create LLM
                        </button>
                      )}
                      {selectedAgent && selectedAgent.hasRetellLlm && !selectedAgent.hasRetellAgent && (
                        <button 
                          onClick={() => createAgent(selectedAgent.id)}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          Create Agent
                        </button>
                      )}
                      {selectedAgent && selectedAgent.hasRetellAgent && (
                        <>
                          <button 
                            onClick={() => testAgent(selectedAgent.id)}
                            className="btn btn-success"
                            disabled={loading}
                          >
                            Test Agent
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={saveAgent}
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {isCreating ? 'Create' : 'Save'}
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Agent Configuration Form */}
              <div className="config-form">
                {/* Basic Configuration */}
                <div className="config-section">
                  <h3>Basic Configuration</h3>
                  
                  <div className="form-group">
                    <label>Agent Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter agent name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Describe what this agent does"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Scenario</label>
                      <select
                        value={formData.scenario}
                        onChange={(e) => updateFormField('scenario', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="driver_checkin">Driver Check-in</option>
                        <option value="emergency_protocol">Emergency Protocol</option>
                        <option value="general">General</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>AI Model</label>
                      <select
                        value={formData.model}
                        onChange={(e) => updateFormField('model', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="gpt-4o">GPT-4O</option>
                        <option value="gpt-4o-mini">GPT-4O Mini</option>
                        <option value="gpt-4.1">GPT-4.1</option>
                        <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Conversation Configuration */}
                <div className="config-section">
                  <h3>Conversation Setup</h3>
                  
                  <div className="form-group">
                    <label>Begin Message</label>
                    <textarea
                      value={formData.beginMessage}
                      onChange={(e) => updateFormField('beginMessage', e.target.value)}
                      disabled={!isEditing}
                      placeholder="First message the agent will say"
                    />
                    <small>Use variables like {`{{driver_name}}`} and {`{{load_number}}`} for dynamic content</small>
                  </div>

                  <div className="form-group">
                    <label>General Prompt</label>
                    <textarea
                      value={formData.generalPrompt}
                      onChange={(e) => updateFormField('generalPrompt', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Overall instructions for the agent's behavior"
                      rows="4"
                    />
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="config-section">
                  <h3>Advanced Settings</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Temperature</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.modelTemperature}
                        onChange={(e) => updateFormField('modelTemperature', parseFloat(e.target.value))}
                        disabled={!isEditing}
                      />
                      <span>{formData.modelTemperature}</span>
                    </div>

                    <div className="form-group">
                      <label>Start Speaker</label>
                      <select
                        value={formData.startSpeaker}
                        onChange={(e) => updateFormField('startSpeaker', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="agent">Agent</option>
                        <option value="user">User</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-checkboxes">
                    <label className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={formData.advancedSettings.enableBackchanneling}
                        onChange={(e) => updateAdvancedSetting('enableBackchanneling', e.target.checked)}
                        disabled={!isEditing}
                      />
                      Enable Backchanneling (uh-huh, mm-hmm)
                    </label>

                    <label className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={formData.advancedSettings.enableFillerWords}
                        onChange={(e) => updateAdvancedSetting('enableFillerWords', e.target.checked)}
                        disabled={!isEditing}
                      />
                      Enable Filler Words (um, uh)
                    </label>

                    <label className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={formData.advancedSettings.enableEmergencyDetection}
                        onChange={(e) => updateAdvancedSetting('enableEmergencyDetection', e.target.checked)}
                        disabled={!isEditing}
                      />
                      Enable Emergency Detection
                    </label>
                  </div>
                </div>

                {/* Test & Call Section */}
                {selectedAgent && selectedAgent.hasRetellAgent && !isEditing && (
                  <>
                    <div className="config-section">
                      <h3>🧪 Test Agent</h3>
                      <p>Test your agent with sample data</p>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Driver Name</label>
                          <input
                            type="text"
                            value={testData.driverName}
                            onChange={(e) => setTestData(prev => ({...prev, driverName: e.target.value}))}
                          />
                        </div>

                        <div className="form-group">
                          <label>Phone Number</label>
                          <input
                            type="text"
                            value={testData.phoneNumber}
                            onChange={(e) => setTestData(prev => ({...prev, phoneNumber: e.target.value}))}
                          />
                        </div>

                        <div className="form-group">
                          <label>Load Number</label>
                          <input
                            type="text"
                            value={testData.loadNumber}
                            onChange={(e) => setTestData(prev => ({...prev, loadNumber: e.target.value}))}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => testAgent(selectedAgent.id)}
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginRight: '12px' }}
                      >
                        🧪 Start Test Call
                      </button>
                    </div>

                    {/* ENHANCED: Call Interface Section */}
                    <div className="config-section" style={{
                      background: '#f8f9fa',
                      border: '2px solid #28a745',
                      borderRadius: '12px',
                      padding: '24px',
                      marginTop: '20px'
                    }}>
                      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h3 style={{ color: '#28a745', margin: '0 0 8px 0' }}>
                          📞 Ready to Make Calls!
                        </h3>
                        <p style={{ margin: '0', color: '#666' }}>
                          Your agent <strong>{selectedAgent.name}</strong> is ready to use
                        </p>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label style={{ fontWeight: 'bold' }}>Driver Name</label>
                          <input
                            type="text"
                            name="driverName"
                            value={callForm.driverName}
                            onChange={handleCallInputChange}
                            placeholder="Enter driver name"
                            style={{
                              padding: '12px',
                              fontSize: '16px',
                              border: '2px solid #ddd',
                              borderRadius: '8px'
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: 'bold' }}>Phone Number</label>
                          <input
                            type="tel"
                            name="phoneNumber"
                            value={callForm.phoneNumber}
                            onChange={handleCallInputChange}
                            placeholder="+1234567890"
                            style={{
                              padding: '12px',
                              fontSize: '16px',
                              border: '2px solid #ddd',
                              borderRadius: '8px'
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: 'bold' }}>Load Number</label>
                          <input
                            type="text"
                            name="loadNumber"
                            value={callForm.loadNumber}
                            onChange={handleCallInputChange}
                            placeholder="LOAD123"
                            style={{
                              padding: '12px',
                              fontSize: '16px',
                              border: '2px solid #ddd',
                              borderRadius: '8px'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <button 
                          onClick={startCall}
                          disabled={isLoading || isStartingCall}
                          style={{
                            background: (isLoading || isStartingCall) ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '16px 32px',
                            borderRadius: '25px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: (isLoading || isStartingCall) ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
                            transition: 'all 0.3s ease',
                            minWidth: '200px'
                          }}
                          onMouseOver={(e) => {
                            if (!isLoading && !isStartingCall) {
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = '0 6px 16px rgba(40, 167, 69, 0.4)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
                          }}
                        >
                          {(isLoading || isStartingCall) ? '🔄 Starting Call...' : '📞 Start Call'}
                        </button>
                      </div>

                      <div style={{ 
                        textAlign: 'center', 
                        marginTop: '16px',
                        padding: '12px',
                        background: '#e3f2fd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#1976d2'
                      }}>
                        💡 <strong>How it works:</strong> Click "Start Call" → You'll be taken to the live call interface → Agent will speak first
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={goToCallHistory}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          View Call History
        </button>
      </div>
    </div>
  );
};

export default AgentConfig;