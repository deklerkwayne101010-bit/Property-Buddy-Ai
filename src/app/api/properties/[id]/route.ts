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
import { Property, PROPERTY_TYPES } from '../../../../types/property';

// Rate limiting: 30 requests per minute per IP for individual property operations
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 30,
};

function validatePropertyInput(data: Partial<Property>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (data.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    } else if (/[<>\"'&]/.test(data.title)) {
      errors.push('Title contains invalid characters');
    }
  }

  if (data.address !== undefined) {
    if (!data.address || typeof data.address !== 'string' || data.address.trim().length === 0) {
      errors.push('Address is required');
    } else if (data.address.length > 300) {
      errors.push('Address must be less than 300 characters');
    }
  }

  if (data.listingPrice !== undefined) {
    if (typeof data.listingPrice !== 'number' || data.listingPrice < 0) {
      errors.push('Listing price must be a positive number');
    } else if (data.listingPrice > 999999999) { // 999M max
      errors.push('Listing price is too high');
    }
  }

  if (data.propertyType !== undefined && !PROPERTY_TYPES.includes(data.propertyType as typeof PROPERTY_TYPES[number])) {
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

  if (data.description !== undefined && typeof data.description === 'string') {
    if (data.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }
  }

  if (data.photos !== undefined && Array.isArray(data.photos)) {
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

  if (data.linkedLeadIds !== undefined && Array.isArray(data.linkedLeadIds)) {
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

// GET /api/properties/[id] - Get a specific property with linked leads
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
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: `/api/properties/${id}` });
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
    const includeLeads = searchParams.get('includeLeads') === 'true';

    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404, headers: createSecurityHeaders() }
        );
      }
      console.error('Error fetching property:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to fetch property' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    let enrichedProperty = property;

    // Include linked leads information if requested
    if (includeLeads && property.linkedLeadIds && property.linkedLeadIds.length > 0) {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, email, contactNumber, leadStage')
        .in('id', property.linkedLeadIds);

      if (leadsError) {
        console.error('Error fetching linked leads:', leadsError);
      } else {
        // Create a map for quick lookup
        const leadsMap = new Map(leads?.map(lead => [lead.id, lead]) || []);

        // Enrich property with lead details
        enrichedProperty = {
          ...property,
          linkedLeads: property.linkedLeadIds.map((id: string) => leadsMap.get(id)).filter(Boolean)
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedProperty
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in GET /api/properties/[id]:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: `/api/properties/${id}`,
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

// PUT /api/properties/[id] - Update a specific property
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
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: `/api/properties/${id}` });
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
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP, endpoint: `/api/properties/${id}` });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body = await request.json();
    const updates: Partial<Property> = {};

    // Sanitize and prepare updates
    if (body.title !== undefined) updates.title = sanitizeInput(body.title);
    if (body.address !== undefined) updates.address = sanitizeInput(body.address);
    if (body.listingPrice !== undefined) updates.listingPrice = body.listingPrice;
    if (body.propertyType !== undefined) updates.propertyType = body.propertyType;
    if (body.bedrooms !== undefined) updates.bedrooms = body.bedrooms;
    if (body.bathrooms !== undefined) updates.bathrooms = body.bathrooms;
    if (body.parking !== undefined) updates.parking = body.parking;
    if (body.size !== undefined) updates.size = body.size;
    if (body.description !== undefined) updates.description = body.description ? sanitizeInput(body.description) : '';
    if (body.photos !== undefined) updates.photos = body.photos;
    if (body.linkedLeadIds !== undefined) updates.linkedLeadIds = body.linkedLeadIds;

    // Validate updates
    const validation = validatePropertyInput(updates);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.errors },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Verify linked leads exist if updating linkedLeadIds
    if (updates.linkedLeadIds && updates.linkedLeadIds.length > 0) {
      const { data: existingLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .in('id', updates.linkedLeadIds);

      if (leadsError) {
        console.error('Error verifying linked leads:', leadsError);
        return NextResponse.json(
          { error: 'Failed to verify linked leads' },
          { status: 500, headers: createSecurityHeaders() }
        );
      }

      const existingLeadIds = new Set(existingLeads?.map(l => l.id) || []);
      const invalidLeadIds = updates.linkedLeadIds.filter((id: string) => !existingLeadIds.has(id));

      if (invalidLeadIds.length > 0) {
        return NextResponse.json(
          { error: 'Some linked lead IDs do not exist', invalidIds: invalidLeadIds },
          { status: 400, headers: createSecurityHeaders() }
        );
      }
    }

    updates.updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404, headers: createSecurityHeaders() }
        );
      }
      console.error('Error updating property:', error);
      logSecurityEvent('DATABASE_ERROR', { error: error.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to update property' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('PROPERTY_UPDATED', { propertyId: id, ip: clientIP });

    return NextResponse.json({
      success: true,
      data
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in PUT /api/properties/[id]:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: `/api/properties/${id}`,
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

// DELETE /api/properties/[id] - Delete a specific property
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
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: `/api/properties/${id}` });
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

    // Check if property exists
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, title')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404, headers: createSecurityHeaders() }
        );
      }
      console.error('Error fetching property:', fetchError);
      logSecurityEvent('DATABASE_ERROR', { error: fetchError.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to fetch property' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    // Delete the property
    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting property:', deleteError);
      logSecurityEvent('DATABASE_ERROR', { error: deleteError.message, ip: clientIP });
      return NextResponse.json(
        { error: 'Failed to delete property' },
        { status: 500, headers: createSecurityHeaders() }
      );
    }

    logSecurityEvent('PROPERTY_DELETED', { propertyId: id, propertyTitle: property.title, ip: clientIP });

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully'
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in DELETE /api/properties/[id]:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: `/api/properties/${id}`,
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