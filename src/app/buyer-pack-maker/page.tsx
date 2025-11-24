'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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
  const { user } = useAuth();
  const [propertyUrls, setPropertyUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapedData, setScrapedData] = useState<PropertyData[]>([]);
  const [error, setError] = useState('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  // Load credits on component mount
  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    if (!user) return;

    try {
      const { data: credits, error } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading credits:', error);
        return;
      }

      setCreditsRemaining(credits?.credits_balance || 0);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

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

  const handleGenerateEditableHTML = async () => {
    if (scrapedData.length === 0) {
      setError('No property data available. Please scrape properties first.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Generate editable HTML content
      const htmlContent = await generateEditableHTML(scrapedData);

      // Create a new window with the editable HTML
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.focus();
      } else {
        // Fallback: download as HTML file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `buyer-pack-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

    } catch (err) {
      setError('Failed to generate editable buyer pack. Please try again.');
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
      agentName: 'Wayne Deklerk',
      agentEmail: 'admin@stagefy.co.za',
      agentPhone: '+27 26 695 7151',
      agentInitial: 'W',
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

  const generateEditableHTML = async (properties: PropertyData[]): Promise<string> => {
    // Prepare template data with proper agent information
    const templateData = {
      properties: properties.map(property => ({
        ...property,
        price: property.price.replace(/,/g, '') // Remove commas for display
      })),
      agentName: 'Wayne Deklerk', // Correct agent name
      agentEmail: 'admin@stagefy.co.za',
      agentPhone: '+27 26 695 7151',
      agentInitial: 'W',
      currentDate: new Date().toLocaleDateString('en-ZA')
    };

    // Generate property sections with actual images
    const propertySections = await Promise.all(templateData.properties.map(async (property, index) => {
      // Create image HTML with actual images
      const imageHtml = property.images.slice(0, 6).map((imageUrl, imgIndex) => `
        <div class="image-container" style="margin: 10px; display: inline-block;">
          <img src="${imageUrl}" alt="Property Photo ${imgIndex + 1}"
                style="max-width: 300px; max-height: 200px; border: 1px solid #ddd; border-radius: 4px;"
                onerror="this.style.display='none'" />
          <br><small>Property Photo ${imgIndex + 1}</small>
        </div>
      `).join('');

      return `
        <div class="property-section" style="page-break-before: always; margin-bottom: 50px;">
            <h1 class="property-title" contenteditable="true" style="color: #DC2626; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">
              PROPERTY ${index + 1}: ${property.title}
            </h1>

            <div class="price-highlight" style="text-align: center; font-size: 32px; font-weight: bold; color: #059669; margin: 20px 0;">
              R ${property.price}
            </div>

            <div class="property-details" style="margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB;">
                    <tr style="background-color: #F9FAFB;">
                        <th style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Bedrooms</th>
                        <th style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Bathrooms</th>
                        <th style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Parking</th>
                        <th style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Size</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">${property.bedrooms}</td>
                        <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">${property.bathrooms}</td>
                        <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">${property.parking}</td>
                        <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">${property.size}</td>
                    </tr>
                </table>
            </div>

            ${property.address ? `<div class="property-address" style="margin-bottom: 20px;"><strong>Location:</strong> <span contenteditable="true">${property.address}</span></div>` : ''}

            <div class="property-description" style="margin-bottom: 30px;">
                <h3 style="color: #1F2937; margin-bottom: 15px;">Property Description</h3>
                <p contenteditable="true" style="line-height: 1.6;">${property.description || 'No description available'}</p>
            </div>

            <div class="property-images" style="margin-bottom: 30px;">
                <h3 style="color: #1F2937; margin-bottom: 15px;">Property Photos</h3>
                <div class="image-grid" style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${imageHtml}
                </div>
            </div>

            <div class="key-features" style="margin-bottom: 30px;">
                <h3 style="color: #1F2937; margin-bottom: 15px;">Key Features</h3>
                <ul contenteditable="true" style="line-height: 1.8;">
                    <li>Modern Kitchen</li>
                    <li>Spacious Living Areas</li>
                    <li>Quality Finishes</li>
                    <li>Security Estate</li>
                    <li>Close to Amenities</li>
                    <li>Excellent Investment</li>
                </ul>
            </div>

            <div class="additional-notes" style="margin-top: 30px; padding: 20px; background-color: #F9FAFB; border-left: 4px solid #DC2626;">
                <h4 style="margin-bottom: 10px; color: #DC2626;">Additional Notes</h4>
                <p contenteditable="true" style="margin: 0; font-style: italic; color: #6B7280;">
                  Add any additional information, special features, or notes about this property here...
                </p>
            </div>
        </div>
      `;
    }));

    // Generate complete HTML document
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Editable Property Buyer Pack</title>
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

          .property-section {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
          }

          .property-title {
            color: #DC2626;
            font-size: 24px;
            margin-bottom: 20px;
            border-bottom: 2px solid #DC2626;
            padding-bottom: 10px;
          }

          .price-highlight {
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            color: #059669;
            margin: 20px 0;
          }

          .property-details table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #E5E7EB;
          }

          .property-details th,
          .property-details td {
            padding: 10px;
            border: 1px solid #E5E7EB;
          }

          .property-details th {
            background-color: #F9FAFB;
            font-weight: bold;
          }

          .property-details td {
            text-align: center;
          }

          .property-description h3,
          .property-images h3,
          .key-features h3 {
            color: #1F2937;
            margin-bottom: 15px;
          }

          .property-description p {
            line-height: 1.6;
          }

          .image-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .image-container {
            margin: 10px;
            display: inline-block;
          }

          .image-container img {
            max-width: 300px;
            max-height: 200px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }

          .key-features ul {
            line-height: 1.8;
          }

          .additional-notes {
            margin-top: 30px;
            padding: 20px;
            background-color: #F9FAFB;
            border-left: 4px solid #DC2626;
          }

          .additional-notes h4 {
            margin-bottom: 10px;
            color: #DC2626;
          }

          .additional-notes p {
            margin: 0;
            font-style: italic;
            color: #6B7280;
          }

          .editing-instructions {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #DC2626;
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
          }

          @media print {
            .editing-instructions { display: none !important; }
            body { margin: 0.5in; }
            .property-section { page-break-inside: avoid; }
          }

          [contenteditable]:focus {
            outline: 2px solid #DC2626;
            background-color: #FEF3C7;
          }

          .image-container img:hover {
            transform: scale(1.05);
            transition: transform 0.2s;
          }
        </style>
      </head>
      <body>
        <div class="editing-instructions">
          <strong>Editable Buyer Pack</strong><br>
          Click any text to edit • Ctrl+P to print • Save as PDF
        </div>

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

        ${propertySections.join('\n\n')}

        <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            This buyer pack was generated using Stagefy AI Property Tools
          </p>
        </div>
      </body>
      </html>
    `;

    return htmlTemplate;
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <motion.div
          className="bg-gradient-to-br from-slate-50 via-white to-blue-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Compact Hero Section */}
          <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-6 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                  Viewing Pack Maker
                </h1>

                <p className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto">
                  Create professional property viewing packs by scraping Property24 listings and generating PDF documents. Perfect for real estate agents preparing for property showings.
                </p>

                {/* Credits Badge */}
                <div className="inline-flex items-center bg-green-50 border border-green-200 rounded-full px-3 py-1.5 mb-6">
                  <span className="text-green-700 text-sm font-medium">
                    {creditsRemaining !== null ? `${creditsRemaining} Credits Remaining` : 'Loading credits...'}
                  </span>
                </div>

                {/* Cost Information */}
                <div className="inline-flex items-center bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 mb-6">
                  <span className="text-orange-700 text-sm font-medium">
                    1 Credit per PDF generation
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-8 max-w-7xl">

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
                      onClick={handleGenerateEditableHTML}
                      disabled={isProcessing}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200"
                    >
                      {isProcessing ? 'Generating...' : 'Generate Editable Pack'}
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
        </motion.div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}