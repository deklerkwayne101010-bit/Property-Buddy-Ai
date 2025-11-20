'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';

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
      const response = await fetch('/api/buyer-pack/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: scrapedData }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'buyer-pack.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to generate PDF. Please try again.');
      }
    } catch (err) {
      setError('Failed to generate PDF. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Pack Maker</h1>
            <p className="text-gray-600">Create professional property buyer packs by scraping Property24 listings and generating branded PDFs.</p>
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
                  <button
                    onClick={handleGeneratePDF}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200"
                  >
                    {isProcessing ? 'Generating...' : 'Generate PDF'}
                  </button>
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