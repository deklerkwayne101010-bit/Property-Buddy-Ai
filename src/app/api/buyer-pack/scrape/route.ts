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
  let url = '';

  try {
    const body = await request.json();
    url = body.url;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format - allow both for-sale and to-rent
    if (!url.includes('property24.com') || (!url.includes('for-sale') && !url.includes('to-rent'))) {
      console.error('Invalid URL format rejected:', url);
      return NextResponse.json(
        { error: 'Invalid URL format. Only Property24 for-sale and to-rent URLs are supported.' },
        { status: 400 }
      );
    }

    // Additional validation to prevent scraping non-property URLs
    if (url.includes('supabase.co') || url.includes('seeklogo') || url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg')) {
      console.error('Image URL rejected:', url);
      return NextResponse.json(
        { error: 'Invalid URL format. Only Property24 property listing URLs are supported.' },
        { status: 400 }
      );
    }

    console.log('Starting AI-powered property data extraction for:', url);

    // Rotate user agents to avoid detection
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    // Add realistic headers to avoid detection
    const headers = {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,af;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    // Add a random delay to simulate human behavior (2-5 seconds)
    const delay = Math.random() * 3000 + 2000; // 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    console.log(`Fetching with User-Agent: ${randomUserAgent.substring(0, 50)}...`);

    // Fetch the webpage content with retry logic
    let response: Response | undefined;
    const retries = 3;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        response = await fetch(url, {
          headers,
          // Add timeout
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        // If we get a 503, wait longer and retry
        if (response.status === 503 && attempt < retries) {
          console.log(`Attempt ${attempt} failed with 503, retrying in ${attempt * 5} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 5000));
          continue;
        }

        break; // Success or non-503 error

      } catch (fetchError) {
        if (attempt === retries) {
          throw fetchError;
        }
        console.log(`Attempt ${attempt} failed, retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Failed to fetch property page: ${response?.status || 'unknown'}`);
    }

    const html = await response.text();

    // Use Replicate to extract property data from HTML
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiKey) {
      console.warn('Replicate API token not found, falling back to mock data');
      return getMockData();
    }

    const extractedData = await extractPropertyDataWithReplicate(html);

    console.log('Successfully extracted property data with Replicate AI');

    return NextResponse.json(extractedData);

  } catch (error) {
    console.error('Error in property data extraction:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      url: url,
      timestamp: new Date().toISOString()
    });

    // Return fallback data with error indication
    const mockData: ScrapedPropertyData = {
      title: `Failed to scrape: ${url.split('/').pop() || 'Property'}`,
      price: "Price not available",
      address: url,
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
      size: "Size not available",
      description: `Unable to automatically extract data from this Property24 listing. Error: ${error instanceof Error ? error.message : 'Unknown error'}. You can manually edit this information in the buyer pack.`,
      images: []
    };

    return NextResponse.json(mockData);
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
async function extractPropertyDataWithReplicate(html: string): Promise<ScrapedPropertyData> {
  const replicateApiKey = process.env.REPLICATE_API_TOKEN;

  if (!replicateApiKey) {
    throw new Error('Replicate API token not configured');
  }

  // Prepare the prompt for Replicate
  const prompt = `You are a web scraping expert specializing in Property24.com. Extract property information from the following Property24 HTML content and return it as a JSON object with these exact fields:

{
  "title": "Property title",
  "price": "Price (e.g., R 2,500,000)",
  "address": "Property address (if available, otherwise leave empty)",
  "bedrooms": number (0 if not found),
  "bathrooms": number (0 if not found),
  "parking": number (0 if not found),
  "size": "Size in m² or sqm (empty string if not found)",
  "description": "SHORT property description (max 5-8 lines, summarize the key features concisely)",
  "images": ["array", "of", "image", "URLs", "max", "10"]
}

EXTRACTION INSTRUCTIONS:
1. TITLE: Look for the main property title, usually in h1, h2, or title tags
2. PRICE: Find the asking price, often in elements with "price", "amount", or "cost" in class/id
3. ADDRESS: Look for location/address information, may be in address tags or specific location divs
4. BEDROOMS: Search for bedroom count, often shown as "X bedroom" or "X bed"
5. BATHROOMS: Search for bathroom count, often shown as "X bathroom" or "X bath"
6. PARKING: Search for parking spaces, often shown as "X parking" or "garage"
7. SIZE: Look for area/size in square meters, often shown as "X m²" or "X sqm"
8. DESCRIPTION: Find the main property description and SUMMARIZE it to be SHORT AND SWEET (maximum 5-8 lines). Focus on key features, highlights, and selling points. Remove redundant information and make it concise for buyer packs.
9. IMAGES: Extract image URLs from img src attributes, prefer high-quality images

IMPORTANT RULES:
- Extract data from the actual HTML content provided
- Look for structured data, meta tags, and JSON-LD first
- Then search for specific CSS classes and IDs commonly used on Property24
- Return valid JSON only, no additional text or explanations
- If a field is not found, use appropriate default values (0 for numbers, empty string for text, empty array for images)
- Make sure numbers are actual numbers, not strings
- DESCRIPTION must be CONCISE - summarize long descriptions into 5-8 lines maximum
- Limit images array to maximum 10 URLs
- Ensure all image URLs are complete and valid

HTML Content:
${html}`;

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
    console.log('Replicate API response:', JSON.stringify(data, null, 2));

    // Handle different response formats from Replicate
    let content;
    if (data.output) {
      if (Array.isArray(data.output)) {
        // Join all array elements and clean up markdown formatting
        content = data.output.join('').replace(/```\w*\n?/g, '').trim();
      } else if (typeof data.output === 'string') {
        content = data.output.replace(/```\w*\n?/g, '').trim();
      } else {
        content = String(data.output).replace(/```\w*\n?/g, '').trim();
      }
    } else if (data.text) {
      // Some models return 'text' instead of 'output'
      content = data.text.replace(/```\w*\n?/g, '').trim();
    } else {
      console.error('Unexpected Replicate response format:', data);
      throw new Error('Unexpected response format from Replicate API');
    }

    if (!content || content.length === 0) {
      throw new Error('No content received from Replicate');
    }

    console.log('Extracted content from Replicate:', content);

    // Parse the JSON response
    let extractedData;
    try {
      // Try to parse as JSON first
      if (typeof content === 'string') {
        extractedData = JSON.parse(content.trim());
      } else {
        extractedData = content;
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse JSON response from Replicate');
    }

    // Validate and clean the extracted data
    if (extractedData && typeof extractedData === 'object') {
      // Ensure numeric fields are numbers
      extractedData.bedrooms = typeof extractedData.bedrooms === 'number' ? extractedData.bedrooms : parseInt(extractedData.bedrooms) || 0;
      extractedData.bathrooms = typeof extractedData.bathrooms === 'number' ? extractedData.bathrooms : parseInt(extractedData.bathrooms) || 0;
      extractedData.parking = typeof extractedData.parking === 'number' ? extractedData.parking : parseInt(extractedData.parking) || 0;

      // Filter and validate image URLs
      if (Array.isArray(extractedData.images)) {
        extractedData.images = extractedData.images
          .filter((img: unknown) => typeof img === 'string' && img.trim().length > 0)
          .filter((img: string) => {
            try {
              const url = new URL(img.startsWith('//') ? 'https:' + img : img);
              return url.protocol === 'http:' || url.protocol === 'https:';
            } catch {
              return false;
            }
          })
          .map((img: string) => img.startsWith('//') ? 'https:' + img : img)
          .slice(0, 10); // Limit to 10 images
      } else {
        extractedData.images = [];
      }

      // Ensure string fields are strings
      extractedData.title = typeof extractedData.title === 'string' ? extractedData.title.trim() : '';
      extractedData.price = typeof extractedData.price === 'string' ? extractedData.price.trim() : '';
      extractedData.address = typeof extractedData.address === 'string' ? extractedData.address.trim() : '';
      extractedData.size = typeof extractedData.size === 'string' ? extractedData.size.trim() : '';
      extractedData.description = typeof extractedData.description === 'string' ? extractedData.description.trim() : '';
    }

    console.log('Successfully extracted and validated property data with Replicate AI');

    return extractedData;

  } catch (error) {
    console.error('Error extracting data with Replicate:', error);
    throw error;
  }
}