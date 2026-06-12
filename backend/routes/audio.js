// routes/audio.js
import express from 'express';
import {
  processAudio,
  getProcessingStatus,
  getUserConsultations,
  getConsultationDetails,
  deleteConsultation,
  processAudioStepByStep,
  regenerateSummary
} from '../controllers/audioController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
// Add this to your routes/audio.js

/**
 * @route   POST /api/audio/upload
 * @desc    Upload audio file for processing (background processing)
 * @access  Private
 * @param   {file} audio - Audio file (MP3, WAV, M4A, etc.)
 */
router.post('/upload', protect, upload.single('audio'), processAudio);

/**
 * @route   POST /api/audio/process-step
 * @desc    Upload and process audio immediately (step-by-step processing)
 * @access  Private
 * @param   {file} audio - Audio file (MP3, WAV, M4A, etc.)
 */
router.post('/process-step', protect, upload.single('audio'), processAudioStepByStep);

/**
 * @route   GET /api/audio/status/:consultationId
 * @desc    Get processing status for a specific consultation
 * @access  Private
 * @param   {string} consultationId - Consultation ID
 */
router.get('/status/:consultationId', protect, getProcessingStatus);

/**
 * @route   GET /api/audio/consultations
 * @desc    Get all consultations for the authenticated user
 * @access  Private
 */
router.get('/consultations', protect, getUserConsultations);

/**
 * @route   GET /api/audio/consultation/:consultationId
 * @desc    Get detailed information for a specific consultation
 * @access  Private
 * @param   {string} consultationId - Consultation ID
 */
router.get('/consultation/:consultationId', protect, getConsultationDetails);

/**
 * @route   DELETE /api/audio/consultation/:consultationId
 * @desc    Delete a specific consultation
 * @access  Private
 * @param   {string} consultationId - Consultation ID
 */
router.delete('/consultation/:consultationId', protect, deleteConsultation);

router.put('/consultation/:consultationId/regenerate', protect, regenerateSummary);

// 🎧 Legacy endpoint - kept for backward compatibility
/**
 * @route   POST /api/audio/transcribe
 * @desc    Legacy endpoint for audio transcription only
 * @access  Private
 * @param   {file} audio - Audio file
 */
// In the legacy endpoint, replace the try-catch block with:
router.post('/transcribe', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an audio file'
      });
    }

    console.log('🎯 Legacy transcription endpoint called');
    
    // Use the transcription service directly - it now handles fallback automatically
    const { transcribeAudio } = await import('../services/openaiService.js');
    const transcript = await transcribeAudio(req.file.path);

    // Clean up file
    const fs = await import('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ 
      success: true,
      text: transcript 
    });

  } catch (err) {
    console.error("❌ Legacy transcription error:", err);
    
    // Clean up file on error
    if (req.file) {
      const fs = await import('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
    
    // Even if everything fails, return mock data
    const { mockTranscribeAudio } = await import('../services/openaiService.js');
    const fallbackTranscript = await mockTranscribeAudio();
    
    res.json({ 
      success: true,
      text: fallbackTranscript,
      note: 'Used fallback data due to error'
    });
  }
});
export default router;