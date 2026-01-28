import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrls, userId } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check user credits and deduct if sufficient
    const creditResult = await checkCreditsAndDeduct(userId, 5);
    if (!creditResult.success) {
      return NextResponse.json({
        error: creditResult.error || 'Unable to verify credits. Please try again.'
      }, { status: 400 });
    }

    // Validate total images (up to 14 supported by Nano Banana Pro)
    if (imageUrls && imageUrls.length > 14) {
      return NextResponse.json({ error: 'Too many reference images. Maximum 14 images allowed.' }, { status: 400 });
    }

    // Prepare Replicate API request
    const replicatePayload = {
      input: {
        prompt: prompt,
        resolution: "1K",
        image_input: imageUrls || [],
        aspect_ratio: "4:3",
        output_format: "png",
        safety_filter_level: "block_only_high"
      }
    };

    // Call Replicate API
    const replicateResponse = await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify(replicatePayload)
    });

    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.json();
      console.error('Replicate API error:', errorData);
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    const replicateData = await replicateResponse.json();

    // Log usage
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        feature: 'ai_playground_generation',
        credits_used: 5
      });

    return NextResponse.json({
      image_url: replicateData.output,
      credits_remaining: creditResult.newCredits
    });

  } catch (error) {
    console.error('AI Playground API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}