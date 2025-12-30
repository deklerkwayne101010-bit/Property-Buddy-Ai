import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent,
  filterContent
} from '../../../lib/security';
// AI Chat is free with active subscription - no credit deduction needed

// Rate limiting: 20 requests per minute per IP for chat
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 20,
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Property {
  id: string;
  address: string;
  price: number;
  type: string;
  status: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  context?: {
    userProperties?: Property[];
    recentActivity?: Activity[];
  };
}

async function callReplicateChatAPI(prompt: string, history: ChatMessage[] = []): Promise<string> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    // Fallback response when API is not configured
    return "I'm sorry, but the AI chat service is currently unavailable. Please try again later or contact support for assistance with your real estate questions.";
  }

  // Build conversation context
  let fullPrompt = `You are a specialized AI assistant for South African real estate agents. You have deep expertise in South African property law, real estate regulations, market trends, and property management practices.

Guidelines:
- Focus exclusively on South African real estate, property law, and related topics
- Provide detailed, comprehensive responses with practical South African context
- Reference relevant South African legislation (e.g., Consumer Protection Act, Estate Agency Affairs Act, Alienation of Land Act)
- Include current South African market data, trends, and pricing information
- Cover property types common in South Africa (residential, commercial, agricultural, sectional title)
- Address South African-specific concerns (rates, taxes, municipal bylaws, estate agent regulations)
- Be professional, knowledgeable, and provide actionable advice
- Use South African real estate terminology and practices
- If asked about non-South African real estate topics, redirect to South African context

`;

  // Add conversation history
  if (history.length > 0) {
    fullPrompt += "\nPrevious conversation:\n";
    history.slice(-5).forEach(msg => { // Keep last 5 messages for context
      fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    fullPrompt += "\n";
  }

  fullPrompt += `Current user question: ${prompt}

Assistant:`;

  const response = await fetch('https://api.replicate.com/v1/models/meta/meta-llama-3-8b-instruct/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt: fullPrompt,
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
  }

  const prediction = await response.json();

  // Poll for completion
  let result;
  while (true) {
    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
      },
    });

    result = await statusResponse.json();

    if (result.status === 'succeeded') {
      return result.output.join(''); // Join array of text chunks
    } else if (result.status === 'failed') {
      throw new Error(`Replicate chat failed: ${result.error}`);
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks

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

    // Check request size
    if (!validateRequestSize(request)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { ip: clientIP });
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413, headers: createSecurityHeaders() }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [], context } = body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate message length (max 5000 characters for detailed South African real estate queries)
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message too long (maximum 5000 characters)' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Check user subscription tier for feature access
    // Note: This assumes we have user authentication context
    // In a real implementation, you'd get the user ID from the session
    // For now, we'll allow access but this should be restricted based on subscription

    // Validate conversation history
    if (conversationHistory && !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'Conversation history must be an array' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Generate AI response
    const aiResponse = await callReplicateChatAPI(message, conversationHistory);

    // Filter content for inappropriate material
    const filtered = filterContent(aiResponse);

    // Log if content was flagged
    if (filtered.flagged) {
      logSecurityEvent('CONTENT_FLAGGED', {
        endpoint: '/api/chat',
        reasons: filtered.reasons,
        ip: clientIP
      });
    }

    const responseMessage: ChatMessage = {
      role: 'assistant',
      content: filtered.filtered,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: responseMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        filtered: filtered.flagged
      }
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in chat API:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/chat',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}