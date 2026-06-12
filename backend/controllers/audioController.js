// controllers/audioController.js
import Consultation from '../models/Consultation.js';
import { 
  transcribeAudio, 
  generateMedicalSummary, 
  processMedicalAudio,
  mockTranscribeAudio, 
  mockGenerateMedicalSummary,
  mockProcessMedicalAudio 
} from '../services/openaiService.js';
import fs from 'fs';
import path from 'path';

// Process audio and generate summary

// Add this to your audioController.js
export const saveDriveLink = async (req, res) => {
  try {
    const { consultationId, googleDriveLink, googleDriveFileId } = req.body;

    const consultation = await Consultation.findOneAndUpdate(
      { _id: consultationId, user: req.user.id },
      { 
        googleDriveLink,
        googleDriveFileId,
        driveUploadedAt: new Date()
      },
      { new: true }
    );

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    res.json({
      success: true,
      message: 'Google Drive link saved successfully',
      consultation
    });

  } catch (error) {
    console.error('❌ Save Drive link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save Google Drive link'
    });
  }
};
export const processAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an audio file'
      });
    }

    console.log('🎯 Starting audio processing...');
    console.log('📁 Audio file saved at:', req.file.path);
    console.log('📊 File size:', (req.file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('🎵 MIME type:', req.file.mimetype);

    // Verify file exists and has content
    if (!fs.existsSync(req.file.path)) {
      return res.status(400).json({
        success: false,
        message: 'Audio file was not saved properly'
      });
    }

    const stats = fs.statSync(req.file.path);
    if (stats.size === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Audio file is empty'
      });
    }

    // Validate audio file type
    const allowedMimeTypes = [
      'audio/mpeg', 
      'audio/wav', 
      'audio/mp4', 
      'audio/m4a', 
      'audio/webm',
      'audio/ogg'
    ];
    
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Please upload an audio file (MP3, WAV, M4A, etc.)'
      });
    }

    // Create basic consultation record for audio processing
    const consultation = await Consultation.create({
      user: req.user.id,
      audioFile: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'uploaded',
      patientName: 'Processing...',
      diagnosis: 'Pending transcription'
    });

    console.log('📝 Created consultation record:', consultation._id);

    // Process in background
    processAudioBackground(consultation._id, req.file.path, req.file.mimetype);

    res.json({
      success: true,
      consultationId: consultation._id,
      message: 'Audio uploaded successfully. Processing started...',
      status: 'uploaded'
    });

  } catch (error) {
    console.error('❌ Audio processing error:', error);
    
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process audio upload'
    });
  }
};

// Enhanced background processing with better error handling and progress tracking
const processAudioBackground = async (consultationId, audioPath, mimeType = 'audio/webm') => {
  let processingSuccess = false;
  
  try {
    console.log('🔧 Starting background processing for consultation:', consultationId);
    
    // Update status to transcribing
    await Consultation.findByIdAndUpdate(consultationId, {
      status: 'transcribing',
      processingStartedAt: new Date()
    });

    // Double-check file exists and has content before processing
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const stats = fs.statSync(audioPath);
    if (stats.size === 0) {
      throw new Error('Audio file is empty');
    }

    let processingResult;

    // ALWAYS use processMedicalAudio - it now handles fallback automatically
    console.log('🔧 Starting audio processing with automatic fallback...');
    processingResult = await processMedicalAudio(audioPath, mimeType);

    // Check if processing was successful
    if (!processingResult.success) {
      throw new Error(processingResult.error || 'Audio processing failed');
    }

    const { transcript, summary } = processingResult;

    // Validate the summary data structure
    if (!summary || typeof summary !== 'object') {
      throw new Error('Invalid summary data received from processing');
    }

    // Update consultation with final data
    const updateData = {
      ...summary,
      transcript: transcript,
      status: 'completed',
      processedAt: new Date(),
      processingCompletedAt: new Date()
    };

    // Ensure all required fields have values
    const requiredFields = ['patientName', 'age', 'gender', 'symptoms', 'history', 'examination', 'diagnosis', 'medication', 'followUp'];
    requiredFields.forEach(field => {
      if (!updateData[field] || updateData[field] === '') {
        updateData[field] = 'Not specified';
      }
    });

    await Consultation.findByIdAndUpdate(consultationId, updateData);

    console.log('✅ Audio processing completed for consultation:', consultationId);
    processingSuccess = true;

  } catch (error) {
    console.error('❌ Audio processing failed:', error);
    
    const errorUpdate = {
      status: 'failed',
      error: error.message,
      processingFailedAt: new Date()
    };

    // If we have partial data (transcript but no summary), save what we have
    if (error.partialData) {
      Object.assign(errorUpdate, error.partialData);
    }

    await Consultation.findByIdAndUpdate(consultationId, errorUpdate);

  } finally {
    // Clean up audio file regardless of success/failure
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
        console.log('🗑️ Cleaned up audio file:', audioPath);
      } catch (cleanupError) {
        console.error('❌ Failed to clean up audio file:', cleanupError);
      }
    }
  }
};

