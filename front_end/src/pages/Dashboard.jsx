import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import AudioRecorder from '../components/dashboard/AudioRecorder';
import TranscriptViewer from '../components/dashboard/TranscriptViewer';
import SummaryEditor from '../components/dashboard/SummaryEditor';
import HistoryTable from '../components/dashboard/HistoryTable';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api'; 
import { useConsultations } from '../hooks/useConsultations';
import '../styles/dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { addConsultation } = useConsultations();
  const [activeTab, setActiveTab] = useState('record');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleRecordingComplete = async (audioBlob) => {
  console.log('Audio recording completed, uploading for  processing...');
  
  try {
    setUploadStatus({
      type: 'processing',
      message: ' processing your audio... This may take a minute.'
    });

    // Upload to backend for AI processing
    const response = await apiService.uploadAudio(audioBlob);
    
    // Poll for processing completion
    const checkStatus = async (consultationId) => {
      const statusResponse = await apiService.getAudioStatus(consultationId);
      
      if (statusResponse.status === 'completed') {
        const { consultation } = statusResponse;
        setTranscript(consultation.transcript);
        setSummary(consultation);
        setActiveTab('transcript');
        setUploadStatus(null);
      } else if (statusResponse.status === 'failed') {
        setUploadStatus({
          type: 'error',
          message: `Processing failed: ${statusResponse.error}`
        });
      } else {
        // Still processing, check again in 3 seconds
        setTimeout(() => checkStatus(consultationId), 3000);
      }
    };

    checkStatus(response.consultationId);

  } catch (error) {
    console.error('Audio upload failed:', error);
    setUploadStatus({
      type: 'error',
      message: 'Failed to process audio. Please try again.'
    });
  }
};

  const handleTranscriptSave = async (editedTranscript) => {
    console.log('Saving transcript:', editedTranscript);
    
    // Mock summary generation
    const mockSummary = {
      patientName: 'John Smith',
      age: '45',
      gender: 'Male',
      symptoms: 'Persistent headaches, pain level 6-7/10',
      history: 'No significant past medical history',
      examination: 'Neurological examination normal',
      diagnosis: 'Tension headaches',
      medication: 'Ibuprofen 400mg as needed',
      followUp: 'Return in 2 weeks if symptoms persist'
    };
    
    setSummary(mockSummary);
    setActiveTab('summary');
  };

  const handleSummarySave = async (summaryData) => {
    console.log('Saving summary to history:', summaryData);
    
    try {
      // Add to consultations history using your backend API
      const newConsultation = await addConsultation({
        patientName: summaryData.patientName,
        diagnosis: summaryData.diagnosis,
        summaryData: summaryData,
        status: 'completed',
        // Add any other fields your backend expects
      });

      setUploadStatus({
        type: 'success',
        message: `Summary for ${summaryData.patientName} saved successfully!`,
        consultationId: newConsultation.id
      });

      // Auto-switch to history tab after a delay
      setTimeout(() => {
        setActiveTab('history');
        setUploadStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Error saving summary:', error);
      setUploadStatus({
        type: 'error',
        message: 'Failed to save summary. Please try again.'
      });
    }
  };

  // Get user display name - handles both Firebase and JWT user objects
  const getUserDisplayName = () => {
    if (!user) return 'Doctor';
    
    // For JWT backend user (has username)
    if (user.username) return user.username;
    
    // For Firebase user (has name) or fallback
    return user.name || user.email || 'Doctor';
  };

  return (
    <div className="dashboard">
      <Navbar />
      
      {/* Welcome Banner */}
      <div className="dashboard-welcome">
        <h1>Welcome, {getUserDisplayName()}!</h1>
        <p>Ready to record your next patient consultation?</p>
      </div>

      {/* Upload Status Banner */}
      {uploadStatus && (
        <div className={`upload-status-banner ${uploadStatus.type}`}>
          <div className="status-content">
            <span className="status-message">{uploadStatus.message}</span>
            <button 
              onClick={() => setUploadStatus(null)}
              className="status-close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        <div className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'record' ? 'active' : ''}`}
              onClick={() => setActiveTab('record')}
            >
              🎤 Record Consultation
            </button>
            <button 
              className={`nav-item ${activeTab === 'transcript' ? 'active' : ''}`}
              onClick={() => setActiveTab('transcript')}
              disabled={!transcript}
            >
              📝 Transcript
            </button>
            <button 
              className={`nav-item ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
              disabled={!summary}
            >
              📄 Summary
            </button>
            <button 
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📚 History
            </button>
            <Link to="/settings" className="nav-item">
              ⚙️ Settings
            </Link>
          </nav>
        </div>

        <div className="dashboard-content">
          {activeTab === 'record' && (
            <AudioRecorder 
              onRecordingComplete={handleRecordingComplete}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
          )}
          
          {activeTab === 'transcript' && transcript && (
            <TranscriptViewer 
              transcript={transcript}
              onSave={handleTranscriptSave}
            />
          )}
          
          {activeTab === 'summary' && summary && (
            <SummaryEditor 
              summary={summary}
              onSave={handleSummarySave}
            />
          )}
          
          {activeTab === 'history' && (
            <HistoryTable />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;