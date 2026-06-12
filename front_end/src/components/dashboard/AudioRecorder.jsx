import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Play, Pause, Trash2 } from 'lucide-react';
import apiService from '../../services/api';

const AudioRecorder = ({ onRecordingComplete, isRecording, setIsRecording, consultationId, onStatusUpdate }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [consultationData, setConsultationData] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const statusCheckRef = useRef(null);

  // Check processing status if consultationId is provided
  useEffect(() => {
    if (consultationId) {
      checkProcessingStatus();
      // Set up periodic status checking
      statusCheckRef.current = setInterval(checkProcessingStatus, 3000);
      
      return () => {
        if (statusCheckRef.current) {
          clearInterval(statusCheckRef.current);
        }
      };
    }
  }, [consultationId]);

  const checkProcessingStatus = async () => {
    try {
      const data = await apiService.getAudioStatus(consultationId);
      
      if (data.success) {
        setProcessingStatus(data.status);
        
        if (data.status === 'completed' && data.consultation) {
          setConsultationData(data.consultation);
          if (onStatusUpdate) {
            onStatusUpdate('completed', data.consultation);
          }
          // Stop checking status once completed
          if (statusCheckRef.current) {
            clearInterval(statusCheckRef.current);
          }
        } else if (data.status === 'failed') {
          if (onStatusUpdate) {
            onStatusUpdate('failed', null, data.error);
          }
          // Stop checking status if failed
          if (statusCheckRef.current) {
            clearInterval(statusCheckRef.current);
          }
        }
      }
    } catch (error) {
      console.error('Error checking processing status:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
        
        // Reset recording time
        setRecordingTime(0);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check permissions and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid audio file (MP3, WAV, M4A, etc.)');
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size too large. Please upload files smaller than 50MB.');
        return;
      }

      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      if (onRecordingComplete) {
        onRecordingComplete(file);
      }
    }
    // Reset input
    event.target.value = '';
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const clearRecording = () => {
    setAudioUrl(null);
    setConsultationData(null);
    setProcessingStatus(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    // Clean up URL object
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploaded': return 'status-uploaded';
      case 'transcribing': return 'status-transcribing';
      case 'summarizing': return 'status-summarizing';
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      default: return 'status-default';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'uploaded': return 'Audio uploaded, starting processing...';
      case 'transcribing': return 'Transcribing audio...';
      case 'summarizing': return 'Generating medical summary...';
      case 'completed': return 'Processing completed!';
      case 'failed': return 'Processing failed';
      default: return 'Ready to record';
    }
  };

  return (
    <div className="audio-recorder-card">
      <h2 className="audio-recorder-title">
        🎤 Medical Consultation Recorder
      </h2>
      
      {/* Recording Controls */}
      <div className="recorder-controls">
        <div className="controls-row">
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className="record-button"
            >
              <Mic size={20} />
              Start Recording
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="stop-button recording-pulse"
            >
              <Square size={20} />
              Stop Recording ({formatTime(recordingTime)})
            </button>
          )}
          
          <label className="upload-button">
            <Upload size={18} />
            Upload Audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="file-input-hidden"
            />
          </label>
        </div>

        {/* Status Display */}
        {(processingStatus || consultationId) && (
          <div className="status-display">
            <div className={`status-message ${getStatusColor(processingStatus)}`}>
              {getStatusMessage(processingStatus)}
            </div>
            {consultationId && (
              <div className="consultation-id">
                Consultation ID: {consultationId}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audio Preview */}
      {audioUrl && (
        <div className="audio-preview">
          <div className="audio-preview-header">
            <h3 className="audio-preview-title">Audio Preview:</h3>
            <button
              onClick={clearRecording}
              className="clear-button"
              title="Clear recording"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          <div className="audio-controls">
            <button
              onClick={togglePlayback}
              className="play-button"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="audio-player"
              controls
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )}

      {/* Consultation Results */}
      {consultationData && (
        <div className="consultation-results">
          <h3 className="results-title">
            ✅ Medical Summary Generated
          </h3>
          
          <div className="results-grid">
            <div className="result-item">
              <strong>Patient:</strong> {consultationData.patientName}
            </div>
            <div className="result-item">
              <strong>Age/Gender:</strong> {consultationData.age} / {consultationData.gender}
            </div>
            <div className="result-item full-width">
              <strong>Symptoms:</strong> {consultationData.symptoms}
            </div>
            <div className="result-item full-width">
              <strong>Diagnosis:</strong> {consultationData.diagnosis}
            </div>
            <div className="result-item full-width">
              <strong>Medication:</strong> {consultationData.medication}
            </div>
            <div className="result-item full-width">
              <strong>Follow-up:</strong> {consultationData.followUp}
            </div>
          </div>
        </div>
      )}

      {/* Processing Instructions */}
      {!consultationData && !processingStatus && (
        <div className="instructions">
          <p>🎧 Record a doctor-patient consultation or upload an audio file</p>
          <p>💡 The system will automatically transcribe and generate a medical summary</p>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;