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
  const [singleUrl, setSingleUrl] = useState('');

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

  // Helper function to get URL count
  const getUrlCount = () => {
    return propertyUrls.split('\n').filter(url => url.trim()).length;
  };

  // Helper function to add a single URL
  const addUrl = () => {
    if (!singleUrl.trim()) return;

    const currentUrls = propertyUrls.trim();
    const newUrls = currentUrls ? `${currentUrls}\n${singleUrl.trim()}` : singleUrl.trim();
    setPropertyUrls(newUrls);
    setSingleUrl('');
  };

  // Helper function to remove a URL by index
  const removeUrl = (indexToRemove: number) => {
    const urls = propertyUrls.split('\n').filter(url => url.trim());
    urls.splice(indexToRemove, 1);
    setPropertyUrls(urls.join('\n'));
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

      // Process URLs sequentially to avoid rate limiting
      for (let i = 0; i < urls.length; i++) {
        setProgress(Math.round(((i + 1) / urls.length) * 100));

        try {
          console.log(`Starting scrape job for property ${i + 1}/${urls.length}: ${urls[i].trim()}`);

          // Start scraping job
          const startResponse = await fetch('/api/buyer-pack/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urls[i].trim() }),
          });

          if (!startResponse.ok) {
            throw new Error(`Failed to start scraping job: ${startResponse.status}`);
          }

          const { jobId } = await startResponse.json();
          console.log(`Started scraping job ${jobId} for property ${i + 1}`);

          // Poll for completion
          let jobComplete = false;
          let attempts = 0;
          const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)

          while (!jobComplete && attempts < maxAttempts) {
            attempts++;

            // Wait 5 seconds before checking status
            await new Promise(resolve => setTimeout(resolve, 5000));

            try {
              const statusResponse = await fetch(`/api/buyer-pack/scrape?jobId=${jobId}`);

              if (!statusResponse.ok) {
                console.error(`Failed to check job status: ${statusResponse.status}`);
                continue;
              }

              const jobStatus = await statusResponse.json();

              if (jobStatus.status === 'completed') {
                console.log(`Job ${jobId} completed successfully`);
                results.push(jobStatus.data);
                jobComplete = true;
              } else if (jobStatus.status === 'failed') {
                console.error(`Job ${jobId} failed: ${jobStatus.error}`);
                // Add fallback entry for failed jobs
                results.push({
                  title: `Property ${i + 1} (Scraping failed)`,
                  price: "Price not available",
                  address: urls[i].trim(),
                  bedrooms: 0,
                  bathrooms: 0,
                  parking: 0,
                  size: "Size not available",
                  description: `Scraping failed: ${jobStatus.error}. Please check the URL and try again, or manually add the property details.`,
                  images: []
                });
                jobComplete = true;
              } else {
                console.log(`Job ${jobId} status: ${jobStatus.status} (attempt ${attempts}/${maxAttempts})`);
              }
            } catch (statusError) {
              console.error(`Error checking job status for ${jobId}:`, statusError);
            }
          }

          if (!jobComplete) {
            console.error(`Job ${jobId} timed out after ${maxAttempts} attempts`);
            results.push({
              title: `Property ${i + 1} (Timeout)`,
              price: "Price not available",
              address: urls[i].trim(),
              bedrooms: 0,
              bathrooms: 0,
              parking: 0,
              size: "Size not available",
              description: "Scraping timed out. Property24 may be blocking requests. Please try again later or manually add the property details.",
              images: []
            });
          }

        } catch (error) {
          console.error(`Error starting scrape job for ${urls[i]}:`, error);

          // Add fallback entry for job start errors
          results.push({
            title: `Property ${i + 1} (Job start failed)`,
            price: "Price not available",
            address: urls[i].trim(),
            bedrooms: 0,
            bathrooms: 0,
            parking: 0,
            size: "Size not available",
            description: `Failed to start scraping job: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            images: []
          });
        }

        // Add a delay between jobs to avoid overwhelming the server
        if (i < urls.length - 1) {
          const delay = 2000; // 2 seconds between jobs
          console.log(`Waiting ${delay/1000} seconds before starting next job...`);
          await new Promise(resolve => setTimeout(resolve, delay));
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
          <img src="https://nvifcvqzxqhlrtvekbvq.supabase.co/storage/v1/object/public/images/re-max-2025-logo-png_seeklogo-619513.png" alt="RE/MAX Logo" class="logo" />
          <div class="subtitle">Property Buyer Pack</div>
        </div>

        <div class="agent-card">
          <div class="agent-avatar">${templateData.agentInitial}</div>
          <div class="agent-details">
            <h3 contenteditable="true">${templateData.agentName}</h3>
            <p contenteditable="true">${templateData.agentEmail}</p>
            <p contenteditable="true">${templateData.agentPhone}</p>
          </div>
        </div>

        <div class="date">Generated on: ${templateData.currentDate}</div>

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
        <img src="${imageUrl}" alt="Property Photo ${imgIndex + 1}" onerror="this.style.display='none'" />
      `).join('');

      return `
        <div class="property-section">
            <h1 class="property-title" contenteditable="true">
              PROPERTY ${index + 1}: ${property.title}
            </h1>

            <div class="price">
              ${property.price}
            </div>

            <table>
                <tr>
                    <th>Bedrooms</th>
                    <th>Bathrooms</th>
                    <th>Parking</th>
                    <th>Size</th>
                </tr>
                <tr>
                    <td>${property.bedrooms}</td>
                    <td>${property.bathrooms}</td>
                    <td>${property.parking}</td>
                    <td>${property.size}</td>
                </tr>
            </table>

            ${property.address ? `<div class="section-label">Location: <span contenteditable="true">${property.address}</span></div>` : ''}

            <div class="section-label">Property Description</div>
            <p contenteditable="true" style="margin-bottom: 25px; line-height: 1.6;">${property.description || 'No description available'}</p>

            <div class="section-label">Property Photos</div>
            <div class="image-grid">
                ${imageHtml}
            </div>

            <div class="section-label">Key Features</div>
            <ul contenteditable="true" style="margin-bottom: 25px; line-height: 1.8;">
                <li>Modern Kitchen</li>
                <li>Spacious Living Areas</li>
                <li>Quality Finishes</li>
                <li>Security Estate</li>
                <li>Close to Amenities</li>
                <li>Excellent Investment</li>
            </ul>

            <div class="section-label">Additional Notes</div>
            <p contenteditable="true" style="font-style: italic; color: var(--gray-600);">
              Add any additional information, special features, or notes about this property here...
            </p>
        </div>
      `;
    }));

    // Generate complete HTML document
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>RE/MAX Buyer Pack</title>

        <!-- Modern Font -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">

        <style>
          :root {
            --remax-red: #E21B22;
            --remax-blue: #0054A4;
            --gray-100: #F3F4F6;
            --gray-200: #E5E7EB;
            --gray-600: #6B7280;
            --gray-900: #111827;
            --radius: 12px;
          }

          body {
            font-family: 'Inter', sans-serif;
            background: #f8fafc;
            color: var(--gray-900);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
          }

          /* Header */
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid var(--remax-red);
          }

          .logo {
            width: 220px;
            margin-bottom: 10px;
          }

          .subtitle {
            font-size: 20px;
            color: var(--gray-600);
            letter-spacing: 1px;
            font-weight: 500;
          }

          /* Agent Card */
          .agent-card {
            background: white;
            padding: 25px;
            border-radius: var(--radius);
            border: 1px solid var(--gray-200);
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 30px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.03);
          }

          .agent-avatar {
            width: 70px;
            height: 70px;
            background: var(--remax-blue);
            color: white;
            border-radius: 50%;
            font-size: 28px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .agent-details h3 {
            font-size: 22px;
            margin: 0;
            font-weight: 600;
          }

          .agent-details p {
            margin: 2px 0;
            color: var(--gray-600);
            font-size: 15px;
          }

          .date {
            text-align: right;
            color: var(--gray-600);
            font-size: 14px;
            margin-top: 5px;
          }

          /* Property Section */
          .property-section {
            background: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: var(--radius);
            border: 1px solid var(--gray-200);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            page-break-inside: avoid;
          }

          .property-title {
            font-size: 26px;
            font-weight: 700;
            color: var(--remax-red);
            margin-bottom: 20px;
            border-left: 6px solid var(--remax-blue);
            padding-left: 12px;
          }

          .property-hero img {
            width: 100%;
            border-radius: var(--radius);
            margin-bottom: 20px;
          }

          .price {
            text-align: center;
            font-size: 34px;
            font-weight: 700;
            color: #059669;
            margin: 20px 0;
          }

          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            border-radius: var(--radius);
            overflow: hidden;
          }

          th {
            background: var(--remax-blue);
            color: white;
            padding: 12px;
            font-weight: 600;
          }

          td {
            background: var(--gray-100);
            padding: 12px;
            text-align: center;
            border-bottom: 1px solid var(--gray-200);
          }

          /* Description */
          .section-label {
            font-size: 20px;
            font-weight: 600;
            color: var(--remax-blue);
            margin: 25px 0 10px;
          }

          .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 15px;
          }

          .image-grid img {
            width: 100%;
            height: 180px;
            object-fit: cover;
            border-radius: var(--radius);
            border: 1px solid var(--gray-200);
          }

          .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: var(--gray-600);
            font-size: 14px;
            border-top: 2px solid var(--gray-200);
          }

          /* Print Rules */
          @media print {
            body { padding: 0; margin: 0.3in; }
            .editing-note { display: none; }
          }

          /* Editable Highlight */
          [contenteditable]:focus {
            outline: 2px solid var(--remax-red);
            background: #fff7f7;
          }

          /* Edit Label */
          .editing-note {
            position: fixed;
            top: 10px;
            right: 10px;
            background: var(--remax-red);
            color: white;
            padding: 10px 12px;
            font-size: 12px;
            border-radius: 6px;
            z-index: 2000;
          }
        </style>
      </head>

      <body>

        <div class="editing-note">
          Editable Buyer Pack • Click to Edit • Ctrl+P to Save as PDF
        </div>

        <div class="header">
          <img class="logo" src="https://nvifcvqzxqhlrtvekbvq.supabase.co/storage/v1/object/public/images/re-max-2025-logo-png_seeklogo-619513.png" alt="RE/MAX Logo">
          <div class="subtitle">Property Buyer Viewing Pack</div>
        </div>

        <div class="agent-card">
          <div class="agent-avatar">${templateData.agentInitial}</div>
          <div class="agent-details">
            <h3 contenteditable="true">${templateData.agentName}</h3>
            <p contenteditable="true">${templateData.agentEmail}</p>
            <p contenteditable="true">${templateData.agentPhone}</p>
          </div>
        </div>

        <div class="date">Generated on: ${templateData.currentDate}</div>

        ${propertySections.join('\n\n')}

        <div class="footer">
          Generated using Stagefy AI — RE/MAX Agent Tools
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Multiple Properties</h2>
                <p className="text-gray-600">Create a professional buyer pack with multiple properties for your viewing</p>
              </div>
              {getUrlCount() > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <div className="text-sm text-blue-700 font-medium">
                    {getUrlCount()} {getUrlCount() === 1 ? 'Property' : 'Properties'} Added
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add Section */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Add Property</h3>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  placeholder="Paste Property24 URL here..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && addUrl()}
                />
                <button
                  onClick={addUrl}
                  disabled={!singleUrl.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Property
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Tip: Copy the URL from any Property24 listing page
              </p>
            </div>

            {/* Bulk Add Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bulk Add Properties</h3>
              <div>
                <label htmlFor="property-urls" className="block text-sm font-medium text-gray-700 mb-2">
                  Or paste multiple Property24 URLs (one per line)
                </label>
                <textarea
                  id="property-urls"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.property24.com/for-sale/durban/kwazulu-natal/123
https://www.property24.com/for-sale/cape-town/western-cape/456
https://www.property24.com/for-sale/johannesburg/gauteng/789"
                  value={propertyUrls}
                  onChange={(e) => setPropertyUrls(e.target.value)}
                />
              </div>
            </div>

            {/* URL List Preview */}
            {getUrlCount() > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Properties to Process:</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {propertyUrls.split('\n').filter(url => url.trim()).map((url, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-3">{url}</span>
                      <button
                        onClick={() => removeUrl(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove this property"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-md">{error}</div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleScrapeProperties}
                disabled={isProcessing || getUrlCount() === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scraping {getUrlCount()} Properties...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Scrape {getUrlCount()} {getUrlCount() === 1 ? 'Property' : 'Properties'}
                  </>
                )}
              </button>

              {scrapedData.length > 0 && (
                <>
                  <button
                    onClick={handleGeneratePDF}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isProcessing ? 'Generating PDF...' : 'Generate PDF Pack'}
                  </button>

                  <button
                    onClick={handleGenerateEditableHTML}
                    disabled={isProcessing}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isProcessing ? 'Generating Editable Pack...' : 'Generate Editable Pack'}
                  </button>
                </>
              )}
            </div>

            {isProcessing && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Processing properties...</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How to add properties:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use the &quot;Quick Add&quot; field to add one property at a time</li>
                <li>• Or paste multiple URLs in the bulk textarea (one per line)</li>
                <li>• Each property will become a separate page in your buyer pack</li>
                <li>• Maximum 10 properties per pack for optimal performance</li>
              </ul>
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
