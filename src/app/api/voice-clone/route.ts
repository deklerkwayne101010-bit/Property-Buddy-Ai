import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { scriptText, speakerUrl } = await request.json();

    if (!scriptText || !speakerUrl) {
      return NextResponse.json(
        { error: 'Missing scriptText or speakerUrl' },
        { status: 400 }
      );
    }

    // Call Replicate API for voice cloning
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e',
        input: {
          text: scriptText,
          speaker: speakerUrl,
          language: 'en',
          cleanup_voice: false,
        },
      }),
    });

    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.text();
      console.error('Replicate API error:', errorData);
      console.error('Request body:', JSON.stringify({
        version: '684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e',
        input: {
          text: scriptText,
          speaker: speakerUrl,
          language: 'en',
          cleanup_voice: false,
        },
      }, null, 2));
      return NextResponse.json(
        { error: 'Failed to start voice cloning' },
        { status: replicateResponse.status }
      );
    }

    const prediction = await replicateResponse.json();

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

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
      throw new Error('Voice cloning timed out after 2 minutes');
    }

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: 'Voice cloning failed' },
        { status: 500 }
      );
    }

    // Return the voice clone URL
    console.log('Voice clone completed successfully:', result.output);
    return NextResponse.json({
      voiceCloneUrl: result.output,
      predictionId: prediction.id,
    });

  } catch (error) {
    console.error('Voice clone API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}