import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createSecurityHeaders } from '../../../../../lib/security';
import { createClient } from '@supabase/supabase-js';

export async function GET(
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

    // Get job status
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

    // Get all images for this job with their status
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('video_job_images')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at');

    if (imagesError) {
      return NextResponse.json(
        { error: 'Failed to load job images' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Calculate progress statistics
    const totalImages = images?.length || 0;
    const promptsCompleted = images?.filter(img => img.prompt_status === 'completed').length || 0;
    const promptsProcessing = images?.filter(img => img.prompt_status === 'processing').length || 0;
    const promptsFailed = images?.filter(img => img.prompt_status === 'failed').length || 0;

    const videosCompleted = images?.filter(img => img.video_status === 'completed').length || 0;
    const videosProcessing = images?.filter(img => img.video_status === 'processing').length || 0;
    const videosFailed = images?.filter(img => img.video_status === 'failed').length || 0;

    // Prepare response
    const response = {
      job: {
        id: job.id,
        status: job.status,
        totalImages: job.total_images,
        completedImages: job.completed_images,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        updatedAt: job.updated_at
      },
      progress: {
        prompts: {
          completed: promptsCompleted,
          processing: promptsProcessing,
          failed: promptsFailed,
          total: totalImages
        },
        videos: {
          completed: videosCompleted,
          processing: videosProcessing,
          failed: videosFailed,
          total: totalImages
        }
      },
      images: images?.map(img => ({
        id: img.id,
        imageUrl: img.image_url,
        imageName: img.image_name,
        promptStatus: img.prompt_status,
        videoStatus: img.video_status,
        gpt4oPrompt: img.gpt4o_prompt,
        klingVideoUrl: img.kling_video_url,
        createdAt: img.created_at,
        updatedAt: img.updated_at
      })) || []
    };

    return NextResponse.json(response, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}