'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';

interface Template {
  id: string;
  title: string;
  description: string;
  previewImage: string;
  renderformUrl: string;
  category: string;
}

const templates: Template[] = [
  {
    id: 'contact-form',
    title: 'Contact Form',
    description: 'Professional contact form for lead generation',
    previewImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop',
    renderformUrl: 'https://renderform.io/share/live-preview/?i=slow-ponies-trot-fiercely-1105',
    category: 'Lead Generation'
  },
  {
    id: 'survey-form',
    title: 'Customer Survey',
    description: 'Comprehensive survey form for customer feedback',
    previewImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
    renderformUrl: 'https://renderform.io/share/live-preview/?i=purple-frogs-howl-smoothly-1437',
    category: 'Feedback'
  },
  {
    id: 'registration-form',
    title: 'Event Registration',
    description: 'Event registration and attendee information form',
    previewImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop',
    renderformUrl: 'https://renderform.io/share/live-preview/?i=example-form-3',
    category: 'Events'
  },
  {
    id: 'newsletter-signup',
    title: 'Newsletter Signup',
    description: 'Email newsletter subscription form',
    previewImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop',
    renderformUrl: 'https://renderform.io/share/live-preview/?i=example-form-4',
    category: 'Marketing'
  },
  {
    id: 'job-application',
    title: 'Job Application',
    description: 'Professional job application form for HR',
    previewImage: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=250&fit=crop',
    renderformUrl: 'https://renderform.io/share/live-preview/?i=example-form-5',
    category: 'HR'
  },
  {
    id: 'quote-request',
    title: 'Quote Request',
    description: 'Service quote request form for businesses',
    previewImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=250&fit=crop',
    renderformUrl: 'https://renderform.io/share/live-preview/?i=example-form-6',
    category: 'Sales'
  }
];

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Templates</h1>
            <p className="text-gray-600">Choose from our collection of professional form templates to get started quickly.</p>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer border border-gray-200 overflow-hidden"
                onClick={() => setSelectedTemplate(template)}
              >
                {/* Template Preview Image */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  <img
                    src={template.previewImage}
                    alt={template.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity duration-300" />
                </div>

                {/* Template Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{template.title}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200">
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Template Modal */}
          {selectedTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedTemplate.title}</h2>
                    <p className="text-gray-600 text-sm">{selectedTemplate.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-4">
                  <iframe
                    src={selectedTemplate.renderformUrl}
                    width="100%"
                    height="600px"
                    frameBorder="0"
                    className="rounded-md"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
