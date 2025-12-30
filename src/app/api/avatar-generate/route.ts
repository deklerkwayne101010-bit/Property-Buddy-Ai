import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, audioUrl } = await request.json();

    if (!imageUrl || !audioUrl) {
      return NextResponse.json(
        { error: 'Missing imageUrl or audioUrl' },
        { status: 400 }
      );
    }

    // Call Replicate API for avatar video generation using lucataco/talking-avatar
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'latest',
        input: {
          audio: audioUrl,
          image: imageUrl,
          captions: true,
          duration: 10,
          resolution: "720p",
        },
      }),
    });

    console.log('Avatar generation request sent with URLs:');
    console.log('Image URL:', imageUrl);
    console.log('Audio URL:', audioUrl);


    let prediction;
    if (replicateResponse.ok) {
      prediction = await replicateResponse.json();
    } else {
      // Try fallback immediately
      console.log('Primary version failed, trying fallback...');
      const fallbackResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'latest',
          input: {
            audio: audioUrl,
            image: imageUrl,
          },
        }),
      });

      if (fallbackResponse.ok) {
        console.log('Fallback model name worked!');
        prediction = await fallbackResponse.json();
      } else {
        console.error('Fallback also failed:', await fallbackResponse.text());
        return NextResponse.json(
          { error: 'Failed to start avatar generation with both version formats' },
          { status: 500 }
        );
      }
    }

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes max (avatar generation takes longer)

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;

      console.log(`Polling attempt ${attempts}/${maxAttempts}, status: ${result.status}`);

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check prediction status');
      }

      result = await statusResponse.json();
    }

    if (attempts >= maxAttempts) {
      throw new Error('Avatar generation timed out after 4 minutes');
    }

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: 'Avatar generation failed' },
        { status: 500 }
      );
    }

    // Return the avatar video URL
    console.log('Avatar generation completed successfully:', result.output);
    return NextResponse.json({
      avatarVideoUrl: result.output,
      predictionId: prediction.id,
    });

  } catch (error) {
    console.error('Avatar generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}