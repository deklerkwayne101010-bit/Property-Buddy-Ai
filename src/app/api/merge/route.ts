import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../lib/security';

const execAsync = promisify(exec);

// Rate limiting: 5 merges per minute per IP (merging is resource intensive)
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 50 * 1024 * 1024, // 50MB (for video + audio files)
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 5,
};

interface MergeRequest {
  videoUrl: string;
  audioUrl: string;
  outputFormat?: 'mp4' | 'webm' | 'avi';
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.promises.writeFile(outputPath, Buffer.from(buffer));
}

async function mergeVideoAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  // Use FFmpeg to merge video and audio
  const command = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 "${outputPath}" -y`;

  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('FFmpeg stdout:', stdout);
    if (stderr) console.log('FFmpeg stderr:', stderr);
  } catch (error) {
    console.error('FFmpeg error:', error);
    throw new Error(`Video-audio merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  let tempDir = '';

  try {
    // Security checks

    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/merge' });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Video merging is limited to 5 requests per minute.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            ...createSecurityHeaders()
          }
        }
      );
    }

    // Check request size
    if (!validateRequestSize(request)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/merge' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body: MergeRequest = await request.json();

    const { videoUrl, audioUrl, outputFormat = 'mp4' } = body;

    // Validate required fields
    if (!videoUrl || !audioUrl) {
      return NextResponse.json(
        { error: 'Both videoUrl and audioUrl are required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate URLs (basic validation)
    try {
      new URL(videoUrl);
      new URL(audioUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid video or audio URL format' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate output format
    const validFormats = ['mp4', 'webm', 'avi'];
    if (!validFormats.includes(outputFormat)) {
      return NextResponse.json(
        { error: 'Invalid output format. Must be one of: mp4, webm, avi' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Create temporary directory
    tempDir = path.join(process.cwd(), 'temp', `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    await fs.promises.mkdir(tempDir, { recursive: true });

    const videoPath = path.join(tempDir, 'input_video.mp4');
    const audioPath = path.join(tempDir, 'input_audio.mp3');
    const outputPath = path.join(tempDir, `output.${outputFormat}`);

    // Log merge attempt
    logSecurityEvent('MERGE_STARTED', {
      ip: clientIP,
      videoUrl: videoUrl.substring(0, 100) + (videoUrl.length > 100 ? '...' : ''),
      audioUrl: audioUrl.substring(0, 100) + (audioUrl.length > 100 ? '...' : ''),
      outputFormat
    });

    // Download video and audio files
    await Promise.all([
      downloadFile(videoUrl, videoPath),
      downloadFile(audioUrl, audioPath)
    ]);

    // Merge video and audio
    await mergeVideoAudio(videoPath, audioPath, outputPath);

    // Read the merged file
    const mergedBuffer = await fs.promises.readFile(outputPath);

    // Log successful merge
    logSecurityEvent('MERGE_COMPLETED', {
      ip: clientIP,
      outputSize: mergedBuffer.length,
      outputFormat
    });

    // Return merged video file
    return new NextResponse(new Uint8Array(mergedBuffer), {
      status: 200,
      headers: {
        'Content-Type': `video/${outputFormat}`,
        'Content-Length': mergedBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="merged_video.${outputFormat}"`,
        ...createSecurityHeaders()
      }
    });

  } catch (error) {
    console.error('Error in merge API:', error);
    logSecurityEvent('MERGE_ERROR', {
      endpoint: '/api/merge',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to merge video and audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  } finally {
    // Clean up temporary files
    if (tempDir) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Failed to clean up temp directory:', cleanupError);
      }
    }
  }
}