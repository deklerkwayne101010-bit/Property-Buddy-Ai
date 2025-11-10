import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  filterContent
} from '../../../lib/security';

// Rate limiting: 10 requests per minute per IP for image analysis
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
        analysis: null,
        error: "AI analysis service is currently unavailable. Please try again later."
      }, { headers: createSecurityHeaders() });
    }

    const response = await fetch('https://api.replicate.com/v1/models/openai/gpt-4o/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait', // Wait for completion instead of streaming
      },
      body: JSON.stringify({
        input: {
          top_p: 1,
          prompt: "Analyze this picture and describe what camera movement would be the best to turn this image into a video, while still staying in the bounds of the original video, not adding or removing anything but still making it captivating",
          messages: [],
          image_input: [imageUrl],
          temperature: 1,
          system_prompt: "you are a expert ai image to video prompt generator",
          presence_penalty: 0,
          frequency_penalty: 0,
          max_completion_tokens: 4096
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GPT-4o API error response:', errorText);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`GPT-4o error: ${response.status} - ${errorText}`);
    }

    const prediction = await response.json();
    console.log('GPT-4o prediction response:', JSON.stringify(prediction, null, 2));
    console.log('Prediction status:', prediction.status);
    console.log('Prediction output:', prediction.output);

    // With poll: true, Replicate waits and returns final result directly
    if (prediction.status === 'succeeded') {
      const analysis = prediction.output;
      console.log('Image analysis succeeded:', analysis);
      console.log('Analysis type:', typeof analysis);
      console.log('Analysis length:', analysis ? analysis.length : 'N/A');

      return NextResponse.json({
        analysis: analysis,
        message: "Image analysis completed successfully!",
        metadata: {
          timestamp: new Date().toISOString(),
          model: "openai/gpt-4o",
          poll: true,
          imageUrl: imageUrl
        }
      }, { headers: createSecurityHeaders() });
    } else if (prediction.status === 'failed') {
      console.error('GPT-4o analysis failed:', prediction.error);
      console.error('Full prediction object:', JSON.stringify(prediction, null, 2));
      throw new Error(`GPT-4o analysis failed: ${prediction.error}`);
    } else {
      // This shouldn't happen with poll: true, but handle it just in case
      console.log('Unexpected status with poll: true:', prediction.status);
      console.log('Full prediction object:', JSON.stringify(prediction, null, 2));
      throw new Error(`Unexpected status: ${prediction.status}`);
    }

    // This should not be reached with poll: true, but handle it just in case
    throw new Error('Unexpected end of GPT-4o processing. The analysis may have failed.');

  } catch (error) {
    console.error('Error in GPT-4o image analysis:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/analyze-image',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}