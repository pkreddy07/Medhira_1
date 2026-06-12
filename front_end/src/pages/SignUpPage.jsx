import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import '../styles/auth.css';
import { API_BASE_URL } from '../utils/constants';

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
    // Clear error when user starts typing
    if (authError) setAuthError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      const { username, email, password, confirmPassword } = formData;

      // Validation
      if (!username || !email || !password || !confirmPassword) {
        setAuthError('Please fill in all fields');
        return;
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        setAuthError('Please enter a valid email address');
        return;
      }

      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('Passwords do not match');
        return;
      }

      // Call backend API
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user data to localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setAuthError(data.message || 'Registration failed');
      }
      
    } catch (err) {
      console.error('Signup error:', err);
      setAuthError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If you want to use the apiService instead of fetch directly:
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setAuthError('');
  //   setLoading(true);

  //   try {
  //     const { username, email, password, confirmPassword } = formData;

  //     // Validation (same as above)

  //     const data = await apiService.signup({
  //       username: username,
  //       email: email,
  //       password: password
  //     });

  //     // Save token and user data
  //     localStorage.setItem('token', data.token);
  //     localStorage.setItem('user', JSON.stringify(data.user));
      
  //     // Navigate to dashboard
  //     navigate('/dashboard');
      
  //   } catch (err) {
  //     setAuthError(err.message || 'Registration failed');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  if (verificationSent) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="verification-sent">
              <CheckCircle size={64} className="success-icon" />
              <h1>Verify Your Email</h1>
              <p>
                We've sent a verification link to <strong>{formData.email}</strong>
              </p>
              <p className="verification-instructions">
                Please check your inbox and click the verification link to activate your account.
                You won't be able to sign in until you verify your email address.
              </p>
              <div className="verification-actions">
                <button 
                  onClick={() => setVerificationSent(false)}
                  className="button button-secondary"
                >
                  Back to Sign Up
                </button>
                <Link to="/login" className="button button-primary">
                  Go to Login
                </Link>
              </div>
              <div className="verification-help">
                <p>Didn't receive the email?</p>
                <ul>
                  <li>Check your spam folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="back-button">
              <ArrowLeft size={20} />
            </Link>
            <h1>Create Account</h1>
            <p>Get started with your free account</p>
          </div>

          {authError && (
            <div className="error-message">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                <User size={18} />
                Username
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="form-input"
                placeholder="Choose a username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={18} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={18} />
                Password
              </label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Create a password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className="form-hint">At least 6 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <Lock size={18} />
                Confirm Password
              </label>
              <div className="password-input-container">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-button primary"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="terms-notice">
            <p>
              By creating an account, you agree to our{' '}
              <a href="/terms" className="auth-link">Terms of Service</a> and{' '}
              <a href="/privacy" className="auth-link">Privacy Policy</a>
            </p>
          </div>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-image">
          <div className="image-content">
            <h2>Start Simplifying Consultations</h2>
            <p>Join medical professionals using AI to save time and improve patient care</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;