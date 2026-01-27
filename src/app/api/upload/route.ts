import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import {
  checkRateLimit,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../lib/security';

// Rate limiting: 10 uploads per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB for file uploads
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 10,
};

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/upload' });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
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

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('templates') // You'll need to create this bucket
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      logSecurityEvent('UPLOAD_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('templates')
      .getPublicUrl(fileName);

    logSecurityEvent('FILE_UPLOADED', {
      fileName,
      fileSize: file.size,
      userId: user.id,
      ip: clientIP
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      size: file.size
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in POST /api/upload:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/upload',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}