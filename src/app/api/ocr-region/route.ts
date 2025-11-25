import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, region } = await request.json();

    if (!imageUrl || !region) {
      return NextResponse.json({ error: 'imageUrl and region are required' }, { status: 400 });
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 });
    }

    console.log('=== OCR Region API Request ===');
    console.log('Image URL:', imageUrl);
    console.log('Region:', region);

    // For region-based OCR, we'll use the full image OCR and then filter results
    // This is a simplified approach - in production, you'd want region-specific OCR
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: "datalab-to/ocr",
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

      // Filter text results to only include those within the specified region
      const regionText = filterTextInRegion(prediction.output, region);
      return NextResponse.json({ text: regionText });
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

    console.log('=== OCR region operation completed successfully ===');

    // Filter text results to only include those within the specified region
    const regionText = filterTextInRegion(result.output, region);
    return NextResponse.json({ text: regionText });
  } catch (error) {
    console.error('=== Error performing OCR region ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json({ error: 'Failed to perform OCR on region', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// Filter text results to only include text within the specified region
function filterTextInRegion(ocrOutput: any, region: { x: number, y: number, width: number, height: number }): string {
  if (!ocrOutput || !Array.isArray(ocrOutput)) {
    return '';
  }

  // Calculate region bounds (normalized 0-1 coordinates)
  const regionLeft = region.x;
  const regionTop = region.y;
  const regionRight = region.x + region.width;
  const regionBottom = region.y + region.height;

  // Filter text items that are within the region
  const textInRegion = ocrOutput
    .filter((item: any) => {
      if (!item.box) return false;

      // Convert box coordinates from 0-1000 scale to 0-1 scale
      const [x1, y1, x2, y2] = item.box.map((coord: number) => coord / 1000);

      // Check if the text box overlaps with the region
      return !(x2 < regionLeft || x1 > regionRight || y2 < regionTop || y1 > regionBottom);
    })
    .map((item: any) => item.text)
    .join(' ')
    .trim();

  return textInRegion || '';
}