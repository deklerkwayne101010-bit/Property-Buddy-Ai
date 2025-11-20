import { NextRequest, NextResponse } from 'next/server';

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

    console.log('Starting AI-powered property data extraction for:', url);

    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch property page: ${response.status}`);
    }

    const html = await response.text();

    // Use Replicate to extract property data from HTML
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiKey) {
      console.warn('Replicate API token not found, falling back to mock data');
      return getMockData();
    }

    const extractedData = await extractPropertyDataWithReplicate(html, url);

    console.log('Successfully extracted property data with Replicate AI');

    return NextResponse.json(extractedData);

  } catch (error) {
    console.error('Error in property data extraction:', error);

    // Return fallback data if extraction fails
    return getMockData();
  }
}

// Helper function to get mock data as fallback
function getMockData(): NextResponse {
  const mockData: ScrapedPropertyData = {
    title: "Beautiful Modern Home",
    price: "R 3,500,000",
    address: "123 Example Street, Suburb, City",
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    size: "250 m²",
    description: "This stunning modern home offers spacious living areas, contemporary finishes, and a prime location. Features include an open-plan kitchen and dining area, three comfortable bedrooms, two full bathrooms, and secure parking for two vehicles. The property is situated in a quiet neighborhood with easy access to schools, shopping centers, and major highways.",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
      "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
    ]
  };

  return NextResponse.json(mockData);
}

// Function to extract property data using Replicate GPT-4o mini
async function extractPropertyDataWithReplicate(html: string, url: string): Promise<ScrapedPropertyData> {
  const replicateApiKey = process.env.REPLICATE_API_TOKEN;

  if (!replicateApiKey) {
    throw new Error('Replicate API token not configured');
  }

  // Prepare the prompt for Replicate
  const prompt = `You are a web scraping expert. Extract property information from the following Property24 HTML content and return it as a JSON object with these exact fields:

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
${html.substring(0, 8000)}`;

  try {
    const response = await fetch('https://api.replicate.com/v1/models/openai/gpt-4o-mini/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateApiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          system_prompt: 'You are a precise web scraper that extracts property data from HTML and returns clean JSON. Always return valid JSON only.',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.output;

    if (!content) {
      throw new Error('No content received from Replicate');
    }

    // Parse the JSON response
    const extractedData = JSON.parse(content.trim());

    // Validate and sanitize the extracted data
    return {
      title: extractedData.title || 'Property Title Not Found',
      price: extractedData.price || 'POA',
      address: extractedData.address || 'Address not available',
      bedrooms: typeof extractedData.bedrooms === 'number' ? extractedData.bedrooms : 0,
      bathrooms: typeof extractedData.bathrooms === 'number' ? extractedData.bathrooms : 0,
      parking: typeof extractedData.parking === 'number' ? extractedData.parking : 0,
      size: extractedData.size || 'Size not specified',
      description: extractedData.description || 'Description not available',
      images: Array.isArray(extractedData.images) ? extractedData.images.filter((img: any) => typeof img === 'string' && img.startsWith('http')).slice(0, 10) : []
    };

  } catch (error) {
    console.error('Error extracting data with Replicate:', error);
    throw error;
  }
}