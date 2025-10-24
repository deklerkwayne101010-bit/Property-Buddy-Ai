import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkCreditsAndDeduct } from '@/lib/creditUtils';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, prompt, editType, userId } = body;

    // Check credits and deduct for photo editing (1 credit per edit)
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const creditResult = await checkCreditsAndDeduct(userId, 1); // 1 credit per photo edit
    if (!creditResult.success) {
      return NextResponse.json({
        error: 'Insufficient credits',
        details: creditResult.error,
        currentCredits: creditResult.newCredits
      }, { status: 402 });
    }

    // Detailed logging for input parameters
    console.log('=== Replicate API Edit Request ===');
    console.log('Image URL:', imageUrl);
    console.log('Prompt:', prompt);
    console.log('Edit Type:', editType);

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: 'imageUrl and prompt are required' }, { status: 400 });
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 });
    }

    // Use the provided image URL directly (already uploaded to Supabase)
    const imagePublicUrl = imageUrl;
    console.log('Using provided image URL:', imagePublicUrl);

    // Choose the appropriate model based on edit type
    const isObjectRemover = editType === 'object-remover';
    const modelUrl = isObjectRemover
      ? 'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions'
      : 'https://api.replicate.com/v1/models/qwen/qwen-image-edit-plus/predictions';

    console.log('Edit type:', editType, 'isObjectRemover:', isObjectRemover);

    // Prepare Replicate API request body based on model
    let requestBody;
    if (isObjectRemover) {
      // FLUX Pro for object removal
      requestBody = {
        input: {
          prompt: prompt,
          input_image: imagePublicUrl,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2,
          prompt_upsampling: true
        }
      };
      console.log('Using FLUX Pro model for object removal');
    } else {
      // Qwen Image Editor for image enhancement
      requestBody = {
        input: {
          image: imagePublicUrl,
          prompt: prompt,
          negative_prompt: "blurry, low quality, distorted",
          guidance_scale: 7.5,
          num_inference_steps: 20
        }
      };
      console.log('Using Qwen Image Editor for enhancement');
    }

    console.log('Using model:', isObjectRemover ? 'FLUX Pro (Object Removal)' : 'Qwen Image Editor (Enhancement)');
    console.log('Replicate API request body:', JSON.stringify(requestBody, null, 2));

    // Call Replicate API
    const replicateResponse = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Replicate API response status:', replicateResponse.status);
    console.log('Replicate API response headers:', Object.fromEntries(replicateResponse.headers.entries()));

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text();
      console.error('Replicate API error response body:', errorText);
      throw new Error(`Replicate API error: ${replicateResponse.status} ${replicateResponse.statusText} - ${errorText}`);
    }

    const prediction = await replicateResponse.json();
    console.log('Replicate prediction response:', JSON.stringify(prediction, null, 2));

    // Poll for completion
    let result;
    let pollCount = 0;
    while (true) {
      pollCount++;
      console.log(`Polling attempt ${pollCount} for prediction ${prediction.id}`);

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
        },
      });

      console.log(`Status check response status: ${statusResponse.status}`);

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Status check error response body:', errorText);
        throw new Error(`Replicate status check error: ${statusResponse.status} ${statusResponse.statusText} - ${errorText}`);
      }

      result = await statusResponse.json();
      console.log(`Prediction status: ${result.status}`);

      if (result.status === 'succeeded') {
        console.log('Prediction succeeded, output:', result.output);
        break;
      } else if (result.status === 'failed') {
        console.error('Prediction failed, error details:', result.error);
        throw new Error(`Image editing failed: ${result.error || 'Unknown error'}`);
      } else if (result.status === 'cancelled') {
        console.error('Prediction was cancelled');
        throw new Error('Image editing was cancelled');
      }

      // Wait 2 seconds before checking again
      console.log('Waiting 2 seconds before next poll...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('=== Edit operation completed successfully ===');
    return NextResponse.json({ edited_image_url: result.output });
  } catch (error) {
    console.error('=== Error editing image ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json({ error: 'Failed to edit image', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}