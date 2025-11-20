import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

interface PropertyData {
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
    const { properties }: { properties: PropertyData[] } = await request.json();

    if (!properties || properties.length === 0) {
      return NextResponse.json(
        { error: 'No property data provided' },
        { status: 400 }
      );
    }

    // Read the HTML template
    const templatePath = path.join(process.cwd(), 'templates', 'buyer-pack-template.html');
    let templateHtml = fs.readFileSync(templatePath, 'utf8');

    // Prepare template data
    const templateData = {
      properties: properties.map(property => ({
        ...property,
        price: property.price.replace(/,/g, '') // Remove commas for display
      })),
      agentName: 'John Smith',
      agentEmail: 'john.smith@remax.co.za',
      agentPhone: '+27 21 123 4567',
      agentInitial: 'J',
      currentDate: new Date().toLocaleDateString('en-ZA')
    };

    // Simple template replacement (you could use Handlebars for more complex templating)
    templateHtml = templateHtml.replace('{{#properties}}', '');
    templateHtml = templateHtml.replace('{{/properties}}', '');

    // Replace agent information
    templateHtml = templateHtml.replace('{{agentName}}', templateData.agentName);
    templateHtml = templateHtml.replace('{{agentEmail}}', templateData.agentEmail);
    templateHtml = templateHtml.replace('{{agentPhone}}', templateData.agentPhone);
    templateHtml = templateHtml.replace('{{agentInitial}}', templateData.agentInitial);
    templateHtml = templateHtml.replace('{{currentDate}}', templateData.currentDate);

    // Generate property HTML
    const propertyHtml = templateData.properties.map(property => `
      <div class="property-card">
        <div class="property-header">
          <h2 class="property-title">${property.title}</h2>
          <div class="property-price">R ${property.price}</div>
          <div class="property-address">${property.address}</div>
          <div class="property-specs">
            <div class="spec-item">${property.bedrooms} Bedrooms</div>
            <div class="spec-item">${property.bathrooms} Bathrooms</div>
            <div class="spec-item">${property.parking} Parking</div>
            <div class="spec-item">${property.size}</div>
          </div>
        </div>

        ${property.images.length > 0 ? `
        <div class="image-gallery">
          ${property.images.slice(0, 6).map(image => `
            <img src="${image}" alt="Property Image" class="property-image" />
          `).join('')}
        </div>
        ` : ''}

        <div class="property-details">
          ${property.description ? `
          <div class="description-section">
            <h3>Property Description</h3>
            <p class="description-text">${property.description}</p>
          </div>
          ` : ''}

          <div class="features-section">
            <h3>Key Features</h3>
            <div class="features-list">
              <div class="feature-item">Modern Kitchen</div>
              <div class="feature-item">Spacious Living Areas</div>
              <div class="feature-item">Quality Finishes</div>
              <div class="feature-item">Security Estate</div>
              <div class="feature-item">Close to Amenities</div>
              <div class="feature-item">Excellent Investment</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Insert properties into template
    const propertiesPlaceholder = '{{#properties}}{{/properties}}';
    templateHtml = templateHtml.replace(propertiesPlaceholder, propertyHtml);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set content and wait for images to load
    await page.setContent(templateHtml, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="buyer-pack.pdf"'
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}