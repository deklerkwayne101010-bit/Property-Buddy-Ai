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

    const hfToken = process.env.HF_API_TOKEN;
    if (!hfToken) {
      return NextResponse.json({ error: 'Hugging Face API token not configured' }, { status: 500 });
    }

    // Customize prompt based on context
    let systemPrompt = '';
    if (context === 'property_description') {
      systemPrompt = `Refine this agent instruction for generating compelling property descriptions. Make it more specific, engaging, and optimized for real estate marketing. Focus on highlighting key property features, location benefits, and creating emotional appeal for potential buyers or tenants.`;
    } else if (context === 'image_generation') {
      systemPrompt = `Refine this prompt for AI image generation. Make it more descriptive and suitable for image editing, focusing on visual details, composition, lighting, and style.`;
    } else {
      systemPrompt = `Refine this instruction to be more clear, specific, and effective.`;
    }

    const response = await fetch('https://api-inference.huggingface.co/models/Mistralai/Mistral-7B-Instruct-v0.3', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `${systemPrompt}\n\nOriginal instruction: "${agent_instruction}"\n\nRefined instruction:`,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data[0]?.generated_text || '';

    // Clean up the response (remove the prompt echo if present)
    const refinedPrompt = generatedText.replace(/^Refined instruction:\s*/i, '').trim() || agent_instruction;

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