import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../lib/security';

// Rate limiting: 20 requests per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 512 * 1024, // 512KB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

// Simple prompt refinement templates for different contexts
const REFINEMENT_TEMPLATES = {
  property_description: {
    prefix: "Create a professional real estate photograph showing",
    enhancements: [
      "high-quality, well-lit interior",
      "modern contemporary style",
      "spacious and inviting atmosphere",
      "professional photography, 8k resolution, photorealistic",
      "warm natural lighting, clean and organized space"
    ]
  },
  property_exterior: {
    prefix: "Photograph of a beautiful property exterior featuring",
    enhancements: [
      "well-maintained landscaping",
      "attractive curb appeal",
      "daytime natural lighting",
      "professional real estate photography",
      "wide-angle view, high detail, photorealistic"
    ]
  },
  property_interior: {
    prefix: "Interior photograph of a luxury home showing",
    enhancements: [
      "spacious and well-lit room",
      "modern contemporary furnishings",
      "clean and organized space",
      "professional real estate photography",
      "warm ambient lighting, high resolution, photorealistic"
    ]
  }
};

function refinePrompt(instruction: string, context: string): string {
  const template = REFINEMENT_TEMPLATES[context as keyof typeof REFINEMENT_TEMPLATES] ||
                   REFINEMENT_TEMPLATES.property_description;

  // Clean and enhance the instruction
  let refined = instruction.trim();

  // Add prefix if not already present
  if (!refined.toLowerCase().startsWith(template.prefix.toLowerCase().split(' ')[0])) {
    refined = `${template.prefix} ${refined}`;
  }

  // Add enhancements
  const enhancements = template.enhancements.join(', ');
  refined = `${refined}, ${enhancements}`;

  return refined;
}

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

    // Check request size
    if (!validateRequestSize(request, RATE_LIMIT_CONFIG.maxRequestSize)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const { agent_instruction, context = 'property_description' } = await request.json();

    if (!agent_instruction) {
      return NextResponse.json(
        { error: 'agent_instruction is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate input length to prevent abuse
    if (agent_instruction.length > 2000) {
      return NextResponse.json(
        { error: 'Instruction too long (max 2000 characters)' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Simple prompt refinement without external AI
    const refinedPrompt = refinePrompt(agent_instruction, context);

    return NextResponse.json({
      refined_prompt: refinedPrompt,
      context,
      original_length: agent_instruction.length,
      refined_length: refinedPrompt.length
    }, { headers: createSecurityHeaders() });
  } catch (error) {
    console.error('Error refining prompt:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/refine-prompt',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json({
      error: 'Failed to refine prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: createSecurityHeaders() });
  }
}