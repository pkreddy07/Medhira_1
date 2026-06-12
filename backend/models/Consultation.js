import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  patientName: {
    type: String,
    required: false, // Change to false for audio processing
    trim: true
  },
  age: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    trim: true
  },
  symptoms: {
    type: String,
    trim: true
  },
  history: {
    type: String,
    trim: true
  },
  examination: {
    type: String,
    trim: true
  },
  diagnosis: {
    type: String,
    required: false, // Change to false for audio processing
    trim: true
  },
  medication: {
    type: String,
    trim: true
  },
  followUp: {
    type: String,
    trim: true
  },
  // Audio processing fields
  audioFile: {
    type: String,
    trim: true
  },
  originalName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number
  },
  transcript: {
    type: String,
    trim: true
  },
  driveLink: {
    type: String,
    trim: true
  },
  fileId: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'transcribing', 'summarizing', 'completed', 'failed'],
    default: 'uploaded'
  },
  error: {
    type: String,
    trim: true
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Consultation', consultationSchema);