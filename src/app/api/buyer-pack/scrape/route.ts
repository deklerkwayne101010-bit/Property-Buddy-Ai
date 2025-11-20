import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

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

    // Validate URL format - allow both for-sale and to-rent
    if (!url.includes('property24.com') || (!url.includes('for-sale') && !url.includes('to-rent'))) {
      return NextResponse.json(
        { error: 'Invalid URL format. Only Property24 for-sale and to-rent URLs are supported.' },
        { status: 400 }
      );
    }

    console.log('Starting Property24 scraping with Playwright for:', url);

    // Launch Playwright browser
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Set longer timeout for navigation
    page.setDefaultTimeout(30000);

    // Navigate to the property page
    console.log('Navigating to property page...');
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Extract property data
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

      // Extract title - try multiple selectors
      const titleSelectors = [
        'h1.sc_listingPageTitle',
        'h1[data-cy="listing-title"]',
        'h1.p24_listingTitle',
        'h1'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          data.title = element.textContent.trim();
          break;
        }
      }

      // Extract price - try multiple selectors
      const priceSelectors = [
        '[data-cy="listing-price"]',
        '.sc_listingPagePrice',
        '.p24_price',
        '.listing-price',
        '[class*="price"]'
      ];

      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          data.price = element.textContent.trim();
          break;
        }
      }

      // Extract property features - look for bedroom, bathroom, parking info
      const featureSelectors = [
        '[data-cy="listing-feature"]',
        '.sc_listingPageFeature',
        '.p24_feature',
        '.property-feature',
        '.feature-item'
      ];

      featureSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(feature => {
          const text = feature.textContent?.trim() || '';
          if (text.includes('Bedroom') || text.includes('bedroom')) {
            const match = text.match(/(\d+)/);
            if (match) data.bedrooms = parseInt(match[1]) || 0;
          } else if (text.includes('Bathroom') || text.includes('bathroom')) {
            const match = text.match(/(\d+)/);
            if (match) data.bathrooms = parseInt(match[1]) || 0;
          } else if (text.includes('Parking') || text.includes('parking')) {
            const match = text.match(/(\d+)/);
            if (match) data.parking = parseInt(match[1]) || 0;
          } else if (text.includes('m²') || text.includes('sqm') || text.includes('size')) {
            data.size = text;
          }
        });
      });

      // Extract description - try multiple selectors
      const descriptionSelectors = [
        '[data-cy="listing-description"]',
        '.sc_listingPageDescription',
        '.p24_description',
        '.listing-description',
        '[class*="description"]'
      ];

      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          data.description = element.textContent.trim();
          break;
        }
      }

      // Extract images - try multiple selectors
      const imageSelectors = [
        '[data-cy="listing-image"] img',
        '.sc_listingPageImage img',
        '.p24_image img',
        '.listing-image img',
        '.gallery img',
        'img[data-src]'
      ];

      imageSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          if (src && src.startsWith('http') && !data.images.includes(src)) {
            data.images.push(src);
          }
        });
      });

      // Limit images to first 10 to avoid too much data
      data.images = data.images.slice(0, 10);

      return data;
    });

    await browser.close();

    console.log('Scraped data:', propertyData);

    // Validate extracted data
    if (!propertyData.title || !propertyData.price) {
      return NextResponse.json(
        { error: 'Failed to extract property data. The page structure may have changed or the URL may be invalid.' },
        { status: 422 }
      );
    }

    return NextResponse.json(propertyData);

  } catch (error) {
    console.error('Error scraping property:', error);
    if (browser) {
      await browser.close();
    }

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