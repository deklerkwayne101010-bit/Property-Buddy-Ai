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

    const response = await fetch('https://api.replicate.com/v1/models/kwaivgi/kling-v2.5-turbo-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: "create a subtle and smooth camera motion for this image, that does not remove or change anything, keep everything exactly as it is and make sure your camera movement only stays in the bounds of the original image",
          duration: 5,
          start_image: imageUrl,
          aspect_ratio: "16:9",
          negative_prompt: ""
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kling AI error: ${response.status} - ${errorText}`);
    }

    const prediction = await response.json();

    // Poll for completion - video generation can take up to 5 minutes
    let result;
    const maxAttempts = 150; // 150 * 2 seconds = 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: {
            'Authorization': `Bearer ${replicateToken}`,
          },
        });

        if (!statusResponse.ok) {
          console.log(`Status check failed with ${statusResponse.status}, retrying...`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        result = await statusResponse.json();

        if (result.status === 'succeeded') {
          const videoUrl = result.output;
          console.log('Video generation succeeded:', videoUrl);
          return NextResponse.json({
            videoUrl: videoUrl,
            message: "Video generated successfully!",
            metadata: {
              timestamp: new Date().toISOString(),
              model: "kwaivgi/kling-v2.5-turbo-pro",
              attempts: attempts,
              duration: attempts * 2
            }
          }, { headers: createSecurityHeaders() });
        } else if (result.status === 'failed') {
          throw new Error(`Kling AI generation failed: ${result.error}`);
        } else if (result.status === 'processing' || result.status === 'starting') {
          console.log(`Video generation in progress (${result.status}), attempt ${attempts + 1}/${maxAttempts}`);
        }

        attempts++;
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (pollError) {
        console.log(`Polling error (attempt ${attempts + 1}):`, pollError);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // If we get here, we've exceeded max attempts
    throw new Error(`Video generation timed out after ${maxAttempts * 2} seconds. The video may still be processing on Replicate.`);

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