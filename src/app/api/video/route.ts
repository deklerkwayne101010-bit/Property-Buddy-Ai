import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../lib/security';
import { checkCredits } from '../../../lib/creditUtils';

// Rate limiting: 5 video generations per minute per IP (video generation is expensive)
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 5,
};

interface VideoGenerationRequest {
  prompt: string;
  duration?: number; // in seconds, max 10
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  loop?: boolean;
  start_image?: string; // Add start_image for Kling v2.1
  negative_prompt?: string; // Add negative_prompt for Kling v2.1
  userId?: string; // Add userId for credit checking
}

// Mock video generation for demonstration purposes
async function startVideoGeneration(prompt: string): Promise<string> {
  // Generate a mock prediction ID
  const predictionId = `mock-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log('Mock video generation started with prompt:', prompt.substring(0, 100) + '...');
  console.log('Mock prediction ID:', predictionId);

  // Simulate async processing delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return predictionId;
}


export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks

    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/video' });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Video generation is limited to 5 requests per minute.',
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/video' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body: VideoGenerationRequest = await request.json();

    const { prompt, duration = 5, aspect_ratio = '16:9', loop = false, start_image, negative_prompt, userId } = body;

    // Validate user authentication for credit checking
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required for video generation' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    // Check if user has sufficient credits (1 credit per video)
    const creditCheck = await checkCredits(userId, 1);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          details: `Video generation costs 1 credit. You have ${creditCheck.currentCredits} credits available.`,
          requiredCredits: 1,
          availableCredits: creditCheck.currentCredits
        },
        { status: 402, headers: createSecurityHeaders() }
      );
    }

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate prompt length (prevent abuse)
    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt too long. Maximum 1000 characters allowed.' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate duration
    if (duration < 1 || duration > 10) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 10 seconds' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate aspect ratio
    const validAspectRatios = ['16:9', '9:16', '1:1'];
    if (!validAspectRatios.includes(aspect_ratio)) {
      return NextResponse.json(
        { error: 'Invalid aspect ratio. Must be one of: 16:9, 9:16, 1:1' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Log video generation attempt
    logSecurityEvent('VIDEO_GENERATION_STARTED', {
      ip: clientIP,
      promptLength: prompt.length,
      duration,
      aspectRatio: aspect_ratio,
      loop
    });

    // Start video generation (async)
    const predictionId = await startVideoGeneration(prompt);

    // Log generation started
    logSecurityEvent('VIDEO_GENERATION_STARTED', {
      ip: clientIP,
      predictionId,
      duration,
      aspectRatio: aspect_ratio
    });

    return NextResponse.json({
      success: true,
      predictionId,
      status: 'started',
      metadata: {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''), // Truncate for logging
        duration,
        aspectRatio: aspect_ratio,
        loop,
        startedAt: new Date().toISOString()
      }
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in video generation API:', error);
    logSecurityEvent('VIDEO_GENERATION_ERROR', {
      endpoint: '/api/video',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to generate video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}