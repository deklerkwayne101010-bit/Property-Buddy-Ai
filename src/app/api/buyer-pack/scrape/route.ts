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

    // For now, return mock data since we can't actually scrape Property24
    // In production, this would use a proper scraping service or headless browser
    const mockData: ScrapedPropertyData = {
      title: "Modern 3-Bedroom House",
      price: "2,850,000",
      address: "123 Oak Street, Sandton, Johannesburg",
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      size: "250 m²",
      description: "Beautiful modern home with open plan living, perfect for families. Features include a gourmet kitchen, spacious lounge, and private garden.",
      images: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400",
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400",
        "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400"
      ]
    };

    // Simulate scraping delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json(mockData);

  } catch (error) {
    console.error('Error scraping property:', error);
    return NextResponse.json(
      { error: 'Failed to scrape property data' },
      { status: 500 }
    );
  }
}