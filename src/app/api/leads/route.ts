import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  sanitizeInput
} from '../../../lib/security';
import { Lead, LEAD_SOURCES, LEAD_STAGES } from '../../../types/lead';

// Rate limiting: 20 requests per minute per IP for CRM operations
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

function validateLeadData(data: Partial<Lead>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Contact number is now optional
  if (data.contactNumber && typeof data.contactNumber === 'string') {
    if (data.contactNumber.length > 20) {
      errors.push('Contact number must be less than 20 characters');
    }
  }

  // Email is now optional
  if (data.email && typeof data.email === 'string') {
    if (data.email.trim().length === 0) {
      // Allow empty email
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    } else if (data.email.length > 100) {
      errors.push('Email must be less than 100 characters');
    }
  }

  if (!data.source || !LEAD_SOURCES.includes(data.source as typeof LEAD_SOURCES[number])) {
    errors.push('Valid source is required');
  }

  if (!data.leadStage || !LEAD_STAGES.includes(data.leadStage as typeof LEAD_STAGES[number])) {
    errors.push('Valid lead stage is required');
  }

  if (data.notes && typeof data.notes === 'string') {
    if (data.notes.length > 1000) {
      errors.push('Notes must be less than 1000 characters');
    }
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/leads - Get all leads with optional filtering
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/leads' });
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
    const leadStage = searchParams.get('leadStage');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user from JWT token in Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent('AUTH_ERROR', { error: 'No authorization header', ip: clientIP });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create a Supabase client with the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      logSecurityEvent('AUTH_ERROR', { error: authError?.message || 'Invalid token', ip: clientIP });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id) // Filter by authenticated user
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('API: Executing leads query for user:', user.id);

    // Also try without user filter to see if leads exist at all
    const testQuery = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: allLeads, error: testError } = await testQuery;
    console.log('API: All leads in database (first 10):', allLeads?.length || 0, 'error:', testError);
    if (allLeads && allLeads.length > 0) {
      console.log('API: Sample lead user_ids:', allLeads.slice(0, 3).map(l => ({ id: l.id, user_id: l.user_id })));
    }

    // Apply filters
    if (leadStage && LEAD_STAGES.includes(leadStage as typeof LEAD_STAGES[number])) {
      query = query.eq('lead_stage', leadStage);
    }

    if (source && LEAD_SOURCES.includes(source as typeof LEAD_SOURCES[number])) {
      query = query.eq('source', source);
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,contactNumber.ilike.%${sanitizedSearch}%`);
    }

    const { data: leads, error, count } = await query;

    console.log('API: Query result - leads:', leads?.length || 0, 'error:', error);

    if (error) {
      console.error('Error fetching leads:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Transform database column names (snake_case) to frontend field names (camelCase)
    const transformedLeads = (leads || []).map(lead => ({
      id: lead.id,
      name: lead.name,
      contactNumber: lead.contact_number, // Transform snake_case to camelCase
      email: lead.email,
      source: lead.source,
      leadStage: lead.lead_stage, // Transform snake_case to camelCase
      notes: lead.notes,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedLeads,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in GET /api/leads:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/leads',
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

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/leads' });
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/leads' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const leadData: Partial<Lead> = {
      name: sanitizeInput(body.name || ''),
      contactNumber: sanitizeInput(body.contactNumber || ''),
      email: sanitizeInput(body.email || ''),
      source: body.source,
      leadStage: body.leadStage || 'New',
      notes: body.notes ? sanitizeInput(body.notes) : ''
    };

    // Validate input
    const validation = validateLeadData(leadData);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid lead data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Get user from JWT token in Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent('AUTH_ERROR', { error: 'No authorization header', ip: clientIP });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create a Supabase client with the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      logSecurityEvent('AUTH_ERROR', { error: authError?.message || 'Invalid token', ip: clientIP });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const now = new Date().toISOString();
    // Remove contactNumber and leadStage from leadData and map to database column names
    const { contactNumber, leadStage, ...leadDataWithoutMappedFields } = leadData;
    const newLead = {
      ...leadDataWithoutMappedFields,
      user_id: user.id, // Set user ownership
      contact_number: contactNumber, // Map to database column name
      lead_stage: leadStage, // Map to database column name
      created_at: now,
      updated_at: now
    };

    // Use service role client to bypass RLS and set user ownership
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([newLead])
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('LEAD_CREATED', { leadId: data.id, ip: clientIP });

    return NextResponse.json({
      success: true,
      data
    }, { status: 201, headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in POST /api/leads:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/leads',
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

// PUT /api/leads - Bulk update leads (not typically used, but included for completeness)
export async function PUT(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/leads' });
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/leads' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs array is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate updates
    const sanitizedUpdates: Partial<Lead> = {};
    if (updates.name) sanitizedUpdates.name = sanitizeInput(updates.name);
    if (updates.contactNumber) sanitizedUpdates.contactNumber = sanitizeInput(updates.contactNumber);
    if (updates.email) sanitizedUpdates.email = sanitizeInput(updates.email);
    if (updates.source) sanitizedUpdates.source = updates.source;
    if (updates.leadStage) sanitizedUpdates.leadStage = updates.leadStage;
    if (updates.notes) sanitizedUpdates.notes = sanitizeInput(updates.notes);

    const validation = validateLeadData(sanitizedUpdates);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    sanitizedUpdates.updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .update(sanitizedUpdates)
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error updating leads:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to update leads' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('LEADS_UPDATED', { count: data?.length || 0, ip: clientIP });

    return NextResponse.json({
      success: true,
      data: data || [],
      updated: data?.length || 0
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in PUT /api/leads:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/leads',
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

// DELETE /api/leads - Bulk delete leads
export async function DELETE(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/leads' });
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
    const ids = searchParams.get('ids')?.split(',');

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Limit bulk delete to 50 items at once
    if (ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 leads can be deleted at once' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    const { data, error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error deleting leads:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to delete leads' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('LEADS_DELETED', { count: data?.length || 0, ip: clientIP });

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in DELETE /api/leads:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/leads',
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