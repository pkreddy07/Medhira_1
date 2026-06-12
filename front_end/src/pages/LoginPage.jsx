import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import '../styles/auth.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { login, signInWithGoogle, authError, setAuthError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setAuthError('Please fill in all fields');
        return;
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        setAuthError('Please enter a valid email address');
        return;
      }

      await login(email, password);
      navigate('/dashboard'); // Redirect to dashboard
      
    } catch {
      // Error is already set in the auth hook
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      navigate('/dashboard'); // Redirect to dashboard
    } catch {
      // Error is already set in the auth hook
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setAuthError('Please enter your email address to reset password');
      return;
    }
    // You can implement forgot password flow here
    alert(`Password reset link would be sent to: ${email}`);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="back-button">
              <ArrowLeft size={20} />
            </Link>
            <h1>Welcome Back</h1>
            <p>Sign in to your account</p>
          </div>

          {authError && (
            <div className="error-message">
              {authError}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button 
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="google-signin-button"
          >
            <img 
              src="https://developers.google.com/identity/images/g-logo.png" 
              alt="Google" 
              className="google-logo"
            />
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={18} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter your password"
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
            </div>

            <button 
              type="button"
              onClick={handleForgotPassword}
              className="forgot-password-link"
            >
              Forgot your password?
            </button>

            <button 
              type="submit" 
              className="auth-button primary"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="auth-link">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-image">
          <div className="image-content">
            <h2>Medhira</h2>
            <p>Streamline your medical consultations with AI-powered summaries</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;