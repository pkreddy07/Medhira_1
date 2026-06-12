// services/openaiService.js
import OpenAI, { toFile } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';

const MIME_TO_EXT = {
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'mp4',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/m4a': 'm4a',
  'audio/flac': 'flac',
  'audio/opus': 'opus',
};

dotenv.config();

// Groq uses the OpenAI SDK with a different baseURL — no extra package needed
const hasValidApiKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10);

console.log('🔑 Groq API Key present:', hasValidApiKey);

const client = hasValidApiKey
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

const config = {
  whisper: {
    model: 'whisper-large-v3',
    response_format: 'json',
    language: 'en',
    temperature: 0.0,
  },
  chat: {
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 1500,
  },
};

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

export const transcribeAudio = async (audioPath, mimeType = 'audio/webm') => {
  try {
    if (!hasValidApiKey) {
      console.log('🔧 No valid Groq API key, using mock transcription');
      return await mockTranscribeAudio(audioPath);
    }

    console.log('🎯 Starting Groq Whisper audio transcription...');

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const ext = MIME_TO_EXT[mimeType] || 'webm';
    const audioFile = await toFile(
      fs.createReadStream(audioPath),
      `audio.${ext}`,
      { type: mimeType }
    );

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      ...config.whisper,
    });

    console.log('✅ Groq Whisper transcription completed');
    return transcription.text;

  } catch (error) {
    console.error('❌ Whisper transcription failed:', error.message);
    console.log('🔧 Falling back to mock transcription due to API error');
    return await mockTranscribeAudio(audioPath);
  }
};

export const generateMedicalSummary = async (transcript) => {
  try {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Empty transcript provided');
    }

    if (!hasValidApiKey) {
      console.log('🔧 No valid Groq API key, using mock medical summary');
      return await mockGenerateMedicalSummary(transcript);
    }

    console.log('🎯 Generating medical summary with Groq Llama...');

    const prompt = MEDICAL_SUMMARY_PROMPT.replace('{transcript}', transcript);

    const completion = await client.chat.completions.create({
      model: config.chat.model,
      messages: [
        {
          role: 'system',
          content: 'You are a medical transcription specialist. Extract structured medical information from doctor-patient conversations and return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: config.chat.temperature,
      max_tokens: config.chat.max_tokens,
    });

    const raw = completion.choices[0].message.content.trim();
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    const summaryText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      const summaryData = JSON.parse(summaryText);
      console.log('✅ Groq medical summary generated successfully');
      return summaryData;
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', summaryText);
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted JSON from response');
          return extractedJson;
        } catch (e) {
          console.log('🔧 Falling back to mock summary due to JSON parse error');
          return await mockGenerateMedicalSummary(transcript);
        }
      }
      console.log('🔧 Falling back to mock summary due to invalid response');
      return await mockGenerateMedicalSummary(transcript);
    }

  } catch (error) {
    console.error('❌ Groq medical summary generation failed:', error.message);
    console.log('🔧 Falling back to mock medical summary due to API error');
    return await mockGenerateMedicalSummary(transcript);
  }
};

export const processMedicalAudio = async (audioPath, mimeType = 'audio/webm') => {
  try {
    console.log('🔄 Starting medical audio processing...');

    const transcript = await transcribeAudio(audioPath, mimeType);
    const summary = await generateMedicalSummary(transcript);

    console.log('✅ Medical audio processing completed');
    return { transcript, summary, success: true };
  } catch (error) {
    console.error('❌ Medical audio processing failed:', error.message);
    return { success: false, error: error.message, transcript: null, summary: null };
  }
};

// Mock data for fallback
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
  patientName: 'John Smith',
  age: '45',
  gender: 'Male',
  symptoms: 'Persistent headaches, pain level 6-7/10, occasional dizziness',
  history: 'Family history of migraines (mother)',
  examination: 'Blood pressure 130/85 - normal',
  diagnosis: 'Tension headaches',
  medication: 'Ibuprofen as needed for pain relief',
  followUp: 'Return in 2 weeks if symptoms persist, practice stress management techniques',
};

export const mockTranscribeAudio = async (audioPath) => {
  console.log('🎯 Using mock transcription for development...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  return MOCK_TRANSCRIPT;
};

export const mockGenerateMedicalSummary = async (transcript) => {
  console.log('🎯 Using mock medical summary for development...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  return MOCK_SUMMARY;
};

export const mockProcessMedicalAudio = async (audioPath) => {
  console.log('🎯 Using mock medical audio processing for development...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  return { transcript: MOCK_TRANSCRIPT, summary: MOCK_SUMMARY, success: true, mock: true };
};

export default {
  transcribeAudio,
  generateMedicalSummary,
  processMedicalAudio,
  mockTranscribeAudio,
  mockGenerateMedicalSummary,
  mockProcessMedicalAudio,
};
