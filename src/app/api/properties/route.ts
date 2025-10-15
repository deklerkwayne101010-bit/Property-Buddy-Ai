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
import { Property, PROPERTY_TYPES } from '../../../types/property';

// Rate limiting: 20 requests per minute per IP for CRM operations
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

function validatePropertyInput(data: Partial<Property>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  } else if (/[<>\"'&]/.test(data.title)) {
    errors.push('Title contains invalid characters');
  }

  if (!data.address || typeof data.address !== 'string' || data.address.trim().length === 0) {
    errors.push('Address is required');
  } else if (data.address.length > 300) {
    errors.push('Address must be less than 300 characters');
  }

  if (data.listingPrice !== undefined) {
    if (typeof data.listingPrice !== 'number' || data.listingPrice < 0) {
      errors.push('Listing price must be a positive number');
    } else if (data.listingPrice > 999999999) { // 999M max
      errors.push('Listing price is too high');
    }
  }

  if (data.propertyType && !PROPERTY_TYPES.includes(data.propertyType as typeof PROPERTY_TYPES[number])) {
    errors.push('Invalid property type');
  }

  if (data.bedrooms !== undefined) {
    if (!Number.isInteger(data.bedrooms) || data.bedrooms < 0 || data.bedrooms > 50) {
      errors.push('Bedrooms must be a valid number between 0 and 50');
    }
  }

  if (data.bathrooms !== undefined) {
    if (!Number.isInteger(data.bathrooms) || data.bathrooms < 0 || data.bathrooms > 50) {
      errors.push('Bathrooms must be a valid number between 0 and 50');
    }
  }

  if (data.parking !== undefined) {
    if (!Number.isInteger(data.parking) || data.parking < 0 || data.parking > 20) {
      errors.push('Parking must be a valid number between 0 and 20');
    }
  }

  if (data.size !== undefined) {
    if (typeof data.size !== 'number' || data.size <= 0 || data.size > 100000) {
      errors.push('Size must be a positive number up to 100,000 sqm');
    }
  }

  if (data.description && typeof data.description === 'string') {
    if (data.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }
  }

  if (data.photos && Array.isArray(data.photos)) {
    if (data.photos.length > 5) {
      errors.push('Maximum 5 photos allowed');
    }
    data.photos.forEach((photo, index) => {
      if (typeof photo !== 'string') {
        errors.push(`Photo ${index + 1} must be a string URL`);
      } else if (photo.length > 500) {
        errors.push(`Photo ${index + 1} URL is too long`);
      } else if (!/^https?:\/\/.+/.test(photo)) {
        errors.push(`Photo ${index + 1} must be a valid HTTP/HTTPS URL`);
      }
    });
  }

  if (data.linkedLeadIds && Array.isArray(data.linkedLeadIds)) {
    if (data.linkedLeadIds.length > 10) {
      errors.push('Maximum 10 linked leads allowed');
    }
    data.linkedLeadIds.forEach((id, index) => {
      if (typeof id !== 'string') {
        errors.push(`Linked lead ID ${index + 1} must be a string`);
      } else if (id.length > 50) {
        errors.push(`Linked lead ID ${index + 1} is too long`);
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/properties - Get all properties with optional filtering and lead linking
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/properties' });
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
    const propertyType = searchParams.get('propertyType');
    const linkedLeadId = searchParams.get('linkedLeadId');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeLeads = searchParams.get('includeLeads') === 'true';

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (propertyType && PROPERTY_TYPES.includes(propertyType as typeof PROPERTY_TYPES[number])) {
      query = query.eq('propertyType', propertyType);
    }

    if (linkedLeadId) {
      query = query.contains('linkedLeadIds', [linkedLeadId]);
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        query = query.gte('listingPrice', min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        query = query.lte('listingPrice', max);
      }
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      query = query.or(`title.ilike.%${sanitizedSearch}%,address.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
    }

    const { data: properties, error, count } = await query;

    if (error) {
      console.error('Error fetching properties:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    let enrichedProperties = properties || [];

    // Include linked leads information if requested
    if (includeLeads && enrichedProperties.length > 0) {
      const allLeadIds = [...new Set(enrichedProperties.flatMap(p => p.linkedLeadIds || []))];

      if (allLeadIds.length > 0) {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, name, email, contactNumber, leadStage')
          .in('id', allLeadIds);

        if (leadsError) {
          console.error('Error fetching linked leads:', leadsError);
        } else {
          // Create a map for quick lookup
          const leadsMap = new Map(leads?.map(lead => [lead.id, lead]) || []);

          // Enrich properties with lead details
          enrichedProperties = enrichedProperties.map(property => ({
            ...property,
            linkedLeads: property.linkedLeadIds?.map((id: string) => leadsMap.get(id)).filter(Boolean) || []
          }));
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedProperties,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/properties',
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

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/properties' });
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/properties' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const propertyData: Partial<Property> = {
      title: sanitizeInput(body.title || ''),
      address: sanitizeInput(body.address || ''),
      listingPrice: body.listingPrice,
      propertyType: body.propertyType,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      parking: body.parking,
      size: body.size,
      description: body.description ? sanitizeInput(body.description) : '',
      photos: body.photos || [],
      linkedLeadIds: body.linkedLeadIds || []
    };

    // Validate input
    const validation = validatePropertyInput(propertyData);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid property data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Verify linked leads exist if provided
    if (propertyData.linkedLeadIds && propertyData.linkedLeadIds.length > 0) {
      const { data: existingLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .in('id', propertyData.linkedLeadIds);

      if (leadsError) {
        console.error('Error verifying linked leads:', leadsError);
        return NextResponse.json(
          { error: 'Failed to verify linked leads' },
          { status: 500, headers: createSecurityHeaders() }
        );
      }

      const existingLeadIds = new Set(existingLeads?.map(l => l.id) || []);
      const invalidLeadIds = propertyData.linkedLeadIds.filter(id => !existingLeadIds.has(id));

      if (invalidLeadIds.length > 0) {
        return NextResponse.json(
          { error: 'Some linked lead IDs do not exist', invalidIds: invalidLeadIds },
          { status: 400, headers: createSecurityHeaders() }
        );
      }
    }

    const now = new Date().toISOString();
    const newProperty = {
      ...propertyData,
      createdAt: now,
      updatedAt: now
    };

    const { data, error } = await supabase
      .from('properties')
      .insert([newProperty])
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to create property' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('PROPERTY_CREATED', { propertyId: data.id, ip: clientIP });

    return NextResponse.json({
      success: true,
      data
    }, { status: 201, headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in POST /api/properties:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/properties',
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

// PUT /api/properties - Bulk update properties
export async function PUT(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/properties' });
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: '/api/properties' });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Property IDs array is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Sanitize and prepare updates
    const sanitizedUpdates: Partial<Property> = {};
    if (updates.title) sanitizedUpdates.title = sanitizeInput(updates.title);
    if (updates.address) sanitizedUpdates.address = sanitizeInput(updates.address);
    if (updates.listingPrice !== undefined) sanitizedUpdates.listingPrice = updates.listingPrice;
    if (updates.propertyType) sanitizedUpdates.propertyType = updates.propertyType;
    if (updates.bedrooms !== undefined) sanitizedUpdates.bedrooms = updates.bedrooms;
    if (updates.bathrooms !== undefined) sanitizedUpdates.bathrooms = updates.bathrooms;
    if (updates.parking !== undefined) sanitizedUpdates.parking = updates.parking;
    if (updates.size !== undefined) sanitizedUpdates.size = updates.size;
    if (updates.description) sanitizedUpdates.description = sanitizeInput(updates.description);
    if (updates.photos) sanitizedUpdates.photos = updates.photos;
    if (updates.linkedLeadIds) sanitizedUpdates.linkedLeadIds = updates.linkedLeadIds;

    // Validate updates
    const validation = validatePropertyInput(sanitizedUpdates);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Verify linked leads exist if updating linkedLeadIds
    if (sanitizedUpdates.linkedLeadIds && sanitizedUpdates.linkedLeadIds.length > 0) {
      const { data: existingLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .in('id', sanitizedUpdates.linkedLeadIds);

      if (leadsError) {
        console.error('Error verifying linked leads:', leadsError);
        return NextResponse.json(
          { error: 'Failed to verify linked leads' },
          { status: 500, headers: createSecurityHeaders() }
        );
      }

      const existingLeadIds = new Set(existingLeads?.map(l => l.id) || []);
      const invalidLeadIds = sanitizedUpdates.linkedLeadIds.filter(id => !existingLeadIds.has(id));

      if (invalidLeadIds.length > 0) {
        return NextResponse.json(
          { error: 'Some linked lead IDs do not exist', invalidIds: invalidLeadIds },
          { status: 400, headers: createSecurityHeaders() }
        );
      }
    }

    sanitizedUpdates.updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('properties')
      .update(sanitizedUpdates)
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error updating properties:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to update properties' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('PROPERTIES_UPDATED', { count: data?.length || 0, ip: clientIP });

    return NextResponse.json({
      success: true,
      data: data || [],
      updated: data?.length || 0
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in PUT /api/properties:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/properties',
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

// DELETE /api/properties - Bulk delete properties
export async function DELETE(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/properties' });
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
        { error: 'Property IDs are required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Limit bulk delete to 50 items at once
    if (ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 properties can be deleted at once' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    const { data, error } = await supabase
      .from('properties')
      .delete()
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error deleting properties:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to delete properties' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('PROPERTIES_DELETED', { count: data?.length || 0, ip: clientIP });

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in DELETE /api/properties:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/properties',
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