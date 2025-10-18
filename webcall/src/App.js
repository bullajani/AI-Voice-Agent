import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './signup'
import Login from './login';
import AgentConfig from './AgentConfig';
import Call from './call'; // ← Make sure this import is correct
import CallHistory from './callHistory';
import IncomingCall from './incomingcall';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route - redirect to signup */}
          <Route path="/" element={<Navigate to="/signup" />} />
          
          {/* Auth routes */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route 
            path="/agent-config" 
            element={
              <ProtectedRoute>
                <AgentConfig />
              </ProtectedRoute>
            } 
          />
          
          {/* Call routes - both paths point to same component */}
          <Route 
            path="/call" 
            element={
              <ProtectedRoute>
                <Call />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/active-call" 
            element={
              <ProtectedRoute>
                <Call />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/incoming-call" 
            element={
              <ProtectedRoute>
                <IncomingCall />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/call-history" 
            element={
              <ProtectedRoute>
                <CallHistory />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/agent-config" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
