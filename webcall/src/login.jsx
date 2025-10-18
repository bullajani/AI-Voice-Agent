import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('🔐 Login response:', data); // Debug log

      if (data.success && data.token) {
        // Store the token
        localStorage.setItem('token', data.token);
        console.log('✅ Token stored, redirecting to agent config');
        
        // Navigate to agent config page (start of the flow)
        navigate('/agent-config');
      } else {
        setErrors({ general: data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Network error. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, color: '#333', fontSize: '28px' }}>🚛 VoiceAgent</h1>
          <h2 style={{ margin: '10px 0', color: '#666', fontSize: '20px' }}>Welcome Back</h2>
        </div>

        {errors.general && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #fcc'
          }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              📧 Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.email ? '2px solid #e74c3c' : '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => {
                if (!errors.email) e.target.style.borderColor = '#007bff';
              }}
              onBlur={(e) => {
                if (!errors.email) e.target.style.borderColor = '#ddd';
              }}
            />
            {errors.email && (
              <span style={{ color: '#e74c3c', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                {errors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              🔒 Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '45px',
                  border: errors.password ? '2px solid #e74c3c' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => {
                  if (!errors.password) e.target.style.borderColor = '#007bff';
                }}
                onBlur={(e) => {
                  if (!errors.password) e.target.style.borderColor = '#ddd';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <span style={{ color: '#e74c3c', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                {errors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = '#0056b3';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = '#007bff';
            }}
          >
            {loading ? '⏳ Signing In...' : '🔐 Sign In'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#666'
        }}>
          Don't have an account?{' '}
          <Link 
            to="/signup" 
            style={{ 
              color: '#007bff', 
              textDecoration: 'none', 
              fontWeight: 'bold' 
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}