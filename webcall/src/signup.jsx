import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

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
    if (error) setError('');
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email.trim().toLowerCase(), 
          password: formData.password, 
          name: formData.name.trim() 
        }),
      });

      const data = await response.json();
      console.log('📝 Signup response:', data);

      if (data.success) {
        console.log('✅ Signup successful, redirecting to login');
        alert('Account created successfully! Please login.');
        navigate('/login');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Network error. Please try again later.');
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
          <h2 style={{ margin: '10px 0', color: '#666', fontSize: '20px' }}>Create Account</h2>
        </div>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              👤 Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.name ? '2px solid #e74c3c' : '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                if (!errors.name) e.target.style.borderColor = '#007bff';
              }}
              onBlur={(e) => {
                if (!errors.name) e.target.style.borderColor = '#ddd';
              }}
            />
            {errors.name && (
              <span style={{ color: '#e74c3c', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                {errors.name}
              </span>
            )}
          </div>

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
                transition: 'border-color 0.3s',
                boxSizing: 'border-box'
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
          <div style={{ marginBottom: '20px' }}>
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
                placeholder="Enter your password (min 6 characters)"
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '45px',
                  border: errors.password ? '2px solid #e74c3c' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  boxSizing: 'border-box'
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

          {/* Confirm Password Field */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              🔒 Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '45px',
                  border: errors.confirmPassword ? '2px solid #e74c3c' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!errors.confirmPassword) e.target.style.borderColor = '#007bff';
                }}
                onBlur={(e) => {
                  if (!errors.confirmPassword) e.target.style.borderColor = '#ddd';
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <span style={{ color: '#e74c3c', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                {errors.confirmPassword}
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
            {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#666'
        }}>
          Already have an account?{' '}
          <Link 
            to="/login" 
            style={{ 
              color: '#007bff', 
              textDecoration: 'none', 
              fontWeight: 'bold' 
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}