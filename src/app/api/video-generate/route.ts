import { NextRequest, NextResponse } from 'next/server';
import { checkCreditsAndDeduct } from '@/lib/creditUtils';
import { supabaseAdmin } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';

const execAsync = promisify(exec);

async function callReplicateImageToVideo(imageUrl: string, prompt: string): Promise<string> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    throw new Error('Replicate API token not configured');
  }

  // Use Wan 2.2 I2V Fast model as specified
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'wan-video/wan-2.2-i2v-fast',
      input: {
        image: imageUrl,
        prompt: prompt,
        go_fast: true,
        num_frames: 81,
        resolution: "480p",
        sample_shift: 12,
        frames_per_second: 16,
        interpolate_output: true,
        lora_scale_transformer: 1,
        lora_scale_transformer_2: 1
      },
    }),
  });

  console.log('Replicate API request sent for video generation');
  console.log('Model: wan-video/wan-2.2-i2v-fast');
  console.log('Image URL:', imageUrl);
  console.log('Prompt:', prompt);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Replicate API error response:', errorText);
    console.error('Response status:', response.status);
    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
  }

  const prediction = await response.json();

  // Poll for completion (extended timeout for video generation - videos can take 30+ minutes)
  let result;
  let attempts = 0;
  const maxAttempts = 720; // 60 minutes max (videos can take a very long time)

  console.log(`Starting to poll for video generation completion. Will check up to ${maxAttempts} times (60 minutes max).`);

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
        },
      });

      if (!statusResponse.ok) {
        console.error(`Status check failed with HTTP ${statusResponse.status}`);
        // Continue polling even if status check fails temporarily
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
        continue;
      }

      result = await statusResponse.json();

      console.log(`Poll attempt ${attempts}/${maxAttempts}: Status = ${result.status}`);

      if (result.status === 'succeeded') {
        console.log('Video generation succeeded! Output:', result.output);
        return result.output; // Video URL
      } else if (result.status === 'failed') {
        console.error('Video generation failed, error details:', result.error);
        throw new Error(`Video generation failed: ${result.error || 'Unknown error'}`);
      } else if (result.status === 'cancelled') {
        console.error('Video generation was cancelled');
        throw new Error('Video generation was cancelled');
      } else if (result.status === 'processing' || result.status === 'starting') {
        console.log(`Video still ${result.status}... continuing to wait`);
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (fetchError) {
      console.error(`Poll attempt ${attempts} failed:`, fetchError);
      // Continue polling even if there's a temporary network error
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
    }
  }

  console.error(`Video generation timed out after ${maxAttempts} attempts (${Math.round(maxAttempts * 5 / 60)} minutes)`);
  throw new Error(`Video generation timed out after 60 minutes. The AI model may be experiencing high demand. Please try again later.`);
}

