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

// Rate limiting: 10 requests per minute per IP for prompt generation
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 10,
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

    // Call GPT-4o API via Replicate
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json({
        prompt: null,
        error: "AI prompt generation service is currently unavailable. Please try again later."
      }, { headers: createSecurityHeaders() });
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "llava-hf/llava-v1.6-mistral-7b-die:16e7c47ce16ee6c630be22821f1c4126d95aa40a1b5c8a09e3b17dca50a7e9f5",
        poll: true, // Use poll: true to get final result and avoid streaming
        input: {
          "prompt": "Analyze this real estate image and decide the exact camera movement that keeps everything identical, does not hallucinate anything, stays fully inside the frame boundaries, and produces a professional cinematic effect. Suggest a smooth motion like slow dolly-in, left-to-right pan, gentle zoom etc. Never invent or change anything in the image.",
          "image": imageUrl,
          "temperature": 0.7
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT-4o error: ${response.status} - ${errorText}`);
    }

    const prediction = await response.json();
    console.log('GPT-4o prediction response:', JSON.stringify(prediction, null, 2));

    // With poll: true, Replicate waits and returns final result directly
    if (prediction.status === 'succeeded') {
      const prompt = prediction.output;
      console.log('Prompt generation succeeded:', prompt);
      return NextResponse.json({
        prompt: prompt,
        message: "Prompt generated successfully!",
        metadata: {
          timestamp: new Date().toISOString(),
          model: "llava-hf/llava-v1.6-mistral-7b-die",
          poll: true,
          imageUrl: imageUrl
        }
      }, { headers: createSecurityHeaders() });
    } else if (prediction.status === 'failed') {
      console.error('GPT-4o generation failed:', prediction.error);
      throw new Error(`GPT-4o generation failed: ${prediction.error}`);
    } else {
      // This shouldn't happen with poll: true, but handle it just in case
      console.log('Unexpected status with poll: true:', prediction.status);
      console.log('Full prediction object:', prediction);
      throw new Error(`Unexpected status: ${prediction.status}`);
    }

    // This should not be reached with poll: true, but handle it just in case
    throw new Error('Unexpected end of GPT-4o processing. The prompt generation may have failed.');

  } catch (error) {
    console.error('Error in GPT-4o prompt generation:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/video-generate/generate-prompts',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to generate prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}