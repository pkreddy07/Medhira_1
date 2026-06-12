import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import { Link } from 'react-router-dom';
import { Save, Cloud, Check, X, AlertCircle, TestTube } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import googleDriveService from '../services/googleDrive';
import { getClinicSettings, saveClinicSettings } from '../utils/clinicSettings';
import '../styles/settings.css';

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    username: user?.username || user?.name || '',
    email: user?.email || '',
  });
  const [clinicSettings, setClinicSettings] = useState(getClinicSettings());
  const [clinicSaveStatus, setClinicSaveStatus] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    checkDriveConnection();
  }, []);

  const checkDriveConnection = () => {
    const connected = googleDriveService.isConnected();
    setDriveConnected(connected);
    if (connected) {
      setConnectionStatus('Connected to Google Drive');
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

 const handleSave = async (e) => {
  e.preventDefault();
  setSaveStatus('saving');
  
  try {
    // Call your backend API
    await apiService.updateProfile({
      username: settings.username
      // Don't send email if it's not editable
    });
    
    setSaveStatus('success');
    setTimeout(() => setSaveStatus(''), 3000);
  } catch (error) {
    console.error('Error saving settings:', error);
    setSaveStatus('error');
  }
};

  const handleGoogleDriveConnect = async () => {
    setIsConnecting(true);
    setConnectionError('');
    setConnectionStatus('Connecting...');
    
    try {
      console.log('Starting Google Drive connection...');
      
      // Check environment variables
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || !import.meta.env.VITE_GOOGLE_API_KEY) {
        throw new Error('Google API credentials not configured. Please check your .env file.');
      }

      // Initialize and authenticate
      await googleDriveService.initialize();
      const token = await googleDriveService.authenticate();
      
      if (token) {
        setDriveConnected(true);
        setConnectionStatus('Successfully connected to Google Drive!');
        
        // Test folder creation
        try {
          const folderId = await googleDriveService.ensureFolder();
          setConnectionStatus(`Connected! Folder ready: ${folderId.substring(0, 8)}...`);
        } catch (folderError) {
          setConnectionStatus('Connected, but folder creation failed: ' + folderError.message);
        }
      }
    } catch (error) {
      console.error('Google Drive connection failed:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setConnectionError(errorMessage);
      setConnectionStatus(`Connection failed: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClinicChange = (field, value) => {
    setClinicSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleClinicSave = (e) => {
    e.preventDefault();
    saveClinicSettings(clinicSettings);
    setClinicSaveStatus('success');
    setTimeout(() => setClinicSaveStatus(''), 3000);
  };

  const handleGoogleDriveDisconnect = () => {
    googleDriveService.disconnect();
    setDriveConnected(false);
    setConnectionError('');
    setConnectionStatus('Disconnected from Google Drive');
  };

  const testGoogleDriveConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('Testing connection...');
    
    try {
      const result = await googleDriveService.testConnection();
      
      if (result.success) {
        setConnectionStatus(`✅ Test passed! ${result.message}`);
        setDriveConnected(true);
      } else {
        setConnectionStatus(`❌ Test failed: ${result.message}`);
        setConnectionError(result.error);
      }
    } catch (error) {
      setConnectionStatus(`❌ Test error: ${error.message}`);
      setConnectionError(error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const checkGoogleConfig = () => {
    const config = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY
    };
    
    const hasClientId = !!config.clientId && config.clientId !== 'your-google-client-id';
    const hasApiKey = !!config.apiKey && config.apiKey !== 'your-google-api-key';
    
    alert(`Google API Configuration:\n\n` +
          `Client ID: ${hasClientId ? '✅ Loaded' : '❌ Missing/Invalid'}\n` +
          `API Key: ${hasApiKey ? '✅ Loaded' : '❌ Missing/Invalid'}\n\n` +
          `Note: Make sure your .env file has actual credentials, not placeholder values.`);
  };

  return (
    <div className="settings-page">
      <Navbar />
      <div className="page-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>

        <div className="settings-content">

          {/* ── Clinic / Prescription Header ── */}
          <form onSubmit={handleClinicSave} className="settings-form" style={{ marginBottom: '2rem' }}>
            <div className="settings-section">
              <h2>Clinic &amp; Prescription Header</h2>
              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
                This information appears at the top of every PDF prescription you download.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label>Clinic / Hospital Name</label>
                  <input type="text" className="form-input"
                    value={clinicSettings.clinicName}
                    onChange={e => handleClinicChange('clinicName', e.target.value)}
                    placeholder="e.g. City Health Clinic" />
                </div>
                <div className="form-group">
                  <label>Doctor Name</label>
                  <input type="text" className="form-input"
                    value={clinicSettings.doctorName}
                    onChange={e => handleClinicChange('doctorName', e.target.value)}
                    placeholder="e.g. Arjun Sharma" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Qualification / Specialisation</label>
                  <input type="text" className="form-input"
                    value={clinicSettings.qualification}
                    onChange={e => handleClinicChange('qualification', e.target.value)}
                    placeholder="e.g. MBBS, MD (General Medicine)" />
                </div>
                <div className="form-group">
                  <label>Registration Number</label>
                  <input type="text" className="form-input"
                    value={clinicSettings.registrationNo}
                    onChange={e => handleClinicChange('registrationNo', e.target.value)}
                    placeholder="e.g. MCI-12345" />
                </div>
              </div>

              <div className="form-group">
                <label>Clinic Address</label>
                <input type="text" className="form-input"
                  value={clinicSettings.address}
                  onChange={e => handleClinicChange('address', e.target.value)}
                  placeholder="e.g. 12 Main Road, Hyderabad, Telangana 500001" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" className="form-input"
                    value={clinicSettings.phone}
                    onChange={e => handleClinicChange('phone', e.target.value)}
                    placeholder="e.g. +91 98765 43210" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-input"
                    value={clinicSettings.email}
                    onChange={e => handleClinicChange('email', e.target.value)}
                    placeholder="e.g. doctor@clinic.com" />
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button type="submit" className={`button button-primary ${clinicSaveStatus}`}>
                <Save size={18} />
                {clinicSaveStatus === 'success' ? 'Saved!' : 'Save Clinic Settings'}
              </button>
            </div>
          </form>

          <form onSubmit={handleSave} className="settings-form">
            <div className="settings-section">
              <h2>Profile Information</h2>
              
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={settings.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  className="form-input"
                  placeholder="Enter your username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="form-input"
                  placeholder="Enter your email"
                  disabled // Email might not be editable in JWT backend
                />
                <small className="form-hint">Email cannot be changed</small>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-header">
                <h2>Google Drive Integration</h2>
                <div className="settings-actions-row">
                  <button 
                    type="button" 
                    onClick={checkGoogleConfig}
                    className="button button-secondary"
                  >
                    Check Config
                  </button>
                  <button 
                    type="button" 
                    onClick={testGoogleDriveConnection}
                    disabled={isTesting}
                    className="button button-secondary"
                  >
                    <TestTube size={16} />
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>
              
              {connectionStatus && (
                <div className={`connection-status ${driveConnected ? 'connected' : 'disconnected'}`}>
                  {connectionStatus}
                </div>
              )}
              
              {connectionError && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {connectionError}
                </div>
              )}
              
              <div className={`drive-integration ${driveConnected ? 'connected' : 'disconnected'}`}>
                <div className="drive-status">
                  <div className="status-indicator">
                    {driveConnected ? (
                      <>
                        <Check size={20} className="connected-icon" />
                        <span>Connected to Google Drive</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={20} className="disconnected-icon" />
                        <span>Not connected to Google Drive</span>
                      </>
                    )}
                  </div>
                  
                  {driveConnected ? (
                    <button 
                      type="button" 
                      onClick={handleGoogleDriveDisconnect}
                      className="button button-secondary disconnect-button"
                    >
                      <X size={16} />
                      Disconnect
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleGoogleDriveConnect}
                      disabled={isConnecting}
                      className="button button-primary connect-button"
                    >
                      <Cloud size={16} />
                      {isConnecting ? 'Connecting...' : 'Connect Google Drive'}
                    </button>
                  )}
                </div>
                
                <p className="drive-description">
                  Connect your Google Drive to automatically save consultation summaries as PDF files.
                  Summaries will be saved to a folder called "Patient Summaries" in your Drive.
                </p>
                
                <div className="drive-requirements">
                  <h4>How it works:</h4>
                  <ul>
                    <li>✅ Click "Connect Google Drive" to authorize</li>
                    <li>✅ Choose your Google account</li>
                    <li>✅ Grant permission to create files</li>
                    <li>✅ Summaries auto-save to "Patient Summaries" folder</li>
                    <li>✅ Access files anytime from your Google Drive</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button 
                type="submit" 
                className={`button button-primary ${saveStatus}`}
                disabled={saveStatus === 'saving'}
              >
                <Save size={18} />
                {saveStatus === 'saving' ? 'Saving...' : 
                 saveStatus === 'success' ? 'Saved!' : 'Save Changes'}
              </button>
              
              <Link to="/dashboard" className="button button-secondary">
                Back to Dashboard
              </Link>
            </div>

            {saveStatus === 'success' && (
              <div className="success-message">
                Settings saved successfully!
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="error-message">
                Failed to save settings. Please try again.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;