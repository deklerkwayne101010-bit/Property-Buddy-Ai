import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../lib/security';

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
}

async function generateVideo(prompt: string, duration: number = 5, aspectRatio: string = '16:9', loop: boolean = false): Promise<string> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    throw new Error('Replicate API token not configured');
  }

  const replicate = new Replicate({
    auth: replicateToken,
  });

  try {
    const prediction = await replicate.predictions.create({
      version: "b5c3e5d7-6c8f-4c8c-8c8c-8c8c8c8c8c8c", // Hailuo-02 model version
      input: {
        prompt: prompt,
        duration: Math.min(Math.max(duration, 1), 10), // Clamp between 1-10 seconds
        aspect_ratio: aspectRatio,
        loop: loop,
      },
    });

    // Wait for completion (this might take several minutes)
    let result = await replicate.predictions.get(prediction.id);

    // Poll for completion
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status === 'failed') {
      throw new Error(`Video generation failed: ${result.error}`);
    }

    if (result.status === 'succeeded') {
      return result.output as string;
    }

    throw new Error('Video generation timed out or failed');
  } catch (error) {
    console.error('Replicate API error:', error);
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

    const { prompt, duration = 5, aspect_ratio = '16:9', loop = false } = body;

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

    // Generate video
    const videoUrl = await generateVideo(prompt, duration, aspect_ratio, loop);

    // Log successful generation
    logSecurityEvent('VIDEO_GENERATION_COMPLETED', {
      ip: clientIP,
      videoUrl,
      duration,
      aspectRatio: aspect_ratio
    });

    return NextResponse.json({
      success: true,
      videoUrl,
      metadata: {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''), // Truncate for logging
        duration,
        aspectRatio: aspect_ratio,
        loop,
        generatedAt: new Date().toISOString()
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