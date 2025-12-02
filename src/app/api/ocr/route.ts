import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Handle JSON request with imageUrl (can be data URL or regular URL)
    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    console.log('=== OCR API Request ===');
    console.log('Image URL:', imageUrl);

    // Try using a different OCR approach - let's use Tesseract.js directly in the browser
    // For now, return a mock response to test the flow
    console.log('Would process OCR for image URL:', imageUrl.substring(0, 50) + '...');

    // Mock response for testing
    const mockText = "Sample extracted text from image";
    return NextResponse.json({ text: mockText });

    console.log('=== OCR operation completed successfully (mock) ===');
    return NextResponse.json({ text: mockText });
  } catch (error) {
    console.error('=== Error performing OCR ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json({ error: 'Failed to perform OCR', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}