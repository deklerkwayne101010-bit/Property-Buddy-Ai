import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

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
  let browser;

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!url.includes('property24.com') || (!url.includes('for-sale') && !url.includes('to-rent'))) {
      return NextResponse.json(
        { error: 'Invalid Property24 URL. Please provide a valid property listing URL.' },
        { status: 400 }
      );
    }

    console.log('Starting Property24 scraping for:', url);

    // Launch Puppeteer with serverless-friendly options for Vercel
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      timeout: 60000,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();

    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Navigate to the property page
    console.log('Navigating to property page...');
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract property data using page evaluation
    const propertyData = await page.evaluate(() => {
      const data: ScrapedPropertyData = {
        title: '',
        price: '',
        address: '',
        bedrooms: 0,
        bathrooms: 0,
        parking: 0,
        size: '',
        description: '',
        images: []
      };

      try {
        // Extract title
        const titleElement = document.querySelector('h1[data-cy="listing-title"], .listing-title, .property-title');
        data.title = titleElement?.textContent?.trim() || 'Property Title Not Found';

        // Extract price
        const priceElement = document.querySelector('[data-cy="listing-price"], .listing-price, .property-price, .price');
        const priceText = priceElement?.textContent?.trim() || '';
        // Clean up price (remove R, spaces, commas)
        data.price = priceText.replace(/[R\s,]/g, '').replace(/POA|Price on Application/i, 'POA');

        // Address is not available on Property24 - provide default message
        data.address = 'Address available upon request - please contact agent for details';

        // Extract property features
        const featureElements = document.querySelectorAll('[data-cy="listing-feature"], .listing-feature, .property-feature, .feature');

        featureElements.forEach(feature => {
          const text = feature.textContent?.toLowerCase() || '';
          const value = parseInt(text.replace(/\D/g, '')) || 0;

          if (text.includes('bedroom') || text.includes('bed')) {
            data.bedrooms = value;
          } else if (text.includes('bathroom') || text.includes('bath')) {
            data.bathrooms = value;
          } else if (text.includes('parking') || text.includes('garage')) {
            data.parking = value;
          } else if (text.includes('m²') || text.includes('sqm') || text.includes('size')) {
            data.size = text.replace(/size/i, '').trim();
          }
        });

        // Extract description
        const descElement = document.querySelector('[data-cy="listing-description"], .listing-description, .property-description, .description');
        data.description = descElement?.textContent?.trim() || 'Description not available';

        // Extract images
        const imageElements = document.querySelectorAll('[data-cy="listing-image"], .listing-image img, .property-image img, .gallery img');
        const images: string[] = [];

        imageElements.forEach(img => {
          const src = (img as HTMLImageElement).src;
          if (src && src.startsWith('http') && !src.includes('placeholder') && !src.includes('no-image')) {
            images.push(src);
          }
        });

        // If no images found, try alternative selectors
        if (images.length === 0) {
          const altImages = document.querySelectorAll('img[src*="property24"], img[src*="property-images"]');
          altImages.forEach(img => {
            const src = (img as HTMLImageElement).src;
            if (src && src.startsWith('http')) {
              images.push(src);
            }
          });
        }

        data.images = images.slice(0, 10); // Limit to 10 images

        // Fallback values if nothing was found
        if (!data.title || data.title === 'Property Title Not Found') {
          const fallbackTitle = document.querySelector('title')?.textContent?.split('|')[0]?.trim();
          data.title = fallbackTitle || 'Property Listing';
        }

        if (!data.price) {
          data.price = 'POA';
        }

      } catch (error) {
        console.error('Error extracting data from page:', error);
      }

      return data;
    });

    console.log('Scraped data:', propertyData);

    return NextResponse.json(propertyData);

  } catch (error) {
    console.error('Error scraping property:', error);

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

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}