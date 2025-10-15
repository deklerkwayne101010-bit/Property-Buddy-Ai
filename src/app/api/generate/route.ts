import { NextRequest, NextResponse } from 'next/server';
import { getPromptTemplate, buildPrompt } from '../../../lib/promptTemplates';
import {
  checkRateLimit,
  validateRequestSize,
  validatePropertyData,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  filterContent
} from '../../../lib/security';

// Rate limiting: 10 requests per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 10,
};

interface PropertyData {
  title: string;
  shortSummary: string;
  address: string;
  suburb: string;
  city: string;
  price: string;
  beds: string;
  baths: string;
  garages: string;
  keyFeatures: string[];
  language: string;
}

interface GenerationRequest {
  propertyData: PropertyData;
  platforms: string[];
  tone: string;
  length: 'Short' | 'Medium' | 'Long';
  variations: number;
  seoKeywords?: string;
}

async function callHuggingFaceAPI(prompt: string): Promise<string> {
  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) {
    throw new Error('Hugging Face API token not configured');
  }

  const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
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
  return data[0]?.generated_text || '';
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks

    // Check rate limiting
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
    if (!validateRequestSize(request)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body: GenerationRequest = await request.json();

    const { propertyData, platforms, tone, length, variations = 1, seoKeywords } = body;

    // Validate required fields
    if (!propertyData || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Property data and at least one platform are required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate property data
    const validation = validatePropertyData(propertyData as unknown as Record<string, unknown>);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid property data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate platforms (max 6 to prevent abuse)
    if (platforms.length > 6) {
      return NextResponse.json(
        { error: 'Maximum 6 platforms allowed' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate variations (max 5 to prevent abuse)
    const validVariations = Math.min(Math.max(variations, 1), 5);

    const results: { [platform: string]: string[] } = {};

    // Generate descriptions for each platform
    for (const platform of platforms) {
      results[platform] = [];

      for (let i = 0; i < validVariations; i++) {
        try {
          // Get the appropriate template
          const template = getPromptTemplate(platform, tone, length);

          if (!template) {
            console.warn(`No template found for ${platform}/${tone}/${length}, using default`);
            // Fallback to a basic template
            const fallbackPrompt = `Generate a ${length.toLowerCase()} property description for ${platform} with a ${tone.toLowerCase()} tone.

Property: ${propertyData.title}
Location: ${propertyData.address}, ${propertyData.suburb}, ${propertyData.city}
Price: ${propertyData.price}
Details: ${propertyData.beds} beds, ${propertyData.baths} baths, ${propertyData.garages} garages
Summary: ${propertyData.shortSummary}
Features: ${propertyData.keyFeatures.join(', ')}

${seoKeywords ? `Include SEO keywords: ${seoKeywords}` : ''}`;

            const description = await callHuggingFaceAPI(fallbackPrompt);
            results[platform].push(description);
          } else {
            // Build the prompt using the template
            const prompt = buildPrompt(template, {
              ...propertyData,
              length: length.toLowerCase(),
              seoKeywords: seoKeywords || ''
            });

            const rawDescription = await callHuggingFaceAPI(prompt);

            // Filter content for inappropriate material
            const filtered = filterContent(rawDescription);
            results[platform].push(filtered.filtered);

            // Log if content was flagged
            if (filtered.flagged) {
              logSecurityEvent('CONTENT_FLAGGED', {
                platform,
                variation: i + 1,
                reasons: filtered.reasons,
                ip: clientIP
              });
            }
          }
        } catch (error) {
          console.error(`Error generating description for ${platform} variation ${i + 1}:`, error);
          results[platform].push(`Error generating description: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      metadata: {
        platforms: platforms.length,
        variations: validVariations,
        totalGenerations: platforms.length * validVariations,
        timestamp: new Date().toISOString()
      }
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in generate API:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/generate',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to generate property descriptions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}