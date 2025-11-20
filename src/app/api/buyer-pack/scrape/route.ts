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

    // Use OpenAI to extract property data from HTML
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn('OpenAI API key not found, falling back to mock data');
      return getMockData();
    }

    const extractedData = await extractPropertyDataWithAI(html, url);

    console.log('Successfully extracted property data with AI');

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

// Function to extract property data using OpenAI
async function extractPropertyDataWithAI(html: string, url: string): Promise<ScrapedPropertyData> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Prepare the prompt for OpenAI
  const prompt = `
You are an expert at extracting property information from Property24.com HTML pages. Analyze the following HTML content and extract the key property details.

URL: ${url}

HTML Content (first 8000 characters):
${html.substring(0, 8000)}

Please extract the following information in JSON format:
- title: The property title/headline
- price: The property price (include currency symbol)
- address: The property address/location
- bedrooms: Number of bedrooms (as integer)
- bathrooms: Number of bathrooms (as integer)
- parking: Number of parking spaces (as integer)
- size: Property size with unit (e.g., "250 m²")
- description: A detailed property description (combine all description text)
- images: Array of image URLs (extract from img src attributes, prefer high quality images)

Return ONLY valid JSON with these exact field names. If a field is not found, use appropriate defaults:
- bedrooms/bathrooms/parking: 0 if not found
- size: "Size not specified" if not found
- description: "Description not available" if not found
- images: [] if no images found

Make sure the JSON is properly formatted and parseable.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a property data extraction expert. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
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
      images: Array.isArray(extractedData.images) ? extractedData.images.filter((img: any) => typeof img === 'string' && img.startsWith('http')) : []
    };

  } catch (error) {
    console.error('Error extracting data with AI:', error);
    throw error;
  }
}