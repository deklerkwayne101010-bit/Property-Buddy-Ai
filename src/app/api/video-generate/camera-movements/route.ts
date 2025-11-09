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

// Rate limiting: 10 requests per minute per IP for camera movements
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

    const body = await request.json();
    const { imageUrl } = body;

    // Validate required fields
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'Image URL is required and must be a non-empty string' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Call GPT-4o with camera movement prompt using the same pattern as chat API
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      // Fallback response when API is not configured
      return NextResponse.json({
        cameraMovement: "I'm sorry, but the AI camera movement analysis service is currently unavailable. Please try again later or contact support for assistance.",
        imageUrl
      }, { headers: createSecurityHeaders() });
    }

    // Extract the prompt to avoid TypeScript parsing issues
    const cameraMovementPrompt = "Analyze this property image and give the perfect camera movement for this image, to turn it into a 5 second video that does not change or alter anything. Focus ONLY on what's visible in the image. Do not add or hallucinate any elements. Stay within the frame boundaries. Describe the camera movement in detail for a cinematic 5-second video.";

    const systemPrompt = "You are an expert video director and cinematographer specializing in real estate photography. Provide detailed camera movement instructions for property videos.";

    // Use the same pattern as the working chat API - direct fetch call
    const requestBody = {
      input: {
        prompt: cameraMovementPrompt,
        image_input: [imageUrl],
        temperature: 1,
        system_prompt: systemPrompt,
        max_tokens: 2000
      }
    };

    const response = await fetch('https://api.replicate.com/v1/models/openai/gpt-4o/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
    }

    const prediction = await response.json();

    // Poll for completion using the same pattern as chat API
    let result;
    while (true) {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
        },
      });

      result = await statusResponse.json();

      if (result.status === 'succeeded') {
        const cameraMovement = result.output.join('').replace(/\s+/g, ' ').trim();

        // Filter content for inappropriate material
        const filtered = filterContent(cameraMovement);

        // Log if content was flagged
        if (filtered.flagged) {
          logSecurityEvent('CONTENT_FLAGGED', {
            endpoint: '/api/video-generate/camera-movements',
            reasons: filtered.reasons,
            ip: clientIP
          });
        }

        return NextResponse.json({
          cameraMovement: filtered.filtered,
          imageUrl,
          metadata: {
            timestamp: new Date().toISOString(),
            filtered: filtered.flagged
          }
        }, { headers: createSecurityHeaders() });
      } else if (result.status === 'failed') {
        throw new Error(`Replicate prediction failed: ${result.error}`);
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
      input: {
        top_p: 1,
        prompt: "Analyze this property image and give the perfect camera movement for this image, to turn it into a 5 second video that does not change or alter anything. Focus ONLY on what's visible in the image. Do not add or hallucinate any elements. Stay within the frame boundaries. Describe the camera movement in detail for a cinematic 5-second video.",
        image_input: [imageUrl],
        temperature: 1,
        system_prompt: "You are an expert video director and cinematographer specializing in real estate photography. Provide detailed camera movement instructions for property videos.",
        presence_penalty: 0,
        frequency_penalty: 0,
        max_completion_tokens: 2048
      }
    });

    // Handle Replicate prediction response
    let result: {
      status: string;
      urls: { get: string };
      output?: unknown;
    } = prediction as {
      status: string;
      urls: { get: string };
      output?: unknown;
    };

    console.log(`Initial prediction status:`, result.status);

    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 2 seconds = 1 minute timeout

    while (
      result.status === "starting" ||
      result.status === "processing" ||
      result.status === "queued"
    ) {
      if (attempts >= maxAttempts) {
        throw new Error(`GPT-4o prediction timed out after ${maxAttempts * 2} seconds`);
      }

      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}, status: ${result.status}`);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 seconds
      attempts++;

      // Poll the prediction endpoint
      const checkResponse = await fetch(result.urls.get, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!checkResponse.ok) {
        throw new Error(`Failed to poll prediction: ${checkResponse.status} ${checkResponse.statusText}`);
      }

      result = await checkResponse.json();
      console.log(`Polled status: ${result.status}`);
    }

    if (result.status !== "succeeded") {
      console.error(`Prediction failed with status: ${result.status}`, result);
      throw new Error(`GPT-4o prediction failed: ${result.status} - ${JSON.stringify(result)}`);
    }

    console.log(`Prediction succeeded, output:`, result.output);

    // Extract the camera movement description
    // GPT-4o returns an array of strings that need to be joined
    let cameraMovement: string;

    if (Array.isArray(result.output)) {
      // Join all array elements and clean up extra spaces
      cameraMovement = result.output.join('').replace(/\s+/g, ' ').trim();
    } else if (typeof result.output === 'string') {
      cameraMovement = result.output;
    } else if (result.output && typeof result.output === 'object') {
      // Sometimes GPT-4o returns an object with text field
      const outputObj = result.output as Record<string, unknown>;
      cameraMovement = (outputObj.text as string) || (outputObj.content as string) || JSON.stringify(result.output);
    } else {
      cameraMovement = String(result.output || '');
    }

    console.log(`GPT-4o camera movement result:`, cameraMovement);

    // Ensure we have a valid result
    if (!cameraMovement || cameraMovement.trim() === '') {
      throw new Error('GPT-4o returned empty result');
    }

    return NextResponse.json({
      cameraMovement: cameraMovement.trim(),
      imageUrl
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in camera movement generation:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}