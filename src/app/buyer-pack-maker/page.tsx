'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableCell, TableRow, WidthType, ImageRun } from 'docx';

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
  agentName?: string;
  agentContact?: string;
}

export default function BuyerPackMakerPage() {
  const [propertyUrls, setPropertyUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapedData, setScrapedData] = useState<PropertyData[]>([]);
  const [error, setError] = useState('');

  const handleScrapeProperties = async () => {
    if (!propertyUrls.trim()) {
      setError('Please enter at least one Property24 URL');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);

    const urls = propertyUrls.split('\n').filter(url => url.trim());

    try {
      const results: PropertyData[] = [];

      for (let i = 0; i < urls.length; i++) {
        setProgress(Math.round(((i + 1) / urls.length) * 100));

        const response = await fetch('/api/buyer-pack/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: urls[i].trim() }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push(data);
        } else {
          console.error(`Failed to scrape ${urls[i]}`);
          // Continue with other URLs
        }
      }

      setScrapedData(results);
    } catch (err) {
      setError('Failed to scrape properties. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleGeneratePDF = async () => {
    if (scrapedData.length === 0) {
      setError('No property data available. Please scrape properties first.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Dynamically import html2pdf only on client side
      const html2pdf = (await import('html2pdf.js')).default;

      // Generate HTML content for PDF
      const htmlContent = generatePDFHTML(scrapedData);

      // Configure html2pdf options
      const options = {
        margin: [20, 20, 20, 20] as [number, number, number, number], // top, right, bottom, left
        filename: 'buyer-pack.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const
        }
      };

      // Generate and download PDF
      await html2pdf().set(options).from(htmlContent).save();

    } catch (err) {
      setError('Failed to generate PDF. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateWord = async () => {
    if (scrapedData.length === 0) {
      setError('No property data available. Please scrape properties first.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Generate Word document
      const doc = await generateWordDocument(scrapedData);

      // Generate and download the Word document
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'buyer-pack.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError('Failed to generate Word document. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDFHTML = (properties: PropertyData[]) => {
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

    // Generate property HTML
    const propertyHtml = templateData.properties.map(property => `
      <div style="margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: white;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
          <h2 style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 0;">${property.title}</h2>
          <div style="font-size: 24px; font-weight: bold; color: #059669;">R ${property.price}</div>
        </div>

        ${property.address ? `<div style="color: #6b7280; margin-bottom: 10px; font-size: 16px;">${property.address}</div>` : ''}

        <div style="display: flex; gap: 20px; margin-bottom: 15px; font-size: 14px; color: #6b7280;">
          <div>${property.bedrooms} Bedrooms</div>
          <div>${property.bathrooms} Bathrooms</div>
          <div>${property.parking} Parking</div>
          <div>${property.size}</div>
        </div>

        ${property.images.length > 0 ? `
        <div style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto;">
          ${property.images.slice(0, 6).map(image => `
            <img src="${image}" alt="Property Image" style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />
          `).join('')}
        </div>
        ` : ''}

        ${property.description ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">Property Description</h3>
          <p style="color: #4b5563; line-height: 1.6;">${property.description}</p>
        </div>
        ` : ''}

        <div>
          <h3 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">Key Features</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
            <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px;">Modern Kitchen</div>
            <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px;">Spacious Living Areas</div>
            <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px;">Quality Finishes</div>
            <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px;">Security Estate</div>
            <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px;">Close to Amenities</div>
            <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px;">Excellent Investment</div>
          </div>
        </div>
      </div>
    `).join('');

    // Return complete HTML document
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Property Buyer Pack</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8fafc;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 18px;
            color: #6b7280;
          }
          .agent-info {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
          }
          .agent-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          .agent-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #dc2626;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin-right: 15px;
          }
          .agent-details h3 {
            margin: 0 0 5px 0;
            font-size: 20px;
            color: #1f2937;
          }
          .agent-details p {
            margin: 2px 0;
            color: #6b7280;
          }
          .date {
            text-align: right;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">RE/MAX</div>
          <div class="subtitle">Property Buyer Pack</div>
        </div>

        <div class="agent-info">
          <div class="agent-header">
            <div class="agent-avatar">${templateData.agentInitial}</div>
            <div class="agent-details">
              <h3>${templateData.agentName}</h3>
              <p>${templateData.agentEmail}</p>
              <p>${templateData.agentPhone}</p>
            </div>
          </div>
          <div class="date">Generated on: ${templateData.currentDate}</div>
        </div>

        ${propertyHtml}

        <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            This buyer pack was generated using Stagefy AI Property Tools
          </p>
        </div>
      </body>
      </html>
    `;
  };

  const generateWordDocument = async (properties: PropertyData[]): Promise<Document> => {
    const templateData = {
      properties: properties.map(property => ({
        ...property,
        price: property.price.replace(/,/g, '') // Remove commas for display
      })),
      agentName: 'John Smith',
      agentEmail: 'john.smith@remax.co.za',
      agentPhone: '+27 21 123 4567',
      currentDate: new Date().toLocaleDateString('en-ZA')
    };

    const children: (Paragraph | Table)[] = [];

    // Header
    children.push(
      new Paragraph({
        text: 'RE/MAX',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: 'Property Buyer Pack',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: '',
      })
    );

    // Agent Information
    children.push(
      new Paragraph({
        text: 'Agent Information',
        heading: HeadingLevel.HEADING_2,
      }),
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph('Name:')],
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph(templateData.agentName)],
                width: { size: 70, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph('Email:')],
              }),
              new TableCell({
                children: [new Paragraph(templateData.agentEmail)],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph('Phone:')],
              }),
              new TableCell({
                children: [new Paragraph(templateData.agentPhone)],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        text: `Generated on: ${templateData.currentDate}`,
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        text: '',
      })
    );

    // Properties
    templateData.properties.forEach((property, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${property.title}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: `Price: R ${property.price}`,
          spacing: { after: 200 },
        })
      );

      if (property.address) {
        children.push(
          new Paragraph({
            text: `Address: ${property.address}`,
          })
        );
      }

      // Property details table
      const propertyDetailsRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Bedrooms:')] }),
            new TableCell({ children: [new Paragraph(property.bedrooms.toString())] }),
            new TableCell({ children: [new Paragraph('Bathrooms:')] }),
            new TableCell({ children: [new Paragraph(property.bathrooms.toString())] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Parking:')] }),
            new TableCell({ children: [new Paragraph(property.parking.toString())] }),
            new TableCell({ children: [new Paragraph('Size:')] }),
            new TableCell({ children: [new Paragraph(property.size)] }),
          ],
        }),
      ];

      children.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: propertyDetailsRows,
        })
      );

      if (property.description) {
        children.push(
          new Paragraph({
            text: 'Property Description:',
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: property.description,
            spacing: { after: 200 },
          })
        );
      }

      // Key Features
      children.push(
        new Paragraph({
          text: 'Key Features:',
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: '• Modern Kitchen',
        }),
        new Paragraph({
          text: '• Spacious Living Areas',
        }),
        new Paragraph({
          text: '• Quality Finishes',
        }),
        new Paragraph({
          text: '• Security Estate',
        }),
        new Paragraph({
          text: '• Close to Amenities',
        }),
        new Paragraph({
          text: '• Excellent Investment',
        }),
        new Paragraph({
          text: '',
        })
      );
    });

    // Footer
    children.push(
      new Paragraph({
        text: 'This buyer pack was generated using Stagefy AI Property Tools',
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      })
    );

    return new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Pack Maker</h1>
            <p className="text-gray-600">Create professional property buyer packs by scraping Property24 listings and generating branded PDFs or Word documents.</p>
          </div>

          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Property URLs</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="property-urls" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Property24 URLs (one per line)
                </label>
                <textarea
                  id="property-urls"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.property24.com/for-sale/durban/kwazulu-natal/123&#10;https://www.property24.com/for-sale/cape-town/western-cape/456"
                  value={propertyUrls}
                  onChange={(e) => setPropertyUrls(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleScrapeProperties}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200"
                >
                  {isProcessing ? 'Scraping...' : 'Scrape Properties'}
                </button>

                {scrapedData.length > 0 && (
                  <>
                    <button
                      onClick={handleGeneratePDF}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200"
                    >
                      {isProcessing ? 'Generating...' : 'Generate PDF'}
                    </button>

                    <button
                      onClick={handleGenerateWord}
                      disabled={isProcessing}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200"
                    >
                      {isProcessing ? 'Generating...' : 'Generate Word'}
                    </button>
                  </>
                )}
              </div>

              {isProcessing && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          {scrapedData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Scraped Properties ({scrapedData.length})</h2>
              <div className="space-y-4">
                {scrapedData.map((property, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{property.title}</h3>
                      <span className="text-lg font-bold text-green-600">{property.price}</span>
                    </div>
                    <p className="text-gray-600 mb-2">{property.address}</p>
                    <div className="flex space-x-4 text-sm text-gray-500 mb-2">
                      <span>{property.bedrooms} beds</span>
                      <span>{property.bathrooms} baths</span>
                      <span>{property.parking} parking</span>
                      <span>{property.size}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{property.description}</p>
                    {property.images.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-500 mb-2">Images: {property.images.length}</p>
                        <div className="flex space-x-2 overflow-x-auto">
                          {property.images.slice(0, 3).map((image, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={image}
                              alt={`Property ${imgIndex + 1}`}
                              className="w-20 h-20 object-cover rounded border"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}