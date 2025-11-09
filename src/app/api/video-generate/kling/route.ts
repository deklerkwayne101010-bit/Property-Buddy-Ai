import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  filterContent
} from '../../../../lib/security';

// Rate limiting: 5 requests per minute per IP for video generation
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 5,
};

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
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

    if (!validateRequestSize(request)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'Image URL is required and must be a non-empty string' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Call Kling AI API
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json({
        videoUrl: null,
        message: "AI video generation service is currently unavailable. Please try again later."
      }, { headers: createSecurityHeaders() });
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "kwaivgi/kling-v2.5-turbo-pro",
        input: {
          prompt: "create a subtle and smooth camera motion for this image, that does not remove or change anything, keep everything exactly as it is and make sure your camera movement only stays in the bounds of the original image",
          duration: 5,
          start_image: imageUrl,
          aspect_ratio: "16:9",
          negative_prompt: ""
        },
        poll: true // ✅ This prevents SSE streaming and JSON parsing errors
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kling AI error: ${response.status} - ${errorText}`);
    }

    const prediction = await response.json();

    // With poll: true, Replicate waits and returns final result directly
    // No need for manual polling - just check the response
    if (prediction.status === 'succeeded') {
      const videoUrl = prediction.output;
      console.log('Video generation succeeded:', videoUrl);
      return NextResponse.json({
        videoUrl: videoUrl,
        message: "Video generated successfully!",
        metadata: {
          timestamp: new Date().toISOString(),
          model: "kwaivgi/kling-v2.5-turbo-pro",
          poll: true,
          duration: "Completed with poll: true"
        }
      }, { headers: createSecurityHeaders() });
    } else if (prediction.status === 'failed') {
      throw new Error(`Kling AI generation failed: ${prediction.error}`);
    } else {
      // This shouldn't happen with poll: true, but handle it just in case
      console.log('Unexpected status with poll: true:', prediction.status);
      throw new Error(`Unexpected status: ${prediction.status}`);
    }

    // This should not be reached with poll: true, but handle it just in case
    throw new Error('Unexpected end of Kling AI processing. The video generation may have failed.');

  } catch (error) {
    console.error('Error in Kling AI video generation:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/video-generate/kling',
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