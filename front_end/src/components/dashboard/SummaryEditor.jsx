import React, { useState, useEffect } from 'react';
import { Save, Upload, Check, X, Cloud, Download } from 'lucide-react';
import googleDriveService from '../../services/googleDrive';
import { getClinicSettings } from '../../utils/clinicSettings';

const SummaryEditor = ({ summary, onSave }) => {
  const [formData, setFormData] = useState(summary);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [clinicSettings] = useState(getClinicSettings());
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Check Google Drive connection status
  useEffect(() => {
    const checkDriveConnection = () => {
      const connected = googleDriveService.isConnected();
      setIsDriveConnected(connected);
    };

    checkDriveConnection();
    
    // Check connection every 2 seconds (for when user connects/disconnects)
    const interval = setInterval(checkDriveConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveToDrive = async (e) => {
    e.preventDefault();
    
    if (!isDriveConnected) {
      alert('Please connect Google Drive in Settings before saving summaries.');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      console.log('🚀 Starting Google Drive upload...');
      const uploadResult = await googleDriveService.uploadSummary(formData);
      
      if (uploadResult.success) {
        setUploadStatus({
          type: 'success',
          message: uploadResult.message,
          driveLink: uploadResult.driveLink
        });
        
        // Call parent save handler with drive info
        if (onSave) {
          onSave({
            ...formData,
            driveLink: uploadResult.driveLink,
            fileId: uploadResult.fileId,
            fileName: uploadResult.fileName,
            uploadedAt: new Date().toISOString()
          });
        }
      } else {
        setUploadStatus({
          type: 'error',
          message: uploadResult.message
        });
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setIsUploading(true);
      const connectionResult = await googleDriveService.testConnection();
      
      if (connectionResult.success) {
        setIsDriveConnected(true);
        setUploadStatus({
          type: 'success',
          message: 'Google Drive connected successfully!'
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: `Connection failed: ${connectionResult.message}`
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: `Connection error: ${error.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveLocally = () => {
    // Save summary to localStorage as backup
    const localBackup = {
      ...formData,
      savedAt: new Date().toISOString(),
      id: Date.now().toString(),
      type: 'local_backup'
    };
    
    const existing = JSON.parse(localStorage.getItem('medhira_backups') || '[]');
    existing.push(localBackup);
    localStorage.setItem('medhira_backups', JSON.stringify(existing));
    
    setUploadStatus({
      type: 'success',
      message: 'Summary saved locally as backup!'
    });
    
    if (onSave) {
      onSave(formData);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsPdfLoading(true);
      const { pdf } = await import('@react-pdf/renderer');
      const { default: ClinicPrescriptionPDF } = await import('./ClinicPrescriptionPDF');
      const element = React.createElement(ClinicPrescriptionPDF, { summary: formData, clinic: clinicSettings });
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prescription_${formData.patientName || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setUploadStatus({ type: 'error', message: 'PDF generation failed. Please try again.' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const getMedicationText = () => formData.medication || 'Not specified';

  const downloadAsJSON = () => {
    const payload = {
      patientName: formData.patientName,
      age: formData.age,
      gender: formData.gender,
      symptoms: formData.symptoms,
      history: formData.history || 'Not specified',
      examination: formData.examination || 'Not specified',
      diagnosis: formData.diagnosis,
      medication: getMedicationText(),
      followUp: formData.followUp || 'Not specified',
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Medical_Summary_${formData.patientName}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsText = () => {
    const content = `
MEDICAL SUMMARY - ${formData.patientName}
Generated: ${new Date().toLocaleDateString()}

PATIENT INFORMATION:
Name: ${formData.patientName}
Age: ${formData.age}
Gender: ${formData.gender}

SYMPTOMS:
${formData.symptoms}

MEDICAL HISTORY:
${formData.history || 'Not specified'}

EXAMINATION FINDINGS:
${formData.examination || 'Not specified'}

DIAGNOSIS:
${formData.diagnosis}

MEDICATION:
${getMedicationText()}

FOLLOW-UP:
${formData.followUp || 'Not specified'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Medical_Summary_${formData.patientName}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="summary-editor">
      <div className="summary-header">
        <h2>Medical Summary</h2>
        <p>Review and edit the AI-generated summary</p>
        
        <div className="drive-status">
          {isDriveConnected ? (
            <div className="drive-connected">
              <Cloud size={16} />
              <span>Google Drive Connected</span>
            </div>
          ) : (
            <div className="drive-warning">
              <Cloud size={16} />
              <span>Google Drive not connected</span>
              <button 
                onClick={handleConnectDrive}
                disabled={isUploading}
                className="connect-button"
              >
                {isUploading ? 'Connecting...' : 'Connect Drive'}
              </button>
            </div>
          )}
        </div>
      </div>

      {uploadStatus && (
        <div className={`upload-status ${uploadStatus.type}`}>
          {uploadStatus.type === 'success' ? <Check size={18} /> : <X size={18} />}
          <span>{uploadStatus.message}</span>
          {uploadStatus.driveLink && (
            <a 
              href={uploadStatus.driveLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="drive-link"
            >
              View in Drive
            </a>
          )}
        </div>
      )}

      <form onSubmit={handleSaveToDrive} className="summary-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="patientName">Patient Name *</label>
            <input
              id="patientName"
              type="text"
              value={formData.patientName}
              onChange={(e) => handleChange('patientName', e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">Age *</label>
            <input
              id="age"
              type="text"
              value={formData.age}
              onChange={(e) => handleChange('age', e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender *</label>
            <input
              id="gender"
              type="text"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="form-input"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="symptoms">Symptoms & Chief Complaint *</label>
          <textarea
            id="symptoms"
            value={formData.symptoms}
            onChange={(e) => handleChange('symptoms', e.target.value)}
            className="form-textarea"
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="history">Medical History</label>
          <textarea
            id="history"
            value={formData.history}
            onChange={(e) => handleChange('history', e.target.value)}
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="examination">Examination Findings</label>
          <textarea
            id="examination"
            value={formData.examination}
            onChange={(e) => handleChange('examination', e.target.value)}
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="diagnosis">Diagnosis *</label>
          <textarea
            id="diagnosis"
            value={formData.diagnosis}
            onChange={(e) => handleChange('diagnosis', e.target.value)}
            className="form-textarea"
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="medication">Medication & Treatment</label>
          <textarea
            id="medication"
            value={formData.medication || ''}
            onChange={(e) => {
              handleChange('medication', e.target.value);
            }}
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="followUp">Follow-Up Instructions</label>
          <textarea
            id="followUp"
            value={formData.followUp}
            onChange={(e) => handleChange('followUp', e.target.value)}
            className="form-textarea"
            rows={2}
          />
        </div>

        <div className="action-buttons">
          <button 
            type="submit" 
            className="button button-primary save-button"
            disabled={isUploading || !isDriveConnected}
          >
            {isUploading ? (
              <>
                <div className="loading-spinner"></div>
                Uploading to Google Drive...
              </>
            ) : (
              <>
                <Upload size={18} />
                Save to Google Drive
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={handleSaveLocally}
            className="button button-secondary"
          >
            <Save size={18} />
            Save Locally
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={handleDownloadPDF}
            disabled={isPdfLoading}
          >
            <Download size={18} />
            {isPdfLoading ? 'Preparing PDF...' : 'Download as PDF'}
          </button>

          <button
            type="button"
            onClick={downloadAsText}
            className="button button-secondary"
          >
            <Download size={18} />
            Download as Text
          </button>

          <button
            type="button"
            onClick={downloadAsJSON}
            className="button button-secondary"
          >
            <Download size={18} />
            Download as JSON
          </button>
        </div>
      </form>
    </div>
  );
};

export default SummaryEditor;