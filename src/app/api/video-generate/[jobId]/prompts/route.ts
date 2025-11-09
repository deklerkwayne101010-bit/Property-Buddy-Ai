import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createSecurityHeaders } from '../../../../../lib/security';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
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

    const { jobId } = await params;

    // Use service role to bypass RLS for job queries
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify job ownership
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      console.error('Job lookup error:', jobError);
      return NextResponse.json(
        { error: 'Job not found', details: jobError?.message },
        { status: 404, headers: createSecurityHeaders() }
      );
    }

    if (job.status !== 'pending') {
      return NextResponse.json(
        { error: 'Job is not in pending state' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Update job status
    await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        status: 'processing_prompts',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Get all images for this job
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('video_job_images')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at');

    if (imagesError || !images) {
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to load images',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json(
        { error: 'Failed to load images' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Process prompts sequentially to avoid rate limits
    const processedImages = [];
    let completedCount = 0;

    for (const image of images) {
      try {
        // Update image status to processing
        await supabaseAdmin
          .from('video_job_images')
          .update({
            prompt_status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);

        // Generate prompt using GPT-4o with correct JSON format and async polling
        const prediction = await replicate.run("openai/gpt-4o", {
          input: {
            top_p: 1,
            prompt: "Analyze this property image and create a detailed prompt for video generation. Focus ONLY on what's visible in the image. Do not add or hallucinate any elements. Stay within the frame boundaries. Create a cinematic prompt suitable for property video that describes the scene accurately without adding fictional elements.",
            image_input: [image.image_url],
            temperature: 1,
            system_prompt: "You are a expert ai image to video creator and video maker.",
            presence_penalty: 0,
            frequency_penalty: 0,
            max_completion_tokens: 4096
          }
        });

        // Replicate returns a prediction object, not the direct result
        // We need to poll until the status is "succeeded"
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

        // GPT-4o returns a prediction response, extract the text content
        let generatedPrompt: string;

        if (Array.isArray(result.output)) {
          generatedPrompt = result.output[0] as string;
        } else if (typeof result.output === 'string') {
          generatedPrompt = result.output;
        } else if (result.output && typeof result.output === 'object') {
          // Sometimes GPT-4o returns an object with text field
          const outputObj = result.output as Record<string, unknown>;
          generatedPrompt = (outputObj.text as string) || (outputObj.content as string) || JSON.stringify(result.output);
        } else {
          generatedPrompt = String(result.output || '');
        }

        console.log(`GPT-4o raw output:`, result.output);
        console.log(`GPT-4o processed prompt for image ${image.id}:`, generatedPrompt);
        console.log(`Prompt type:`, typeof generatedPrompt);
        console.log(`Prompt length:`, generatedPrompt?.length || 0);

        // Update image with generated prompt
        const updateResult = await supabaseAdmin
          .from('video_job_images')
          .update({
            prompt_status: 'completed',
            gpt4o_prompt: generatedPrompt,
            replicate_prompt_id: `gpt4o_${Date.now()}_${image.id}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);

        if (updateResult.error) {
          console.error('Error updating image with prompt:', updateResult.error);
          throw new Error(`Failed to save prompt: ${updateResult.error.message}`);
        }

        console.log(`Successfully saved prompt for image ${image.id}:`, generatedPrompt.substring(0, 100) + '...');

        processedImages.push({
          id: image.id,
          prompt: generatedPrompt
        });

        completedCount++;

        // Update job progress
        await supabaseAdmin
          .from('video_generation_jobs')
          .update({
            completed_images: completedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

      } catch (error) {
        console.error(`Error processing prompt for image ${image.id}:`, error);

        // Mark this image as failed
        await supabaseAdmin
          .from('video_job_images')
          .update({
            prompt_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);
      }
    }

    // Check if all prompts were generated successfully
    const successfulPrompts = processedImages.length;

    if (successfulPrompts === 0) {
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to generate any prompts',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json(
        { error: 'Failed to generate any prompts' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Update job status to ready for video generation
    await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        status: 'processing_prompts', // Keep as processing_prompts until videos start
        completed_images: successfulPrompts,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return NextResponse.json({
      success: true,
      message: `Successfully generated prompts for ${successfulPrompts} out of ${images.length} images`,
      processedImages: successfulPrompts,
      totalImages: images.length
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in prompt generation:', error);

    // Update job status on error
    const resolvedParams = await params;
    if (resolvedParams.jobId) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Prompt generation failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedParams.jobId);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}