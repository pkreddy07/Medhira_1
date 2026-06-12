import React, { useState, useEffect } from 'react';
import { Save, Edit } from 'lucide-react';

const TranscriptViewer = ({ transcript, onSave }) => {
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  const handleSave = () => {
    onSave(editedTranscript);
    setIsEditing(false);
  };

  const parseTranscript = (text) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('DOCTOR:')) {
        return (
          <div key={index} className="transcript-line doctor-line">
            <strong>DOCTOR:</strong> {line.replace('DOCTOR:', '').trim()}
          </div>
        );
      } else if (line.startsWith('PATIENT:')) {
        return (
          <div key={index} className="transcript-line patient-line">
            <strong>PATIENT:</strong> {line.replace('PATIENT:', '').trim()}
          </div>
        );
      }
      return (
        <div key={index} className="transcript-line">
          {line}
        </div>
      );
    });
  };

  return (
    <div className="transcript-viewer">
      <div className="transcript-header">
        <h2>Consultation Transcript</h2>
        <div className="transcript-actions">
          {isEditing ? (
            <button onClick={handleSave} className="button button-primary">
              <Save size={18} />
              Save Transcript
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="button button-secondary">
              <Edit size={18} />
              Edit Transcript
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={editedTranscript}
          onChange={(e) => setEditedTranscript(e.target.value)}
          className="transcript-editor"
          rows={40}
          style={{ width: '800px' }}
        />
      ) : (
        <div className="transcript-content">
          {parseTranscript(editedTranscript)}
        </div>
      )}
    </div>
  );
};

export default TranscriptViewer;