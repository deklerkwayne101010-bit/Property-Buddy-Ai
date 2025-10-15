import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  filterContent
} from '../../../lib/security';

// Rate limiting: 10 voiceover generations per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 10,
};

interface VoiceoverRequest {
  text: string;
  voice_id?: string; // Default voice if not specified
  model_id?: string; // Default model if not specified
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  }
}

async function generateVoiceover(
  text: string,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM', // Default voice (Rachel)
  modelId: string = 'eleven_monolingual_v1',
  voiceSettings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  }
): Promise<Buffer> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const elevenlabs = new ElevenLabsClient({
    apiKey: elevenLabsKey,
  });

  try {
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      modelId: modelId,
      voiceSettings: voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true,
      },
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const reader = audioStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks

    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/voiceover' });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Voiceover generation is limited to 10 requests per minute.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            ...createSecurityHeaders()
          }
        }
      );
    }

    // Check request size
    if (!validateRequestSize(request)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/voiceover' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body: VoiceoverRequest = await request.json();

    const {
      text,
      voice_id = '21m00Tcm4TlvDq8ikWAM',
      model_id = 'eleven_monolingual_v1',
      voice_settings
    } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate text length (prevent abuse and API limits)
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed.' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Filter content for inappropriate material
    const filtered = filterContent(text);
    if (filtered.flagged) {
      logSecurityEvent('CONTENT_FLAGGED', {
        endpoint: '/api/voiceover',
        reasons: filtered.reasons,
        ip: clientIP
      });
      return NextResponse.json(
        { error: 'Content contains inappropriate material' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate voice settings if provided
    if (voice_settings) {
      const { stability, similarity_boost, style, use_speaker_boost } = voice_settings;
      if (
        typeof stability !== 'number' || stability < 0 || stability > 1 ||
        typeof similarity_boost !== 'number' || similarity_boost < 0 || similarity_boost > 1 ||
        (style !== undefined && (typeof style !== 'number' || style < 0 || style > 1)) ||
        (use_speaker_boost !== undefined && typeof use_speaker_boost !== 'boolean')
      ) {
        return NextResponse.json(
          { error: 'Invalid voice settings. Values must be within valid ranges.' },
          { status: 400, headers: createSecurityHeaders() }
        );
      }
    }

    // Log voiceover generation attempt
    logSecurityEvent('VOICEOVER_GENERATION_STARTED', {
      ip: clientIP,
      textLength: text.length,
      voiceId: voice_id,
      modelId: model_id
    });

    // Generate voiceover
    const audioBuffer = await generateVoiceover(filtered.filtered, voice_id, model_id, voice_settings);

    // Log successful generation
    logSecurityEvent('VOICEOVER_GENERATION_COMPLETED', {
      ip: clientIP,
      audioSize: audioBuffer.length,
      voiceId: voice_id,
      modelId: model_id
    });

    // Return audio file
    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': 'attachment; filename="voiceover.mp3"',
        ...createSecurityHeaders()
      }
    });

  } catch (error) {
    console.error('Error in voiceover generation API:', error);
    logSecurityEvent('VOICEOVER_GENERATION_ERROR', {
      endpoint: '/api/voiceover',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to generate voiceover',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}