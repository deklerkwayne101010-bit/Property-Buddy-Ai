import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
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

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Call Replicate API for prompt refinement using meta/llama-2-7b-chat
    const output = await replicate.run(
      "meta/llama-2-7b-chat",
      {
        input: {
          prompt: `You are an expert at refining AI image generation prompts for real estate photography. Take the following user instruction and refine it into a detailed, professional prompt that would work well with AI image generation models like Stable Diffusion. Focus on making it more descriptive, adding relevant details for ${context}, and ensuring it's optimized for high-quality real estate images.

User instruction: "${agent_instruction}"

Refined prompt:`,
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.1
        }
      }
    );

    // Extract the refined prompt from the output
    const refinedPrompt = Array.isArray(output) ? output.join('') : String(output);

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

    // Handle specific Replicate errors
    let statusCode = 500;
    let errorMessage = 'Failed to refine prompt';

    if (error instanceof Error) {
      if (error.message.includes('Replicate API error')) {
        statusCode = 502; // Bad Gateway
        errorMessage = 'AI service temporarily unavailable';
      } else if (error.message.includes('Prediction failed') || error.message.includes('timed out')) {
        statusCode = 503; // Service Unavailable
        errorMessage = 'AI processing timeout';
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: statusCode, headers: createSecurityHeaders() });
  }
}