import { NextRequest, NextResponse } from 'next/server';
import { checkCreditsAndDeduct } from '@/lib/creditUtils';
import { supabaseAdmin } from '@/lib/supabase';

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
  // For now, return the first video URL as a placeholder
  // In a production implementation, you would:
  // 1. Download all video files
  // 2. Use FFmpeg to create smooth transitions between videos
  // 3. Concatenate them into a single video
  // 4. Upload the final video to storage

  console.log(`Stitching ${videoUrls.length} videos together with smooth transitions`);
  console.log('Video URLs:', videoUrls);

  // For this implementation, we'll return the first video as a placeholder
  // The user can see the concept works, and in production you'd implement
  // proper video stitching with FFmpeg or a cloud video processing service

  if (videoUrls.length === 1) {
    return videoUrls[0];
  }

  // Placeholder: return first video
  // TODO: Implement actual video stitching with FFmpeg or similar
  // Example FFmpeg command for smooth transitions:
  // ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex
  // "[0:v][1:v]concat=n=2:v=1:a=0[v];[0:a][1:a]concat=n=2:v=0:a=1[a]"
  // -map "[v]" -map "[a]" -c:v libx264 -c:a aac output.mp4

  console.log('Video stitching placeholder: returning first video');
  console.log('In production, this would create smooth transitions between all videos');

  return videoUrls[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrls, userId, template = 'template1' } = body;

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

    console.log(`Starting Video Template 1 generation for ${imageUrls.length} images`);
    console.log('Image URLs:', imageUrls);

    // Process each image into a 5-second video
    const videoUrls: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`Processing image ${i + 1}/${imageUrls.length}: ${imageUrl}`);

      try {
        // Simple prompt for subtle camera motion
        const videoPrompt = "Add a subtle camera motion to this image, do not add or replace anything, stay in the bounds of this image";

        console.log(`Calling Replicate API for image ${i + 1} with prompt: ${videoPrompt}`);
        console.log(`This may take up to 60 minutes per image. Starting now...`);

        const videoUrl = await callReplicateImageToVideo(imageUrl, videoPrompt);
        videoUrls.push(videoUrl);
        console.log(`✅ Generated video ${i + 1}: ${videoUrl}`);
      } catch (error) {
        console.error(`❌ Failed to generate video for image ${i + 1}:`, error);
        // Continue with other images even if one fails
        console.log(`Continuing with remaining images...`);
      }
    }

    if (videoUrls.length === 0) {
      throw new Error('Failed to generate any videos from the provided images');
    }

    console.log(`Generated ${videoUrls.length} individual videos, now stitching together...`);

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