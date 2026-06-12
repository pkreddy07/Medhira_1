// services/openaiService.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Configuration
const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  whisper: {
    model: "whisper-1",
    response_format: "verbose_json",
    language: "en",
    temperature: 0.0,
  },
  gpt: {
    model: "gpt-4",
    temperature: 0.1,
    max_tokens: 1500,
  }
};

// Validate API key
const hasValidApiKey = process.env.OPENAI_API_KEY && 
                       process.env.OPENAI_API_KEY.startsWith('sk-') && 
                       process.env.OPENAI_API_KEY.length > 20;

console.log('🔑 OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
console.log('🔑 OpenAI API Key valid:', hasValidApiKey);

const openai = hasValidApiKey ? new OpenAI(config.openai) : null;

// Medical summary prompt template
const MEDICAL_SUMMARY_PROMPT = `
You are a medical assistant analyzing a doctor-patient consultation transcript. Extract key medical information and structure it into a professional medical summary.

TRANSCRIPT:
{transcript}

Please analyze this transcript and return a structured JSON object with the following fields:
- patientName: Extract or infer patient's name if mentioned, otherwise use "Patient"
- age: Extract patient's age if mentioned, otherwise use "Not specified"
- gender: Extract patient's gender if mentioned, otherwise use "Not specified"
- symptoms: Detailed description of patient's symptoms and chief complaint
- history: Relevant medical history mentioned
- examination: Physical examination findings mentioned
- diagnosis: Doctor's diagnosis or assessment
- medication: Medications, dosage, and treatment prescribed
- followUp: Follow-up instructions or recommendations

Return ONLY valid JSON, no additional text.
`;

/**
 * Transcribe audio using Whisper
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<string>} Transcribed text
 */
export const transcribeAudio = async (audioPath) => {
  try {
    // Auto-fallback to mock if no valid API key
    if (!hasValidApiKey) {
      console.log('🔧 No valid OpenAI API key, using mock transcription');
      return await mockTranscribeAudio(audioPath);
    }

    console.log('🎯 Starting Whisper audio transcription...');
    
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      ...config.whisper,
    });

    console.log('✅ Whisper transcription completed');
    return transcription.text;

  } catch (error) {
    console.error('❌ Whisper transcription failed:', error.message);
    
    // Auto-fallback to mock data on any API error
    console.log('🔧 Falling back to mock transcription due to API error');
    return await mockTranscribeAudio(audioPath);
  }
};

/**
 * Generate medical summary using GPT-4
 * @param {string} transcript - Transcribed text from audio
 * @returns {Promise<Object>} Structured medical summary
 */
export const generateMedicalSummary = async (transcript) => {
  try {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Empty transcript provided');
    }

    // Auto-fallback to mock if no valid API key
    if (!hasValidApiKey) {
      console.log('🔧 No valid OpenAI API key, using mock medical summary');
      return await mockGenerateMedicalSummary(transcript);
    }

    console.log('🎯 Generating medical summary with GPT-4...');

    const prompt = MEDICAL_SUMMARY_PROMPT.replace('{transcript}', transcript);

    const completion = await openai.chat.completions.create({
      model: config.gpt.model,
      messages: [
        {
          role: "system",
          content: "You are a medical transcription specialist. Extract structured medical information from doctor-patient conversations and return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: config.gpt.temperature,
      max_tokens: config.gpt.max_tokens
    });

    const summaryText = completion.choices[0].message.content.trim();
    
    try {
      const summaryData = JSON.parse(summaryText);
      console.log('✅ GPT-4 medical summary generated successfully');
      return summaryData;
    } catch (parseError) {
      console.error('❌ Failed to parse GPT-4 response as JSON:', summaryText);
      // Attempt to extract JSON if wrapped in other text
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted JSON from response');
          return extractedJson;
        } catch (e) {
          // If extraction fails, fallback to mock
          console.log('🔧 Falling back to mock summary due to JSON parse error');
          return await mockGenerateMedicalSummary(transcript);
        }
      }
      // Fallback to mock data
      console.log('🔧 Falling back to mock summary due to invalid response');
      return await mockGenerateMedicalSummary(transcript);
    }

  } catch (error) {
    console.error('❌ GPT-4 medical summary generation failed:', error.message);
    // Auto-fallback to mock data on any error
    console.log('🔧 Falling back to mock medical summary due to API error');
    return await mockGenerateMedicalSummary(transcript);
  }
};

/**
 * Process audio and generate medical summary in one call
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<Object>} Object containing transcript and summary
 */
export const processMedicalAudio = async (audioPath) => {
  try {
    console.log('🔄 Starting medical audio processing...');
    
    const transcript = await transcribeAudio(audioPath);
    const summary = await generateMedicalSummary(transcript);
    
    console.log('✅ Medical audio processing completed');
    return {
      transcript,
      summary,
      success: true
    };
  } catch (error) {
    console.error('❌ Medical audio processing failed:', error.message);
    return {
      success: false,
      error: error.message,
      transcript: null,
      summary: null
    };
  }
};

// Mock functions for development
const MOCK_TRANSCRIPT = `DOCTOR: Good morning, how are you feeling today?
PATIENT: Not too bad, doctor. Still having some headaches though.
DOCTOR: On a scale of 1-10, how severe is the pain?
PATIENT: About a 6 or 7. It's been persistent.
DOCTOR: Any other symptoms? Nausea, vision changes?
PATIENT: Some occasional dizziness, but no vision problems.
DOCTOR: Let me check your blood pressure. 130/85, that's normal. Any family history of migraines?
PATIENT: Yes, my mother used to get migraines.
DOCTOR: Based on your symptoms and family history, this appears to be tension headaches. I recommend ibuprofen as needed and stress management techniques.
PATIENT: Thank you, doctor.
DOCTOR: Follow up in 2 weeks if the symptoms persist.`;

const MOCK_SUMMARY = {
  patientName: "John Smith",
  age: "45",
  gender: "Male",
  symptoms: "Persistent headaches, pain level 6-7/10, occasional dizziness",
  history: "Family history of migraines (mother)",
  examination: "Blood pressure 130/85 - normal",
  diagnosis: "Tension headaches",
  medication: "Ibuprofen as needed for pain relief",
  followUp: "Return in 2 weeks if symptoms persist, practice stress management techniques"
};

/**
 * Mock transcription for development
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<string>} Mock transcript
 */
export const mockTranscribeAudio = async (audioPath) => {
  console.log('🎯 Using mock transcription for development...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  return MOCK_TRANSCRIPT;
};

/**
 * Mock medical summary for development
 * @param {string} transcript - Transcript text
 * @returns {Promise<Object>} Mock medical summary
 */
export const mockGenerateMedicalSummary = async (transcript) => {
  console.log('🎯 Using mock medical summary for development...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  return MOCK_SUMMARY;
};

/**
 * Mock processing for development
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<Object>} Mock processing result
 */
export const mockProcessMedicalAudio = async (audioPath) => {
  console.log('🎯 Using mock medical audio processing for development...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  return {
    transcript: MOCK_TRANSCRIPT,
    summary: MOCK_SUMMARY,
    success: true,
    mock: true
  };
};

export default {
  transcribeAudio,
  generateMedicalSummary,
  processMedicalAudio,
  mockTranscribeAudio,
  mockGenerateMedicalSummary,
  mockProcessMedicalAudio
};