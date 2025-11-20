import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../../lib/security';
import { deductCredits } from '../../../../lib/creditUtils';

// Rate limiting: 20 status checks per minute per IP (status checks are lightweight)
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024, // 1KB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

// Mock video status checking for demonstration purposes
async function checkVideoStatus(predictionId: string): Promise<{ status: string; videoUrl?: string; error?: string }> {
  console.log('Checking mock video status for:', predictionId);

  // Simulate different statuses based on time elapsed
  const elapsed = Date.now() % 30000; // Cycle every 30 seconds

  if (elapsed < 10000) {
    return { status: 'starting' };
  } else if (elapsed < 20000) {
    return { status: 'processing' };
  } else {
    // Mock successful completion with a sample video URL
    const mockVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    console.log('Mock video generation succeeded!');
    console.log('Mock video URL:', mockVideoUrl);
    return { status: 'succeeded', videoUrl: mockVideoUrl };
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

    // Get prediction ID and user ID from query parameters
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Prediction ID is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401, headers: createSecurityHeaders() }
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

    // If video generation succeeded, deduct 1 credit
    if (statusResult.status === 'succeeded' && statusResult.videoUrl) {
      const creditResult = await deductCredits(userId, 1);
      if (creditResult.error) {
        console.error('Failed to deduct credits:', creditResult.error);
        // Still return success but log the error
        logSecurityEvent('CREDIT_DEDUCTION_FAILED', {
          userId,
          predictionId,
          videoUrl: statusResult.videoUrl,
          error: creditResult.error
        });
      } else {
        console.log(`Successfully deducted 1 credit from user ${userId}. New balance: ${creditResult.newCredits}`);
        logSecurityEvent('VIDEO_GENERATION_CREDIT_DEDUCTED', {
          userId,
          predictionId,
          videoUrl: statusResult.videoUrl,
          creditsDeducted: 1,
          newBalance: creditResult.newCredits
        });
      }
    }

    // Log status check
    logSecurityEvent('VIDEO_STATUS_CHECKED', {
      ip: clientIP,
      predictionId,
      status: statusResult.status,
      userId
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