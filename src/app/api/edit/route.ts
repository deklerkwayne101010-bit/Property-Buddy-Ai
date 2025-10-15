import { NextRequest, NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const refinedPrompt = formData.get('refined_prompt') as string;
    const maskFile = formData.get('mask') as File | null;

    if (!imageFile || !refinedPrompt) {
      return NextResponse.json({ error: 'image and refined_prompt are required' }, { status: 400 });
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 });
    }

    // Convert files to base64
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageBase64 = imageBuffer.toString('base64');

    let maskBase64: string | undefined;
    if (maskFile) {
      const maskBuffer = Buffer.from(await maskFile.arrayBuffer());
      maskBase64 = maskBuffer.toString('base64');
    }

    // Call Replicate API
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'asiryan/realistic-vision-v6.0-b1',
        input: {
          image: `data:${imageFile.type};base64,${imageBase64}`,
          prompt: refinedPrompt,
          mask: maskBase64 ? `data:${maskFile!.type};base64,${maskBase64}` : undefined,
          inpainting: !!maskBase64,
        },
      }),
    });

    if (!replicateResponse.ok) {
      throw new Error(`Replicate API error: ${replicateResponse.statusText}`);
    }

    const prediction = await replicateResponse.json();

    // Poll for completion
    let result;
    while (true) {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${replicateToken}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Replicate status check error: ${statusResponse.statusText}`);
      }

      result = await statusResponse.json();

      if (result.status === 'succeeded') {
        break;
      } else if (result.status === 'failed') {
        throw new Error('Image editing failed');
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return NextResponse.json({ edited_image_url: result.output });
  } catch (error) {
    console.error('Error editing image:', error);
    return NextResponse.json({ error: 'Failed to edit image' }, { status: 500 });
  }
}