import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createSecurityHeaders } from '../../../../../lib/security';
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

    // Verify job ownership and status
    const { data: job, error: jobError } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404, headers: createSecurityHeaders() }
      );
    }

    if (job.status !== 'processing_prompts') {
      return NextResponse.json(
        { error: 'Job is not ready for video generation' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Check if user has enough credits (4 credits per video)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404, headers: createSecurityHeaders() }
      );
    }

    const requiredCredits = job.total_images * 4;
    if (profile.credits_balance < requiredCredits) {
      return NextResponse.json(
        { error: `Insufficient credits. Required: ${requiredCredits}, Available: ${profile.credits_balance}` },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Update job status
    await supabase
      .from('video_generation_jobs')
      .update({
        status: 'generating_videos',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Get all images with completed prompts
    const { data: images, error: imagesError } = await supabase
      .from('video_job_images')
      .select('*')
      .eq('job_id', jobId)
      .eq('prompt_status', 'completed')
      .order('created_at');

    if (imagesError || !images || images.length === 0) {
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'No images with completed prompts found',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json(
        { error: 'No images with completed prompts found' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Deduct credits upfront
    const { error: creditError } = await supabase
      .from('profiles')
      .update({
        credits_balance: profile.credits_balance - requiredCredits
      })
      .eq('id', user.id);

    if (creditError) {
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to deduct credits',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Log credit usage
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        feature: 'video_gen',
        credits_used: requiredCredits,
        created_at: new Date().toISOString()
      });

    // Process videos sequentially to avoid rate limits
    const processedVideos = [];
    let completedCount = 0;

    for (const image of images) {
      try {
        // Update image status to processing
        await supabase
          .from('video_job_images')
          .update({
            video_status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);

        // Generate video using Kling v2.5 Turbo Pro
        const videoResult = await replicate.run("kwaivgi/kling-v2.5-turbo-pro", {
          input: {
            prompt: image.gpt4o_prompt,
            image: image.image_url,
            duration: 5, // 5 second clips as requested
            aspect_ratio: "16:9"
          }
        });

        const videoUrl = Array.isArray(videoResult) ? videoResult[0] : videoResult;

        // Update image with generated video
        await supabase
          .from('video_job_images')
          .update({
            video_status: 'completed',
            kling_video_url: videoUrl,
            replicate_video_id: `kling_${Date.now()}_${image.id}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);

        processedVideos.push({
          id: image.id,
          videoUrl: videoUrl,
          imageName: image.image_name
        });

        completedCount++;

        // Update job progress
        await supabase
          .from('video_generation_jobs')
          .update({
            completed_images: job.completed_images + completedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

      } catch (error) {
        console.error(`Error generating video for image ${image.id}:`, error);

        // Mark this image as failed
        await supabase
          .from('video_job_images')
          .update({
            video_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);

        // Refund credits for failed video (1 video = 4 credits)
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('credits_balance')
          .eq('id', user.id)
          .single();

        if (currentProfile) {
          await supabase
            .from('profiles')
            .update({
              credits_balance: currentProfile.credits_balance + 4
            })
            .eq('id', user.id);
        }
      }
    }

    // Check if any videos were generated successfully
    const successfulVideos = processedVideos.length;

    if (successfulVideos === 0) {
      // Refund all credits since no videos were generated
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', user.id)
        .single();

      if (currentProfile) {
        await supabase
          .from('profiles')
          .update({
            credits_balance: currentProfile.credits_balance + requiredCredits
          })
          .eq('id', user.id);
      }

      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to generate any videos',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json(
        { error: 'Failed to generate any videos' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Update job status to completed
    await supabase
      .from('video_generation_jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${successfulVideos} out of ${images.length} videos`,
      generatedVideos: successfulVideos,
      totalImages: images.length,
      videos: processedVideos
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in video generation:', error);

    // Update job status on error
    const resolvedParams = await params;
    if (resolvedParams.jobId) {
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Video generation failed',
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