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
Your task is to generate a TOTALLY DIFFERENT, highly creative template blueprint every time.
You MUST avoid repeating previous structures, styles, shapes, or layouts.

🎲 STEP 1 — RANDOM MODE SELECTION

Roll a virtual die (you decide the result).
Then choose the corresponding mode:

Diagonal Extreme Layout

Ultra-Minimal Luxury Layout

Bold Geometric Shapes Layout

Collage, Scrapbook, Cutout Layout

Architectural Blueprint Layout

Quirky Unusual Concept Layout (ex: asymmetrical, abstract, experimental)

Whichever mode is selected, commit to it fully.

🎨 STEP 2 — APPLY A RANDOM ART DIRECTION

Choose ONE at random and base the entire design on it:

Bauhaus

Swiss Design

Futuristic Neon

Magazine Editorial

Retro 80s

Propaganda Poster

Clean Corporate

Luxury with thin-line gold accents

Ultra loud social media hype style

Floating card layout

Rounded bubble layout

Tech dashboard layout

NEVER repeat the same one twice in a row.

🔥 STEP 3 — RANDOM REMAX COLOR RULE

Choose one at random:

Dominant red, subtle blue

Dominant blue, minimal red

Balanced red + blue

Mostly white with micro red accents

Mostly white with micro blue accents

2-tone diagonal split red/blue

White with red blocks and blue outlines

📐 STEP 4 — RANDOM LAYOUT MECHANICS

Create a layout containing these elements BUT place them in a completely new configuration every time:

Large main property image

2–4 small supporting images (arranged in a NEW pattern each time)

Space for property description

Space for key features

Price block

Bedrooms / Bathrooms / Garages icons

Agent photo

Agent name & contact section

REMAX logo space

You must RANDOMIZE placements using one of these systems (choose a different one each time):

Grid

Diagonal slice

Floating frames

Overlapping layers

Circular frames

Melted warped shapes

Split-screen layouts

Clean block layout

Vertical rhythm layout

Angled ribbon layout

✨ STEP 5 — ADD A "TWIST"

Choose ONE random twist:

Subtle balloon outline woven into the background

A thick diagonal color bar

A curved wave splitting the canvas

Floating rounded cards

A micro-dot pattern

Transparent blocks overlaying images

A dramatic shadow effect

A thin-lined technical blueprint vibe

📦 STEP 6 — OUTPUT FORMAT

Return ONLY the following:

1. Mode Chosen:
2. Art Direction Chosen:
3. Color Rule:
4. Layout Structure: (Describe EXACT positions)
5. Creative Twist:
6. Final Render Description:
A single paragraph describing EXACTLY what the image generator must create, focusing ONLY on shapes, spaces, arrangement, composition, and color usage.
Do NOT include any actual text like "Bedrooms" or "Price."
Do NOT repeat past layout patterns.
Always produce something radically different.`;

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
          prompt: wackyPrompt,
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
      templateType: 'wacky'
    });

  } catch (error) {
    console.error('Error in template generation:', error);
    return NextResponse.json(
      { error: 'Template generation failed. Please try again.' },
      { status: 500 }
    );
  }
}