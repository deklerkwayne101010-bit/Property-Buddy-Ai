import { NextRequest, NextResponse } from 'next/server';
import { checkCreditsAndDeduct } from '@/lib/creditUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrls, userId } = body;

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

    // This is a placeholder for the full video generation workflow
    // The individual steps are implemented in separate API routes:
    // - /api/voice-clone for voice cloning
    // - /api/avatar-generate for avatar video generation

    return NextResponse.json({
      message: 'Video generation workflow is implemented through individual API endpoints',
      creditsDeducted: 4,
      remainingCredits: creditResult.newCredits,
      endpoints: [
        '/api/voice-clone - Generate voice clone from script',
        '/api/avatar-generate - Generate avatar video from image and audio'
      ]
    });
  } catch (error) {
    console.error('Video generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}