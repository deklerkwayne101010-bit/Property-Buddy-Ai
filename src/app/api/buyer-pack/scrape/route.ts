import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

interface ScrapedPropertyData {
  title: string;
  price: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  size: string;
  description: string;
  images: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format - allow both for-sale and to-rent
    if (!url.includes('property24.com') || (!url.includes('for-sale') && !url.includes('to-rent'))) {
      return NextResponse.json(
        { error: 'Invalid URL format. Only Property24 for-sale and to-rent URLs are supported.' },
        { status: 400 }
      );
    }

    console.log('Starting AI-based Property24 scraping for:', url);

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Fetch the HTML content from the URL
    console.log('Fetching HTML content...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const htmlContent = await response.text();
    console.log('HTML content fetched, length:', htmlContent.length);

    // Use GPT-4o mini to extract property data from HTML
    console.log('Processing with AI...');
    const output = await replicate.run(
      "openai/gpt-4o-mini",
      {
        input: {
          prompt: `You are a web scraping expert. Extract property information from the following Property24 HTML content and return it as a JSON object with these exact fields:

{
  "title": "Property title",
  "price": "Price (e.g., R 2,500,000)",
  "address": "Property address (if available, otherwise leave empty)",
  "bedrooms": number (0 if not found),
  "bathrooms": number (0 if not found),
  "parking": number (0 if not found),
  "size": "Size in m² or sqm (empty string if not found)",
  "description": "Property description text",
  "images": ["array", "of", "image", "URLs", "max", "10"]
}

IMPORTANT RULES:
- Extract data from the actual HTML content provided
- Look for property title, price, features (bedrooms, bathrooms, parking), size, description
- Find image URLs from img src attributes
- Return valid JSON only, no additional text
- If a field is not found, use appropriate default values
- Limit images array to maximum 10 URLs
- Make sure numbers are actual numbers, not strings

HTML Content:
${htmlContent.substring(0, 50000)}`, // Limit HTML size to avoid token limits
          max_tokens: 1000,
          temperature: 0.1,
          system_prompt: "You are a precise web scraper that extracts property data from HTML and returns clean JSON. Always return valid JSON only."
        }
      }
    );

    console.log('AI processing complete');

    // Parse the AI response
    let propertyData: ScrapedPropertyData;
    try {
      // Handle different response formats from Replicate
      const responseText = Array.isArray(output) ? output.join('') : String(output);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      propertyData = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the data
      propertyData = {
        title: propertyData.title || 'Property Title Not Found',
        price: propertyData.price || 'POA',
        address: propertyData.address || 'Address not available',
        bedrooms: Number(propertyData.bedrooms) || 0,
        bathrooms: Number(propertyData.bathrooms) || 0,
        parking: Number(propertyData.parking) || 0,
        size: propertyData.size || 'Size not specified',
        description: propertyData.description || 'Description not available',
        images: Array.isArray(propertyData.images) ? propertyData.images.slice(0, 10) : []
      };

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse property data from AI response');
    }

    console.log('Extracted property data:', propertyData);

    // Validate extracted data
    if (!propertyData.title || propertyData.title === 'Property Title Not Found') {
      return NextResponse.json(
        { error: 'Failed to extract property title. The page structure may have changed or the URL may be invalid.' },
        { status: 422 }
      );
    }

    return NextResponse.json(propertyData);

  } catch (error) {
    console.error('Error in AI-based scraping:', error);

    // Return fallback data if scraping fails
    const fallbackData: ScrapedPropertyData = {
      title: "Property Information Unavailable",
      price: "POA",
      address: "Address not found - please check the property listing",
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
      size: "Size not specified",
      description: "Unable to retrieve property description. Please visit the property listing directly for more information.",
      images: []
    };

    return NextResponse.json(fallbackData);
  }
}