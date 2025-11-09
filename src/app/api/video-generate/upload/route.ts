import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createSecurityHeaders } from '../../../../lib/security';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 images allowed' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Check user credits (4 credits per video) - use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json(
        { error: 'User profile not found', details: profileError?.message },
        { status: 404, headers: createSecurityHeaders() }
      );
    }

    const requiredCredits = files.length * 4; // 4 credits per video
    if (profile.credits_balance < requiredCredits) {
      return NextResponse.json(
        { error: `Insufficient credits. Required: ${requiredCredits}, Available: ${profile.credits_balance}` },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Create video generation job using service role
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .insert({
        user_id: user.id,
        total_images: files.length,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Error creating video job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create video generation job', details: jobError?.message },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    const uploadedImages = [];

    // Upload each image to Supabase Storage
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${user.id}/${job.id}/${Date.now()}-${i}-${file.name}`;

      // Upload to Supabase Storage using service role
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('video-assets')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError, 'File:', fileName);
        continue; // Skip this file but continue with others
      }

      // Get public URL using service role
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('video-assets')
        .getPublicUrl(fileName);

      // Create image record in database using service role
      const { data: imageRecord, error: imageError } = await supabaseAdmin
        .from('video_job_images')
        .insert({
          job_id: job.id,
          image_url: publicUrl,
          image_name: file.name
        })
        .select()
        .single();

      if (!imageError && imageRecord) {
        uploadedImages.push(imageRecord);
      }
    }

    if (uploadedImages.length === 0) {
      // Clean up the job if no images were uploaded
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({ status: 'failed', error_message: 'No images could be uploaded' })
        .eq('id', job.id);

      return NextResponse.json(
        { error: 'Failed to upload any images' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Update job with actual uploaded count
    await supabaseAdmin
      .from('video_generation_jobs')
      .update({ total_images: uploadedImages.length })
      .eq('id', job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      uploadedImages: uploadedImages.length,
      message: `Successfully uploaded ${uploadedImages.length} images. Ready to generate videos.`
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in video upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}