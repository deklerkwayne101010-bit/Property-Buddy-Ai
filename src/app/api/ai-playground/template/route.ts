import { NextRequest, NextResponse } from 'next/server';
import { WACKY_TEMPLATE_PROMPT, PROFESSIONAL_TEMPLATE_PROMPT } from '@/lib/template-prompts';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateType, userId } = body;

    if (!templateType || !userId) {
      return NextResponse.json(
        { error: 'Template type and user ID are required' },
        { status: 400 }
      );
    }

    if (!['wacky', 'professional'].includes(templateType)) {
      return NextResponse.json(
        { error: 'Invalid template type. Supported: wacky, professional' },
        { status: 400 }
      );
    }

    // Select the appropriate prompt based on template type
    let aiPrompt: string;

    if (templateType === 'wacky') {
      aiPrompt = WACKY_TEMPLATE_PROMPT;
    } else if (templateType === 'professional') {
      aiPrompt = PROFESSIONAL_TEMPLATE_PROMPT;
    } else {
      throw new Error('Unsupported template type');
    }

    console.log(`Generating ${templateType} template with Replicate AI...`);

    // Call Replicate API with GPT-4o mini
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;

    if (!replicateApiKey) {
      console.warn('Replicate API token not found for template generation');
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    console.log('Generating wacky template with Replicate AI...');

    const response = await fetch('https://api.replicate.com/v1/models/openai/gpt-4o-mini/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateApiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        input: {
          prompt: aiPrompt,
          system_prompt: 'You are a creative art director specializing in unique, never-repeated design concepts. Always generate completely original layouts and compositions.',
          temperature: 0.9, // Higher creativity
          max_tokens: 1000
        }
      })
    });

    if (!response.ok) {
      console.error('Replicate API error:', response.status);
      return NextResponse.json(
        { error: 'Failed to generate template. Please try again.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Replicate API response received');

    // Extract the template from response
    let template = '';
    if (data.output) {
      if (Array.isArray(data.output)) {
        template = data.output.join('').trim();
      } else if (typeof data.output === 'string') {
        template = data.output.trim();
      } else {
        template = String(data.output).trim();
      }
    } else if (data.text) {
      template = data.text.trim();
    }

    if (!template) {
      console.error('No template content received from Replicate');
      return NextResponse.json(
        { error: 'Template generation failed. Please try again.' },
        { status: 500 }
      );
    }

    console.log('Template generated successfully');

    return NextResponse.json({
      template: template,
      templateType: templateType
    });

  } catch (error) {
    console.error('Error in template generation:', error);
    return NextResponse.json(
      { error: 'Template generation failed. Please try again.' },
      { status: 500 }
    );
  }
}