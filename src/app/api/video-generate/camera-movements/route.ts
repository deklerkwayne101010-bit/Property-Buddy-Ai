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
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

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

      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 seconds
      attempts++;

      // Poll the prediction endpoint
      const checkResponse = await fetch(result.urls.get, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      result = await checkResponse.json();
    }

    if (result.status !== "succeeded") {
      throw new Error(`GPT-4o prediction failed: ${result.status} - ${JSON.stringify(result)}`);
    }

    // Extract the camera movement description
    let cameraMovement: string;

    if (Array.isArray(result.output)) {
      cameraMovement = result.output[0] as string;
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

    return NextResponse.json({
      cameraMovement,
      imageUrl
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in camera movement generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}