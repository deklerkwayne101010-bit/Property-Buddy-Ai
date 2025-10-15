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

// Rate limiting: 5 bulk requests per minute per IP (more restrictive for bulk operations)
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 2 * 1024 * 1024, // 2MB for bulk operations
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 5,
};

interface PropertyData {
  id?: string; // For tracking in bulk operations
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

interface BulkGenerationRequest {
  properties: PropertyData[];
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

async function generatePropertyDescription(
  propertyData: PropertyData,
  platform: string,
  tone: string,
  length: 'Short' | 'Medium' | 'Long',
  seoKeywords?: string
): Promise<string> {
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

      return await callHuggingFaceAPI(fallbackPrompt);
    } else {
      // Build the prompt using the template
      const prompt = buildPrompt(template, {
        ...propertyData,
        length: length.toLowerCase(),
        seoKeywords: seoKeywords || ''
      });

      return await callHuggingFaceAPI(prompt);
    }
  } catch (error) {
    console.error(`Error generating description for property ${propertyData.id || 'unknown'}:`, error);
    throw error;
  }
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

    const body: BulkGenerationRequest = await request.json();

    const { properties, platforms, tone, length, variations = 1, seoKeywords } = body;

    // Validate required fields
    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: 'At least one property is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'At least one platform is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Limit bulk operations to prevent abuse
    const maxProperties = 10;
    const maxPlatforms = 6;
    const maxVariations = 3;

    if (properties.length > maxProperties) {
      return NextResponse.json(
        { error: `Maximum ${maxProperties} properties allowed in bulk operation` },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    if (platforms.length > maxPlatforms) {
      return NextResponse.json(
        { error: `Maximum ${maxPlatforms} platforms allowed` },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate each property
    for (let i = 0; i < properties.length; i++) {
      const validation = validatePropertyData(properties[i]);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Invalid property data for property ${i + 1}`, details: validation.errors },
          { status: 400, headers: createSecurityHeaders() }
        );
      }
    }

    const validVariations = Math.min(Math.max(variations, 1), maxVariations);

    const results: Array<{
      propertyId?: string;
      propertyTitle: string;
      descriptions: { [platform: string]: string[] };
      errors?: string[];
    }> = [];

    let totalGenerations = 0;
    let successfulGenerations = 0;
    let failedGenerations = 0;

    // Process each property
    for (const property of properties) {
      const propertyResult = {
        propertyId: property.id,
        propertyTitle: property.title,
        descriptions: {} as { [platform: string]: string[] },
        errors: [] as string[]
      };

      // Generate descriptions for each platform
      for (const platform of platforms) {
        propertyResult.descriptions[platform] = [];

        for (let i = 0; i < validVariations; i++) {
          totalGenerations++;
          try {
            const rawDescription = await generatePropertyDescription(
              property,
              platform,
              tone,
              length,
              seoKeywords
            );

            // Filter content for inappropriate material
            const filtered = filterContent(rawDescription);
            propertyResult.descriptions[platform].push(filtered.filtered);
            successfulGenerations++;

            // Log if content was flagged
            if (filtered.flagged) {
              logSecurityEvent('CONTENT_FLAGGED', {
                platform,
                propertyId: property.id,
                variation: i + 1,
                reasons: filtered.reasons,
                ip: clientIP
              });
            }
          } catch (error) {
            const errorMessage = `Failed to generate ${platform} description variation ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            propertyResult.errors.push(errorMessage);
            propertyResult.descriptions[platform].push(`Error: ${errorMessage}`);
            failedGenerations++;

            // Continue with other variations/platforms even if one fails
          }
        }
      }

      results.push(propertyResult);
    }

    return NextResponse.json({
      success: true,
      results,
      metadata: {
        totalProperties: properties.length,
        totalPlatforms: platforms.length,
        variationsPerGeneration: validVariations,
        totalGenerations,
        successfulGenerations,
        failedGenerations,
        timestamp: new Date().toISOString()
      }
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in bulk-generate API:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/bulk-generate',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to process bulk generation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}