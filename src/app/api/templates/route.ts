import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  sanitizeInput
} from '../../../lib/security';
import { Template, TEMPLATE_CATEGORIES } from '../../../types/template';

// Rate limiting: 20 requests per minute per IP for template operations
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

function validateTemplateData(data: Partial<Template>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Template name is required');
  } else if (data.name.length > 100) {
    errors.push('Template name must be less than 100 characters');
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Template description is required');
  } else if (data.description.length > 500) {
    errors.push('Template description must be less than 500 characters');
  }

  if (!data.category || !TEMPLATE_CATEGORIES.some(cat => cat.value === data.category)) {
    errors.push('Valid template category is required');
  }

  if (!data.elements || !Array.isArray(data.elements)) {
    errors.push('Template elements are required');
  } else if (data.elements.length === 0) {
    errors.push('Template must have at least one element');
  } else if (data.elements.length > 50) {
    errors.push('Template cannot have more than 50 elements');
  }

  if (!data.canvasWidth || typeof data.canvasWidth !== 'number' || data.canvasWidth <= 0) {
    errors.push('Valid canvas width is required');
  }

  if (!data.canvasHeight || typeof data.canvasHeight !== 'number' || data.canvasHeight <= 0) {
    errors.push('Valid canvas height is required');
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/templates - Get all public templates
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/templates' });
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
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category && TEMPLATE_CATEGORIES.some(cat => cat.value === category)) {
      query = query.eq('category', category);
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      query = query.or(`name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
    }

    const { data: templates, error, count } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    return NextResponse.json({
      success: true,
      data: templates || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in GET /api/templates:', error);
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

// POST /api/templates - Create a new template (admin only)
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/templates' });
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

    if (!validateRequestSize(request)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/templates' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    // Check if user is admin (you'll need to implement proper admin check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    // For now, allow all authenticated users to create templates
    // In production, check if user has admin role

    const body = await request.json();
    const templateData: Partial<Template> = {
      name: sanitizeInput(body.name || ''),
      description: sanitizeInput(body.description || ''),
      category: body.category,
      thumbnail: body.thumbnail || '',
      elements: body.elements || [],
      canvasWidth: body.canvasWidth || 800,
      canvasHeight: body.canvasHeight || 600,
      createdBy: user.id,
      isPublic: true, // For now, all templates are public
      tags: body.tags || []
    };

    // Validate input
    const validation = validateTemplateData(templateData);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid template data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    const now = new Date().toISOString();
    const newTemplate = {
      ...templateData,
      createdAt: now,
      updatedAt: now
    };

    const { data, error } = await supabase
      .from('templates')
      .insert([newTemplate])
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('TEMPLATE_CREATED', { templateId: data.id, ip: clientIP });

    return NextResponse.json({
      success: true,
      data
    }, { status: 201, headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in POST /api/templates:', error);
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