async function stitchVideos(videoUrls: string[], outputFilename: string): Promise<string> {
  console.log(`🎬 Starting video stitching for ${videoUrls.length} videos`);
  console.log('Video URLs:', videoUrls);

  if (videoUrls.length === 1) {
    console.log('Only one video, no stitching needed');
    return videoUrls[0];
  }

  try {
    // Create temp directory for video processing
    const tempDir = path.join(process.cwd(), 'temp_videos');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const downloadedVideos: string[] = [];

    // Download all videos
    console.log('📥 Downloading videos...');
    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i];
      const videoPath = path.join(tempDir, `video_${i + 1}.mp4`);

      console.log(`Downloading video ${i + 1}/${videoUrls.length}: ${videoUrl}`);

      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video ${i + 1}: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(videoPath, Buffer.from(buffer));
      downloadedVideos.push(videoPath);

      console.log(`✅ Downloaded video ${i + 1} to ${videoPath}`);
    }

    // Create FFmpeg concat file
    const concatFile = path.join(tempDir, 'concat_list.txt');
    const concatContent = downloadedVideos.map(video => `file '${video}'`).join('\n');
    fs.writeFileSync(concatFile, concatContent);

    // Output file path
    const outputPath = path.join(tempDir, outputFilename);

    console.log('🎞️ Running FFmpeg to stitch videos...');

    // FFmpeg command for smooth concatenation
    const ffmpegCommand = `"${ffmpegStatic}" -f concat -safe 0 -i "${concatFile}" -c:v libx264 -c:a aac -avoid_negative_ts make_zero -fflags +genpts -y "${outputPath}"`;

    console.log('FFmpeg command:', ffmpegCommand);

    const { stdout, stderr } = await execAsync(ffmpegCommand, { cwd: tempDir });

    if (stdout) console.log('FFmpeg stdout:', stdout);
    if (stderr) console.log('FFmpeg stderr:', stderr);

    // Verify output file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('FFmpeg failed to create output video');
    }

    console.log('✅ Video stitching completed:', outputPath);

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(outputPath);
    const fileName = `stitched_${Date.now()}_${outputFilename}`;

    console.log('📤 Uploading stitched video to Supabase...');

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('video-assets')
      .upload(fileName, fileBuffer, {
        contentType: 'video/mp4',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload stitched video: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('video-assets')
      .getPublicUrl(fileName);

    console.log('✅ Stitched video uploaded successfully:', publicUrl);

    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError);
    }

    return publicUrl;

  } catch (error) {
    console.error('❌ Video stitching failed:', error);
    throw new Error(`Video stitching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 Video generation API called');

    const body = await request.json();
    const { imageUrls, userId, template = 'template1' } = body;

    console.log('📋 Request body:', { imageUrls: imageUrls?.length, userId, template });

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'At least one image URL is required' }, { status: 400 });
    }

    if (imageUrls.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 images allowed' }, { status: 400 });
    }

    // Check credits and deduct for video generation (4 credits per video)
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const creditResult = await checkCreditsAndDeduct(userId, 4); // 4 credits per video generation
    if (!creditResult.success) {
      return NextResponse.json({
        error: 'Insufficient credits',
        details: creditResult.error,
        currentCredits: creditResult.newCredits
      }, { status: 402 });
    }

    console.log(`🚀 Starting Video Template 1 generation for ${imageUrls.length} images`);
    console.log('📸 Image URLs:', imageUrls);

    // Process each image into a 5-second video
    const videoUrls: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`🎬 Processing image ${i + 1}/${imageUrls.length}: ${imageUrl.substring(0, 50)}...`);

      try {
        // Simple prompt for smooth slow camera motion
        const videoPrompt = "add a smooth slow camera motion too this image, do not change anything, do not add anything, only use what you can see in this image";

        console.log(`🤖 Calling Replicate API for image ${i + 1} with prompt: "${videoPrompt}"`);
        console.log(`⏱️ This may take up to 60 minutes per image. Starting now...`);

        const startTime = Date.now();
        const videoUrl = await callReplicateImageToVideo(imageUrl, videoPrompt);
        const duration = Math.round((Date.now() - startTime) / 1000 / 60); // minutes

        videoUrls.push(videoUrl);
        console.log(`✅ Generated video ${i + 1} in ${duration} minutes: ${videoUrl.substring(0, 50)}...`);
      } catch (error) {
        console.error(`❌ Failed to generate video for image ${i + 1}:`, error);
        // Continue with other images even if one fails
        console.log(`⏭️ Continuing with remaining images...`);
      }
    }

    if (videoUrls.length === 0) {
      throw new Error('Failed to generate any videos from the provided images');
    }

    console.log(`✅ Generated ${videoUrls.length} individual videos, now stitching together...`);

    // Stitch all videos together with smooth transitions
    const finalVideoUrl = await stitchVideos(videoUrls, `property-video-${Date.now()}.mp4`);

    console.log('Video generation completed successfully:', finalVideoUrl);

    return NextResponse.json({
      success: true,
      videoUrl: finalVideoUrl,
      creditsDeducted: 4,
      remainingCredits: creditResult.newCredits,
      videosGenerated: videoUrls.length,
      template: 'template1'
    });
  } catch (error) {
    console.error('Video generation API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}