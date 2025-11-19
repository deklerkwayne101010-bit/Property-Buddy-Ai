'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Template, TEMPLATE_CATEGORIES } from '../../types/template';
import { supabase } from '../../lib/supabase';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadTemplates();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // For now, consider all authenticated users as admins
      // In production, check user role/metadata
      setIsAdmin(!!user);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateTemplate = () => {
    // Show options for different template creation methods
    const choice = confirm('Choose template creation method:\n\nOK = Upload Canva Design\nCancel = Use Drag-and-Drop Editor');
    if (choice) {
      router.push('/canva-upload');
    } else {
      router.push('/template-editor');
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Marketing Templates
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Create stunning marketing materials with our professional template editor.
              Design flyers, brochures, social media posts, and more for your real estate business.
            </p>
          </div>

          {/* _templated Embed */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Template Editor</h2>
              <p className="text-sm text-slate-600">Use our drag-and-drop editor to create professional marketing materials</p>
            </div>
            <div className="relative" style={{ height: '800px' }}>
              <iframe
                src="https://app.templated.io/editor?embed=e96c0309-0cc5-42d0-81c6-2ab8bba01508"
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                className="w-full h-full"
                title="Template Editor"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">How to Use the Template Editor</h3>
                <ul className="text-slate-700 space-y-1 text-sm">
                  <li>• <strong>Browse Templates:</strong> Choose from hundreds of professionally designed templates</li>
                  <li>• <strong>Customize:</strong> Edit text, colors, images, and layouts to match your brand</li>
                  <li>• <strong>Add Your Content:</strong> Replace placeholder text with your property details</li>
                  <li>• <strong>Download:</strong> Export your designs in high-quality formats (PDF, PNG, JPG)</li>
                  <li>• <strong>Save & Reuse:</strong> Save your customized templates for future use</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Renderform Section */}
          <div className="mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Form Builder
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Create professional contact forms, lead capture forms, and surveys with our drag-and-drop form builder.
                Perfect for collecting client information and generating leads.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Form Builder</h3>
                <p className="text-sm text-slate-600">Design and customize professional forms for your real estate business</p>
              </div>
              <div className="relative">
                <iframe
                  src="https://renderform.io/share/live-preview/?i=purple-frogs-howl-smoothly-1437"
                  width="100%"
                  height="500px"
                  frameBorder="0"
                  title="Form Builder"
                />
              </div>
            </div>

            {/* Form Builder Instructions */}
            <div className="mt-8 bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Form Builder Features</h3>
                  <ul className="text-slate-700 space-y-1 text-sm">
                    <li>• <strong>Drag & Drop Interface:</strong> Easily add form fields, buttons, and layout elements</li>
                    <li>• <strong>Lead Capture:</strong> Collect client information, contact details, and property requirements</li>
                    <li>• <strong>Custom Styling:</strong> Match your brand colors and design preferences</li>
                    <li>• <strong>Responsive Design:</strong> Forms work perfectly on all devices</li>
                    <li>• <strong>Integration Ready:</strong> Connect with your CRM and email marketing tools</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
