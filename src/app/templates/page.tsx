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
  const [activeModal, setActiveModal] = useState<string | null>(null);

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

          {/* Form Builders Grid */}
          <div className="mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Form Builders
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Create professional contact forms, lead capture forms, and surveys with our drag-and-drop form builders.
                Perfect for collecting client information and generating leads.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Form Builder Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer" onClick={() => setActiveModal('basic-form')}>
                <div className="relative">
                  {/* Preview Image */}
                  <div className="h-48 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                    <img
                      src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&crop=center"
                      alt="Form Builder Preview"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-white font-medium">Form Builder</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Basic Form Builder</h3>
                        <p className="text-sm text-slate-600">Simple & easy-to-use form creation</p>
                      </div>
                    </div>
                  <p className="text-slate-700 mb-4">Perfect for contact forms, lead capture, and basic surveys. Drag-and-drop interface with responsive design.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Drag & Drop</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Lead Capture</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Responsive</span>
                  </div>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                    Open Form Builder
                  </button>
                  </div>
                </div>
              </div>

              {/* Advanced Form Builder Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer" onClick={() => setActiveModal('advanced-form')}>
                <div className="relative">
                  {/* Preview Image */}
                  <div className="h-48 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    <img
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&crop=center"
                      alt="Advanced Form Builder Preview"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-white font-medium">Advanced Form Builder</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Advanced Form Builder</h3>
                        <p className="text-sm text-slate-600">Complex forms with advanced features</p>
                      </div>
                    </div>
                    <p className="text-slate-700 mb-4">Build sophisticated forms with conditional logic, multi-step flows, and powerful integrations.</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Conditional Logic</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Multi-Step</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Integrations</span>
                    </div>
                    <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                      Open Advanced Builder
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Builder Features */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-purple-50 rounded-xl p-6 border border-slate-200">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Form Builder Features</h3>
                <p className="text-slate-600">Choose the right form builder for your needs</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-slate-900">Basic Builder</h4>
                  </div>
                  <ul className="text-slate-700 space-y-1 text-sm">
                    <li>• Drag & Drop Interface</li>
                    <li>• Lead Capture Forms</li>
                    <li>• Custom Styling</li>
                    <li>• Responsive Design</li>
                    <li>• Email Integrations</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-slate-900">Advanced Builder</h4>
                  </div>
                  <ul className="text-slate-700 space-y-1 text-sm">
                    <li>• Conditional Logic</li>
                    <li>• Advanced Validation</li>
                    <li>• Multi-Step Forms</li>
                    <li>• CRM Integrations</li>
                    <li>• Custom Calculations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Builder Modals */}
        {activeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900">
                  {activeModal === 'basic-form' ? 'Basic Form Builder' : 'Advanced Form Builder'}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative" style={{ height: '70vh' }}>
                <iframe
                  src={activeModal === 'basic-form'
                    ? "https://renderform.io/share/live-preview/?i=purple-frogs-howl-smoothly-1437"
                    : "https://renderform.io/share/live-preview/?i=young-yetis-chew-sharply-1929"
                  }
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title={activeModal === 'basic-form' ? 'Basic Form Builder' : 'Advanced Form Builder'}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
