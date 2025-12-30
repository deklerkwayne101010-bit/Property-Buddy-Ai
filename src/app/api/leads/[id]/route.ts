import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  sanitizeInput
} from '../../../../lib/security';
import { Lead, LEAD_SOURCES, LEAD_STAGES } from '../../../../types/lead';

// Rate limiting: 30 requests per minute per IP for individual lead operations
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 30,
};

function validateLeadData(data: Partial<Lead>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (data.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }
  }

  // Contact number is now optional
  if (data.contactNumber !== undefined && data.contactNumber.trim().length > 0) {
    if (data.contactNumber.length > 20) {
      errors.push('Contact number must be less than 20 characters');
    }
  }

  // Email is now optional
  if (data.email !== undefined && data.email.trim().length > 0) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    } else if (data.email.length > 100) {
      errors.push('Email must be less than 100 characters');
    }
  }

  if (data.source !== undefined && !LEAD_SOURCES.includes(data.source as typeof LEAD_SOURCES[number])) {
    errors.push('Valid source is required');
  }

  if (data.leadStage !== undefined && !LEAD_STAGES.includes(data.leadStage as typeof LEAD_STAGES[number])) {
    errors.push('Valid lead stage is required');
  }

  if (data.notes !== undefined && typeof data.notes === 'string') {
    if (data.notes.length > 1000) {
      errors.push('Notes must be less than 1000 characters');
    }
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/leads/[id] - Get a specific lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIP = getClientIP(request);
  const { id } = await params;

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: `/api/leads/${id}` });
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

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404, headers: createSecurityHeaders() }
        );
      }
      console.error('Error fetching lead:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    return NextResponse.json({
      success: true,
      data
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in GET /api/leads/[id]:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: `/api/leads/${id}`,
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

// PUT /api/leads/[id] - Update a specific lead
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIP = getClientIP(request);
  const { id } = await params;

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: `/api/leads/${id}` });
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: `/api/leads/${id}` });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const updates: Partial<Lead> = {};

    // Sanitize and prepare updates
    if (body.name !== undefined) updates.name = sanitizeInput(body.name);
    if (body.contactNumber !== undefined) updates.contactNumber = sanitizeInput(body.contactNumber);
    if (body.email !== undefined) updates.email = sanitizeInput(body.email);
    if (body.source !== undefined) updates.source = body.source;
    if (body.leadStage !== undefined) updates.leadStage = body.leadStage;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizeInput(body.notes) : '';

    // Validate updates
    const validation = validateLeadData(updates);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    updates.updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404, headers: createSecurityHeaders() }
        );
      }
      console.error('Error updating lead:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to update lead' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('LEAD_UPDATED', { leadId: id, ip: clientIP });

    return NextResponse.json({
      success: true,
      data
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in PUT /api/leads/[id]:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: `/api/leads/${id}`,
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

// DELETE /api/leads/[id] - Delete a specific lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIP = getClientIP(request);
  const { id } = await params;

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: `/api/leads/${id}` });
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

    // Check if lead exists and get linked properties
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404, headers: createSecurityHeaders() }
        );
      }
      console.error('Error fetching lead:', fetchError);
      logSecurityEvent('DATABASE_ERROR', { error: fetchError.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Check for linked properties
    const { data: linkedProperties, error: linkError } = await supabase
      .from('properties')
      .select('id, title')
      .contains('linkedLeadIds', [id]);

    if (linkError) {
      console.error('Error checking linked properties:', linkError);
      logSecurityEvent('DATABASE_ERROR', { error: linkError.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to check linked properties' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    if (linkedProperties && linkedProperties.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete lead with linked properties',
          linkedProperties: linkedProperties.map(p => ({ id: p.id, title: p.title }))
        },
        { status: 409, headers: createSecurityHeaders() }
      );
    }

    // Delete the lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting lead:', deleteError);
      logSecurityEvent('DATABASE_ERROR', { error: deleteError.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to delete lead' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('LEAD_DELETED', { leadId: id, leadName: lead.name, ip: clientIP });

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in DELETE /api/leads/[id]:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: `/api/leads/${id}`,
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