// Alternative processing method with individual steps (for more granular control)
export const processAudioStepByStep = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an audio file'
      });
    }

    console.log('🎯 Starting step-by-step audio processing...');

    // Create consultation record
    const consultation = await Consultation.create({
      user: req.user.id,
      audioFile: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'uploaded',
      patientName: 'Processing...',
      diagnosis: 'Pending transcription'
    });

    // Process immediately (not in background)
    let transcript, summary;

    try {
      // Step 1: Transcription (now handles fallback automatically)
      await Consultation.findByIdAndUpdate(consultation._id, { status: 'transcribing' });
      transcript = await transcribeAudio(req.file.path, req.file.mimetype);

      // Step 2: Update with transcript
      await Consultation.findByIdAndUpdate(consultation._id, {
        status: 'summarizing',
        transcript: transcript
      });

      // Step 3: Generate summary (now handles fallback automatically)
      summary = await generateMedicalSummary(transcript);

      // Step 4: Final update
      await Consultation.findByIdAndUpdate(consultation._id, {
        ...summary,
        status: 'completed',
        processedAt: new Date()
      });

      // Clean up file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        consultationId: consultation._id,
        status: 'completed',
        consultation: await Consultation.findById(consultation._id)
      });

    } catch (stepError) {
      // Handle step failures
      await Consultation.findByIdAndUpdate(consultation._id, {
        status: 'failed',
        error: stepError.message
      });
      
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      throw stepError;
    }

  } catch (error) {
    console.error('❌ Step-by-step processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get processing status
export const getProcessingStatus = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOne({
      _id: consultationId,
      user: req.user.id
    }).select('-__v'); // Exclude version key

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Prepare response based on status
    const response = {
      success: true,
      status: consultation.status,
      consultationId: consultation._id,
      createdAt: consultation.createdAt,
      updatedAt: consultation.updatedAt
    };

    if (consultation.status === 'completed') {
      response.consultation = consultation;
      response.message = 'Processing completed successfully';
    } else if (consultation.status === 'failed') {
      response.error = consultation.error;
      response.message = 'Processing failed';
      // Include partial data if available
      if (consultation.transcript) {
        response.partialData = {
          transcript: consultation.transcript
        };
      }
    } else {
      response.message = `Processing is ${consultation.status}`;
      // Include progress information for active processing
      if (consultation.processingStartedAt) {
        response.processingStartedAt = consultation.processingStartedAt;
      }
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Get processing status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get processing status'
    });
  }
};

// Get all consultations for user
export const getUserConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find({ 
      user: req.user.id 
    })
    .select('_id status patientName diagnosis createdAt updatedAt')
    .sort({ createdAt: -1 }); // Most recent first

    res.json({
      success: true,
      count: consultations.length,
      consultations
    });

  } catch (error) {
    console.error('❌ Get user consultations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get consultations'
    });
  }
};

// Get consultation details
export const getConsultationDetails = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOne({
      _id: consultationId,
      user: req.user.id
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    res.json({
      success: true,
      consultation
    });

  } catch (error) {
    console.error('❌ Get consultation details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get consultation details'
    });
  }
};

// Delete consultation
export const deleteConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOneAndDelete({
      _id: consultationId,
      user: req.user.id
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    res.json({
      success: true,
      message: 'Consultation deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete consultation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete consultation'
    });
  }
};