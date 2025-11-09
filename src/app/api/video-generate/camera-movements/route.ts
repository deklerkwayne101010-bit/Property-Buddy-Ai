import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Create Supabase client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Security headers helper
const createSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});

export async function POST(
  request: NextRequest
) {
  console.log('Camera movements API called');

  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No Bearer token found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token extracted, length:', token.length);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('Supabase auth result:', { user: !!user, error: authError?.message });

    if (authError || !user) {
      console.log('Auth failed:', authError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const requestBody = await request.json();
    console.log('Request body:', requestBody);

    const { imageUrl } = requestBody;

    if (!imageUrl) {
      console.log('No imageUrl provided');
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    console.log('Image URL received:', imageUrl);

    console.log(`Processing camera movement for image: ${imageUrl}`);

    // Call GPT-4o with camera movement prompt
    const prediction = await replicate.run("openai/gpt-4o", {
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