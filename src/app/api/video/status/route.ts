import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../../lib/security';

// Rate limiting: 20 status checks per minute per IP (status checks are lightweight)
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024, // 1KB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

async function checkVideoStatus(predictionId: string): Promise<{ status: string; videoUrl?: string; error?: string }> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    throw new Error('Replicate API token not configured');
  }

  const replicate = new Replicate({
    auth: replicateToken,
  });

  try {
    const prediction = await replicate.predictions.get(predictionId);

    if (prediction.status === 'succeeded') {
      console.log('Video generation succeeded!');
      const videoUrl = prediction.output as string;
      console.log('Generated video URL:', videoUrl);
      return { status: 'succeeded', videoUrl };
    }

    if (prediction.status === 'failed') {
      console.error('Video generation failed:', prediction.error);
      return { status: 'failed', error: prediction.error as string };
    }

    return { status: prediction.status };
  } catch (error) {
    console.error('Error checking video status:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/video/status' });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Status checks are limited to 20 per minute.',
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

    // Get prediction ID from query parameters
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('id');

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Prediction ID is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate prediction ID format (should be a string)
    if (typeof predictionId !== 'string' || predictionId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid prediction ID' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Check video status
    const statusResult = await checkVideoStatus(predictionId);

    // Log status check
    logSecurityEvent('VIDEO_STATUS_CHECKED', {
      ip: clientIP,
      predictionId,
      status: statusResult.status
    });

    return NextResponse.json(statusResult, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in video status API:', error);
    logSecurityEvent('VIDEO_STATUS_ERROR', {
      endpoint: '/api/video/status',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to check video status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}