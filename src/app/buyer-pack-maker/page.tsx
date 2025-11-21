'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableCell, TableRow, WidthType, ImageRun, PageOrientation, PageMargin, Header, Footer, BorderStyle, ShadingType, VerticalAlign, HeightRule } from 'docx';

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

    // Professional Header with RE/MAX Branding
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'RE/MAX',
            font: 'Arial',
            size: 48,
            bold: true,
            color: 'DC2626', // Red color for RE/MAX branding
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Property Buyer Pack',
            font: 'Arial',
            size: 32,
            bold: true,
            color: '1F2937',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Professional Property Marketing Solutions',
            font: 'Arial',
            size: 20,
            color: '6B7280',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      })
    );

    // Agent Information Section with Professional Styling
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'AGENT INFORMATION',
            font: 'Arial',
            size: 24,
            bold: true,
            color: 'DC2626',
          }),
        ],
        spacing: { before: 400, after: 300 },
      }),
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Name:',
                        font: 'Arial',
                        size: 22,
                        bold: true,
                        color: '374151',
                      }),
                    ],
                  }),
                ],
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: 'F9FAFB' },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: templateData.agentName,
                        font: 'Arial',
                        size: 22,
                        color: '1F2937',
                      }),
                    ],
                  }),
                ],
                width: { size: 75, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Email:',
                        font: 'Arial',
                        size: 22,
                        bold: true,
                        color: '374151',
                      }),
                    ],
                  }),
                ],
                shading: { fill: 'F9FAFB' },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: templateData.agentEmail,
                        font: 'Arial',
                        size: 22,
                        color: '1F2937',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Phone:',
                        font: 'Arial',
                        size: 22,
                        bold: true,
                        color: '374151',
                      }),
                    ],
                  }),
                ],
                shading: { fill: 'F9FAFB' },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: templateData.agentPhone,
                        font: 'Arial',
                        size: 22,
                        color: '1F2937',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on: ${templateData.currentDate}`,
            font: 'Arial',
            size: 18,
            color: '6B7280',
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 300, after: 600 },
      })
    );

    // Properties Section
    templateData.properties.forEach((property, index) => {
      // Property Header
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `PROPERTY ${index + 1}`,
              font: 'Arial',
              size: 28,
              bold: true,
              color: 'DC2626',
            }),
          ],
          spacing: { before: 600, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: property.title,
              font: 'Arial',
              size: 24,
              bold: true,
              color: '1F2937',
            }),
          ],
          spacing: { after: 300 },
        })
      );

      // Price Highlight
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `R ${property.price}`,
              font: 'Arial',
              size: 32,
              bold: true,
              color: '059669',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 400 },
        })
      );

      // Property Images Placeholder
      if (property.images.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'PROPERTY PHOTOS',
                font: 'Arial',
                size: 20,
                bold: true,
                color: '374151',
              }),
            ],
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `[Insert ${property.images.length} property photo${property.images.length > 1 ? 's' : ''} here]`,
                font: 'Arial',
                size: 18,
                color: '6B7280',
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          })
        );
      }

      // Property Details Table
      const propertyDetailsRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Bedrooms',
                      font: 'Arial',
                      size: 20,
                      bold: true,
                      color: '374151',
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F9FAFB' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: property.bedrooms.toString(),
                      font: 'Arial',
                      size: 20,
                      color: '1F2937',
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Bathrooms',
                      font: 'Arial',
                      size: 20,
                      bold: true,
                      color: '374151',
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F9FAFB' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: property.bathrooms.toString(),
                      font: 'Arial',
                      size: 20,
                      color: '1F2937',
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Parking',
                      font: 'Arial',
                      size: 20,
                      bold: true,
                      color: '374151',
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F9FAFB' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: property.parking.toString(),
                      font: 'Arial',
                      size: 20,
                      color: '1F2937',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Size',
                      font: 'Arial',
                      size: 20,
                      bold: true,
                      color: '374151',
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F9FAFB' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: property.size,
                      font: 'Arial',
                      size: 20,
                      color: '1F2937',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ];

      children.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          },
          rows: propertyDetailsRows,
        }),
        new Paragraph({
          text: '',
          spacing: { after: 300 },
        })
      );

      // Address
      if (property.address) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'LOCATION',
                font: 'Arial',
                size: 20,
                bold: true,
                color: '374151',
              }),
            ],
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: property.address,
                font: 'Arial',
                size: 20,
                color: '1F2937',
              }),
            ],
            spacing: { after: 300 },
          })
        );
      }

      // Property Description
      if (property.description) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'PROPERTY DESCRIPTION',
                font: 'Arial',
                size: 20,
                bold: true,
                color: '374151',
              }),
            ],
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: property.description,
                font: 'Arial',
                size: 20,
                color: '1F2937',
              }),
            ],
            spacing: { after: 300 },
          })
        );
      }

      // Key Features
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'KEY FEATURES',
              font: 'Arial',
              size: 20,
              bold: true,
              color: '374151',
            }),
          ],
          spacing: { before: 300, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Modern Kitchen',
              font: 'Arial',
              size: 18,
              color: '1F2937',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Spacious Living Areas',
              font: 'Arial',
              size: 18,
              color: '1F2937',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Quality Finishes',
              font: 'Arial',
              size: 18,
              color: '1F2937',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Security Estate',
              font: 'Arial',
              size: 18,
              color: '1F2937',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Close to Amenities',
              font: 'Arial',
              size: 18,
              color: '1F2937',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Excellent Investment',
              font: 'Arial',
              size: 18,
              color: '1F2937',
            }),
          ],
        }),
        new Paragraph({
          text: '',
          spacing: { after: 600 },
        })
      );

      // Page break between properties (except for the last one)
      if (index < templateData.properties.length - 1) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '',
                break: 1, // Page break
              }),
            ],
          })
        );
      }
    });

    // Professional Footer
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Generated using Stagefy AI Property Tools',
            font: 'Arial',
            size: 16,
            color: '6B7280',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Professional Property Marketing Solutions',
            font: 'Arial',
            size: 14,
            color: '9CA3AF',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
      })
    );

    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch in twentieths of a point
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'RE/MAX Property Buyer Pack',
                      font: 'Arial',
                      size: 16,
                      color: 'DC2626',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Page | ${new Date().getFullYear()} RE/MAX`,
                      font: 'Arial',
                      size: 12,
                      color: '9CA3AF',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
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