import { NextRequest } from 'next/server';

// Security utilities for API endpoints

export interface SecurityConfig {
  maxRequestSize: number; // in bytes
  allowedOrigins: string[];
  rateLimitWindow: number; // in milliseconds
  rateLimitMax: number;
}

export const defaultSecurityConfig: SecurityConfig = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'], // Update with actual domains
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 10, // requests per window
};

// Enhanced rate limiting with different tiers
export const rateLimitTiers = {
  standard: { window: 60 * 1000, max: 10 }, // 10 per minute
  bulk: { window: 60 * 1000, max: 5 }, // 5 per minute for bulk operations
  premium: { window: 60 * 1000, max: 50 }, // 50 per minute for premium users
};

// Simple in-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  clientIP: string,
  config: SecurityConfig = defaultSecurityConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit_${clientIP}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.rateLimitWindow
    });
    return { allowed: true, remaining: config.rateLimitMax - 1, resetTime: now + config.rateLimitWindow };
  }

  if (record.count >= config.rateLimitMax) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: config.rateLimitMax - record.count, resetTime: record.resetTime };
}

export function validateRequestSize(request: NextRequest, maxSize: number = defaultSecurityConfig.maxRequestSize): boolean {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSize) {
    return false;
  }
  return true;
}

export function sanitizeInput(input: string): string {
  // Basic input sanitization
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

export function filterContent(content: string): { filtered: string; flagged: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check for inappropriate content patterns
  const inappropriatePatterns = [
    /\b(hate|racist|sexist|homophobic|transphobic)\b/gi,
    /\b(violence|violent|kill|murder|assault)\b/gi,
    /\b(drug|drugs|cocaine|heroin|meth)\b/gi,
    /\b(porn|pornography|explicit|nsfw)\b/gi,
    /\b(scam|fraud|illegal|criminal)\b/gi,
    /\b(discrimination|harassment|abuse)\b/gi
  ];

  // Check for excessive caps (potential shouting/spam)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 20) {
    reasons.push('Excessive use of capital letters');
  }

  // Check for repetitive patterns (potential spam)
  const words = content.toLowerCase().split(/\s+/);
  const wordCounts = words.reduce((acc, word) => {
    if (word.length > 3) { // Only count meaningful words
      acc[word] = (acc[word] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const maxRepetition = Math.max(...Object.values(wordCounts));
  if (maxRepetition > 5) {
    reasons.push('Excessive word repetition');
  }

  // Check for inappropriate content
  inappropriatePatterns.forEach(pattern => {
    if (pattern.test(content)) {
      reasons.push(`Contains potentially inappropriate content: ${pattern.source}`);
    }
  });

  // Check for suspicious URLs or contact info
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phonePattern = /(\+?[\d\s\-\(\)]{10,})/g;

  if (urlPattern.test(content)) {
    reasons.push('Contains URLs which may be promotional');
  }

  if (emailPattern.test(content)) {
    reasons.push('Contains email addresses');
  }

  if (phonePattern.test(content)) {
    reasons.push('Contains phone numbers');
  }

  let filtered = content;

  // If flagged, add warning prefix
  if (reasons.length > 0) {
    filtered = `[CONTENT FLAGGED - ${reasons.join(', ')}]\n\n${content}`;
  }

  return {
    filtered,
    flagged: reasons.length > 0,
    reasons
  };
}

export function validatePropertyData(data: Record<string, unknown>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Enhanced validation with security checks
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

  if (!data.price || typeof data.price !== 'string' || data.price.trim().length === 0) {
    errors.push('Price is required');
  } else if (data.price.length > 50) {
    errors.push('Price must be less than 50 characters');
  } else if (!/^[0-9\s,.]+$/.test(data.price)) {
    errors.push('Price must contain only numbers, spaces, commas, and periods');
  }

  if (!data.suburb || typeof data.suburb !== 'string' || data.suburb.trim().length === 0) {
    errors.push('Suburb is required');
  }

  if (!data.city || typeof data.city !== 'string' || data.city.trim().length === 0) {
    errors.push('City is required');
  }

  if (!data.beds || typeof data.beds !== 'string' || data.beds.trim().length === 0) {
    errors.push('Number of bedrooms is required');
  } else if (!/^[0-9]+$/.test(data.beds) || parseInt(data.beds) < 0 || parseInt(data.beds) > 50) {
    errors.push('Bedrooms must be a valid number between 0 and 50');
  }

  if (!data.baths || typeof data.baths !== 'string' || data.baths.trim().length === 0) {
    errors.push('Number of bathrooms is required');
  } else if (!/^[0-9]+$/.test(data.baths) || parseInt(data.baths) < 0 || parseInt(data.baths) > 50) {
    errors.push('Bathrooms must be a valid number between 0 and 50');
  }

  if (data.garages && typeof data.garages === 'string' && data.garages.trim().length > 0) {
    if (!/^[0-9]+$/.test(data.garages) || parseInt(data.garages) < 0 || parseInt(data.garages) > 20) {
      errors.push('Garages must be a valid number between 0 and 20');
    }
  }

  if (data.shortSummary && typeof data.shortSummary === 'string') {
    if (data.shortSummary.length > 1000) {
      errors.push('Short summary must be less than 1000 characters');
    }
    // Check for potentially harmful content in summary
    if (/javascript:/gi.test(data.shortSummary) || /on\w+\s*=/gi.test(data.shortSummary)) {
      errors.push('Short summary contains potentially harmful content');
    }
  }

  if (data.keyFeatures && Array.isArray(data.keyFeatures)) {
    if (data.keyFeatures.length > 20) {
      errors.push('Maximum 20 key features allowed');
    }
    data.keyFeatures.forEach((feature: string, index: number) => {
      if (typeof feature !== 'string') {
        errors.push(`Key feature ${index + 1} must be a string`);
      } else if (feature.length > 200) {
        errors.push(`Key feature ${index + 1} must be less than 200 characters`);
      } else if (feature.trim().length === 0) {
        errors.push(`Key feature ${index + 1} cannot be empty`);
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('x-client-ip') ||
         'unknown';
}

export function createSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  };
}

export function logSecurityEvent(event: string, details: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY ${timestamp}] ${event}:`, details);
}