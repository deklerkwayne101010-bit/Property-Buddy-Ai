import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import {
  checkRateLimit,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  SecurityConfig
} from '../../../lib/security';

// Rate limiting: 20 requests per minute per IP for templates
const RATE_LIMIT_CONFIG: SecurityConfig = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

interface TemplateData {
  id?: string;
  name: string;
  content: string;
  category: string;
  platform: string;
  tone: string;
  length: string;
  isShared: boolean;
  userId: string;
  teamId?: string;
}

// GET /api/templates - Fetch user's templates
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP });
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    let query = supabase
      .from('user_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Search by name or content if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in templates GET:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/templates',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP });
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

    const body: TemplateData = await request.json();
    const { name, content, category, platform, tone, length, isShared, userId, teamId } = body;

    // Validate required fields
    if (!name || !content || !category || !platform || !tone || !length || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Insert new template
    const { data: template, error } = await supabase
      .from('user_templates')
      .insert({
        name,
        content,
        category,
        platform,
        tone,
        length,
        is_shared: isShared || false,
        user_id: userId,
        team_id: teamId || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    return NextResponse.json({
      success: true,
      template
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in templates POST:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/templates',
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

// PUT /api/templates - Update an existing template
export async function PUT(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP });
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

    const body: TemplateData = await request.json();
    const { id, name, content, category, platform, tone, length, isShared, userId } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Template ID and User ID are required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Update template
    const { data: template, error } = await supabase
      .from('user_templates')
      .update({
        name,
        content,
        category,
        platform,
        tone,
        length,
        is_shared: isShared || false
      })
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own templates
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404, headers: createSecurityHeaders() }
      );
    }

    return NextResponse.json({
      success: true,
      template
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in templates PUT:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/templates',
      method: 'PUT',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}

// DELETE /api/templates - Delete a template
export async function DELETE(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP });
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Template ID and User ID are required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Delete template
    const { error } = await supabase
      .from('user_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensure user can only delete their own templates

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in templates DELETE:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/templates',
      method: 'DELETE',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}