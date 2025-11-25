import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 });
    }

    console.log('=== OCR API Request ===');
    console.log('Image URL:', imageUrl);

    // Call Replicate datalab-to/ocr model
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: "datalab-to/ocr", // Using datalab-to/ocr model
        input: {
          image: imageUrl,
          format: "json"
        }
      })
    });

    console.log('Replicate API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error response body:', errorText);
      throw new Error(`Replicate API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const prediction = await response.json();
    console.log('Replicate prediction response:', JSON.stringify(prediction, null, 2));

    // Check if prediction succeeded immediately (due to 'Prefer: wait' header)
    if (prediction.status === 'succeeded') {
      console.log('Prediction succeeded immediately, output:', prediction.output);
      return NextResponse.json({ textData: prediction.output });
    } else if (prediction.status === 'failed') {
      console.error('Prediction failed, error details:', prediction.error);
      throw new Error(`OCR failed: ${prediction.error || 'Unknown error'}`);
    }

    // Poll for completion if not immediate
    let result = prediction;
    let pollCount = 0;
    while (result.status !== 'succeeded') {
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
        throw new Error(`OCR failed: ${result.error || 'Unknown error'}`);
      } else if (result.status === 'cancelled') {
        console.error('Prediction was cancelled');
        throw new Error('OCR was cancelled');
      }

      // Wait 2 seconds before checking again
      console.log('Waiting 2 seconds before next poll...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('=== OCR operation completed successfully ===');
    return NextResponse.json({ textData: result.output });
  } catch (error) {
    console.error('=== Error performing OCR ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json({ error: 'Failed to perform OCR', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}