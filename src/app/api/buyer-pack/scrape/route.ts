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

interface ScrapingJob {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: ScrapedPropertyData;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory job storage (in production, use Redis or database)
const scrapingJobs = new Map<string, ScrapingJob>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url;

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

    // Create a unique job ID
    const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job record
    const job: ScrapingJob = {
      id: jobId,
      url,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    scrapingJobs.set(jobId, job);

    console.log(`Created scraping job ${jobId} for URL: ${url}`);

    // Start processing asynchronously (don't await)
    processScrapingJob(jobId);

    // Return job ID immediately
    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Scraping job started. Check status using the job ID.'
    });

  } catch (error) {
    console.error('Error creating scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to start scraping job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      );
    }

    const job = scrapingJobs.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      data: job.data,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });

  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    );
  }
}

// Async function to process scraping job
async function processScrapingJob(jobId: string) {
  const job = scrapingJobs.get(jobId);
  if (!job) return;

  try {
    // Update status to processing
    job.status = 'processing';
    job.updatedAt = new Date();

    console.log('Starting AI-powered property data extraction for:', job.url);

    // Advanced anti-detection system
    console.log('🔒 Initializing advanced anti-detection system...');

    // Simulate human-like browsing session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📋 Session ID: ${sessionId}`);

    // Create realistic browser fingerprints
    const browserConfigs = [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Windows NT 10.0; Win64; x64',
        secChUa: '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="99"',
        viewport: '1920x1080'
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Macintosh; Intel Mac OS X 10_15_7',
        secChUa: '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="99"',
        viewport: '1440x900'
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/121.0',
        platform: 'Windows NT 10.0; Win64; x64; rv:120.0',
        secChUa: '"Not-A.Brand";v="99"',
        viewport: '1366x768'
      }
    ];

    const selectedBrowser = browserConfigs[Math.floor(Math.random() * browserConfigs.length)];
    console.log(`🎭 Selected browser fingerprint: ${selectedBrowser.userAgent.substring(0, 50)}...`);

    // Simulate realistic browsing behavior with multiple phases
    console.log('🚶 Simulating human browsing behavior...');

    // Phase 1: Initial page load simulation (2-4 seconds)
    const initialDelay = Math.random() * 2000 + 2000;
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    // Phase 2: Simulate reading time (3-6 seconds)
    const readingDelay = Math.random() * 3000 + 3000;
    await new Promise(resolve => setTimeout(resolve, readingDelay));

    // Phase 3: Simulate scrolling and interaction (1-3 seconds)
    const interactionDelay = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, interactionDelay));

    // Phase 4: Final delay before actual request (5-10 seconds)
    const finalDelay = Math.random() * 5000 + 5000;
    console.log(`⏳ Final preparation delay: ${Math.round(finalDelay/1000)} seconds...`);
    await new Promise(resolve => setTimeout(resolve, finalDelay));

    // Create sophisticated headers that mimic real browser behavior
    const headers = {
      'User-Agent': selectedBrowser.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-ZA,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,af;q=0.6',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.google.co.za/',
      'sec-ch-ua': selectedBrowser.secChUa,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': `"${selectedBrowser.platform.split(';')[0]}"`,
      'Sec-Purpose': 'prefetch',
      'X-Requested-With': 'XMLHttpRequest'
    };

    console.log(`🌐 Making request with sophisticated headers...`);

    // Advanced retry logic with different strategies
    let html: string | null = null;
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxAttempts} - ${new Date().toISOString()}`);

        // Create headers object with attempt-specific variations
        const attemptHeaders: Record<string, string> = { ...headers };
        if (attempt > 1) {
          attemptHeaders['Cache-Control'] = 'no-cache';
          attemptHeaders['Pragma'] = 'no-cache';
        }

        const response = await fetch(job.url, {
          method: 'GET',
          headers: attemptHeaders,
          signal: AbortSignal.timeout(45000), // 45 second timeout
        });

        console.log(`📊 Response status: ${response.status} (${response.statusText})`);

        // Handle different response codes
        if (response.status === 200) {
          html = await response.text();
          console.log(`✅ Successfully fetched HTML (${html.length} characters)`);
          break;
        } else if (response.status === 503) {
          console.log(`🚫 Got 503 Service Unavailable - anti-bot detected`);

          // For 503, use exponential backoff with jitter
          const baseDelay = Math.pow(2, attempt) * 10000; // 20s, 40s, 80s...
          const jitter = Math.random() * 5000; // Add randomness
          const totalDelay = baseDelay + jitter;

          if (attempt < maxAttempts) {
            console.log(`⏳ Waiting ${Math.round(totalDelay/1000)}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, totalDelay));
          }
        } else if (response.status === 429) {
          console.log(`🚫 Got 429 Too Many Requests - rate limited`);

          // For 429, wait longer
          const rateLimitDelay = (attempt * 15000) + Math.random() * 5000;
          if (attempt < maxAttempts) {
            console.log(`⏳ Rate limit delay: ${Math.round(rateLimitDelay/1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
          }
        } else if (response.status >= 400 && response.status < 500) {
          // Client errors - don't retry
          console.log(`❌ Client error ${response.status} - not retrying`);
          break;
        } else {
          // Other server errors - retry with shorter delay
          const retryDelay = attempt * 3000 + Math.random() * 2000;
          if (attempt < maxAttempts) {
            console.log(`⏳ Server error delay: ${Math.round(retryDelay/1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

      } catch (error) {
        console.error(`💥 Attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error');

        if (attempt === maxAttempts) {
          throw new Error(`All ${maxAttempts} attempts failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Wait before retrying
        const errorDelay = attempt * 2000 + Math.random() * 3000;
        console.log(`⏳ Error recovery delay: ${Math.round(errorDelay/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, errorDelay));
      }
    }

    if (!html) {
      throw new Error('Failed to fetch HTML content after all retry attempts');
    }

    console.log('🎉 Successfully bypassed anti-detection measures!');

    // Use Replicate to extract property data from HTML
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiKey) {
      console.warn('Replicate API token not found, falling back to mock data. Please add REPLICATE_API_TOKEN to your .env.local file.');
      console.warn('Get your API token from: https://replicate.com/account/api-tokens');

      // Update job with mock data
      job.status = 'completed';
      job.data = getMockScrapedData();
      job.updatedAt = new Date();
      return;
    }

    console.log('Replicate API token found, proceeding with AI extraction...');

    const extractedData = await extractPropertyDataWithReplicate(html);

    console.log('Successfully extracted property data with Replicate AI');

    // Update job with success
    job.status = 'completed';
    job.data = extractedData;
    job.updatedAt = new Date();

  } catch (error) {
    console.error('Error in property data extraction:', error);

    // Update job with error
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.updatedAt = new Date();

    // Return fallback data with error indication
    const mockData: ScrapedPropertyData = {
      title: `Failed to scrape: ${job.url.split('/').pop() || 'Property'}`,
      price: "Price not available",
      address: job.url,
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
      size: "Size not available",
      description: `Unable to automatically extract data from this Property24 listing. Error: ${error instanceof Error ? error.message : 'Unknown error'}. You can manually edit this information in the buyer pack.`,
      images: []
    };

    job.data = mockData;
  }
}

// Helper function to get mock data as fallback
function getMockData(): NextResponse {
  const mockData: ScrapedPropertyData = getMockScrapedData();
  return NextResponse.json(mockData);
}

// Helper function to get mock scraped data object
function getMockScrapedData(): ScrapedPropertyData {
  return {
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