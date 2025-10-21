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
import { CanvaTemplate, TEMPLATE_CATEGORIES } from '../../../types/template';

// Rate limiting: 20 requests per minute per IP for template operations
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

function validateCanvaTemplateData(data: Partial<CanvaTemplate>): { isValid: boolean; errors: string[] } {
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

  if (!data.backgroundImage || typeof data.backgroundImage !== 'string') {
    errors.push('Background image URL is required');
  }

  if (!data.editableZones || !Array.isArray(data.editableZones)) {
    errors.push('Editable zones are required');
  } else if (data.editableZones.length === 0) {
    errors.push('Template must have at least one editable zone');
  } else if (data.editableZones.length > 20) {
    errors.push('Template cannot have more than 20 editable zones');
  }

  if (!data.canvasWidth || typeof data.canvasWidth !== 'number' || data.canvasWidth <= 0) {
    errors.push('Valid canvas width is required');
  }

  if (!data.canvasHeight || typeof data.canvasHeight !== 'number' || data.canvasHeight <= 0) {
    errors.push('Valid canvas height is required');
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/canva-templates - Get all public Canva templates
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/canva-templates' });
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
      .from('canva_templates')
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
      console.error('Error fetching Canva templates:', error);
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
    console.error('Error in GET /api/canva-templates:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/canva-templates',
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

// POST /api/canva-templates - Create a new Canva template
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/canva-templates' });
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/canva-templates' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const templateData: Partial<CanvaTemplate> = {
      name: sanitizeInput(body.name || ''),
      description: sanitizeInput(body.description || ''),
      category: body.category,
      canvaDesignId: body.canvaDesignId,
      backgroundImage: body.backgroundImage,
      editableZones: body.editableZones || [],
      canvasWidth: body.canvasWidth || 800,
      canvasHeight: body.canvasHeight || 600,
      createdBy: user.id,
      isPublic: true, // All Canva templates are public for agents
      tags: body.tags || []
    };

    // Validate input
    const validation = validateCanvaTemplateData(templateData);
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
      .from('canva_templates')
      .insert([newTemplate])
      .select()
      .single();

    if (error) {
      console.error('Error creating Canva template:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('CANVA_TEMPLATE_CREATED', { templateId: data.id, ip: clientIP });

    return NextResponse.json({
      success: true,
      data
    }, { status: 201, headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in POST /api/canva-templates:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/canva-templates',
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