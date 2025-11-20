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

    console.log('Starting property data extraction for:', url);

    // For now, return mock data since AI scraping is not available
    // This allows the Buyer Pack Maker to function while showing realistic data
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

    console.log('Returning mock property data for demonstration');

    return NextResponse.json(mockData);

  } catch (error) {
    console.error('Error in property data extraction:', error);

    // Return fallback data if extraction fails
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