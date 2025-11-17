'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import GenerationControls, { GenerationSettings } from '../../components/GenerationControls';
import PropertyForm from '../../components/PropertyForm';
import LivePreview from '../../components/LivePreview';
import QuickExamples from '../../components/QuickExamples';
import ResultsDisplay from '../../components/ResultsDisplay';
import SavedTemplates from '../../components/SavedTemplates';
import History from '../../components/History';
import DashboardLayout from '../../components/DashboardLayout';

interface PropertyFormData {
  title: string;
  shortSummary: string;
  address: string;
  suburb: string;
  city: string;
  price: string;
  beds: string;
  baths: string;
  garages: string;
  keyFeatures: string[];
  photos: File[];
  language: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  platform: string;
  tone: string;
  length: string;
  is_shared: boolean;
  created_at: string;
  user_id: string;
  team_id?: string;
}

export default function PropertyDescriptions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('new-listing');
  const [userId] = useState(user?.id || 'demo-user'); // In a real app, this would come from auth
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    shortSummary: '',
    address: '',
    suburb: '',
    city: '',
    price: '',
    beds: '',
    baths: '',
    garages: '',
    keyFeatures: [],
    photos: [],
    language: 'English'
  });
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    platforms: [],
    tone: 'Professional',
    length: 'Medium',
    variations: 1,
    seoKeywords: ''
  });
  const [generatedResults, setGeneratedResults] = useState<{ [platform: string]: string[] }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{ [platform: string]: number }>({});

  const tabs = [
    { id: 'new-listing', label: 'New Listing' },
    { id: 'saved-templates', label: 'Saved Templates' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  useEffect(() => {
    if (activeTab === 'saved-templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  useEffect(() => {
    // Check user subscription for AI features access
    const checkAccess = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/credits?userId=${user.id}`);
        const data = await response.json();

        // Allow access if user has any paid subscription (not free tier)
        const hasPaidAccess = data.subscriptionTier && data.subscriptionTier !== 'free';
        setHasAccess(hasPaidAccess);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/templates?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleFormChange = (data: PropertyFormData) => {
    setFormData(data);
  };

  const handleGenerate = async (settings: GenerationSettings) => {
    setGenerationSettings(settings);
    setIsGenerating(true);
    setGenerationError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyData: formData,
          platforms: settings.platforms,
          tone: settings.tone,
          length: settings.length,
          variations: settings.variations,
          seoKeywords: settings.seoKeywords,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate descriptions');
      }

      const data = await response.json();
      setGeneratedResults(data.results);
      setSuccessMessage(`Successfully generated ${data.metadata.totalGenerations} property descriptions!`);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

      // Save to history
      const historyItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        propertyTitle: formData.title || 'Untitled Property',
        prompt: `Generate ${settings.tone} property descriptions for ${settings.platforms.join(', ')}`,
        selectedVariant: selectedVariant[settings.platforms[0]] || 0, // Use selected variant or default to first
        tone: settings.tone,
        platforms: settings.platforms,
        results: data.results,
      };

      const existingHistory = JSON.parse(localStorage.getItem('property-description-history') || '[]');
      existingHistory.unshift(historyItem); // Add to beginning
      localStorage.setItem('property-description-history', JSON.stringify(existingHistory));
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectExample = (exampleData: Partial<PropertyFormData>) => {
    setFormData(prev => ({ ...prev, ...exampleData }));
  };

  const handleRefine = async (content: string, platform: string): Promise<string> => {
    try {
      const response = await fetch('/api/refine-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_instruction: `Refine this property description for ${platform}: ${content}`,
          context: 'property_description'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refine content');
      }

      const data = await response.json();
      return data.refined_prompt;
    } catch (error) {
      console.error('Refine error:', error);
      throw error;
    }
  };

  const handleRegenerate = async (platform: string): Promise<void> => {
    await handleGenerate({
      ...generationSettings,
      platforms: [platform] // Only regenerate for this platform
    });
  };

  const handleSaveTemplate = async (templateData: {
    name: string;
    content: string;
    category: string;
    platform: string;
    tone: string;
    length: string;
    userId: string;
  }) => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      // Refresh templates list
      fetchTemplates();
      // Could add a success toast here
      console.log('Template saved successfully:', data.template);
    } catch (error) {
      console.error('Error saving template:', error);
      // Could add an error toast here
    }
  };

  const handleSelectTemplate = (template: Template) => {
    // For templates with placeholders, set them up for auto-fill
    if (template.content.includes('{{')) {
      // This is a template with placeholders - could pre-fill form with template structure
      console.log('Selected template with placeholders:', template);
    } else {
      // Regular template - could extract basic info
      console.log('Selected regular template:', template);
    }
  };

  const handleUseForVideo = (content: string) => {
    // TODO: Implement video caption logic
    console.log('Use for video:', content);
  };

  const handleUseForFlyer = (content: string) => {
    // TODO: Implement flyer logic
    console.log('Use for flyer:', content);
  };

  const handleSelectVariant = (platform: string, variantIndex: number) => {
    setSelectedVariant(prev => ({
      ...prev,
      [platform]: variantIndex
    }));
  };

  return (
    <DashboardLayout>
      <motion.div
        className="bg-gradient-to-br from-slate-50 via-white to-blue-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Loading State */}
        {hasAccess === null ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-spin">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Loading...
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Checking your subscription status...
            </p>
          </motion.div>
        ) : hasAccess === false ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Premium Feature
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              AI Property Descriptions is available with paid subscriptions. Upgrade your plan to unlock intelligent property description generation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/payment"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                View Pricing Plans
              </a>
              <a
                href="/dashboard"
                className="border border-slate-300 text-slate-700 px-8 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Hero Section */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5"></div>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:pt-32">
                <motion.div
                  className="transition-all duration-1000"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <motion.div
                    className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl mb-8 shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </motion.div>
                  <motion.h1
                    className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    AI-Powered
                    <motion.span
                      className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                    >
                      Property Descriptions
                    </motion.span>
                  </motion.h1>

                  {/* Cost Display */}
                  <motion.div
                    className="inline-flex items-center bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-full px-4 py-2 mb-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">💚</span>
                      </div>
                      <span className="text-emerald-800 font-semibold text-sm">FREE with subscription</span>
                    </div>
                  </motion.div>
                  <motion.p
                    className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                  >
                    Create compelling property descriptions with advanced AI assistance. Generate professional listings for any platform.
                  </motion.p>
                </motion.div>
              </div>
            </section>

            <div className="container mx-auto px-4 py-8 max-w-7xl">

              {/* Navigation Tabs */}
              <div className="mb-12">
                <nav className="flex flex-wrap gap-2 sm:gap-1 bg-white/80 backdrop-blur-sm p-2 rounded-3xl shadow-xl border border-white/20">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex-1 min-w-0 py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                        activeTab === tab.id
                          ? 'bg-white text-slate-900 shadow-lg shadow-emerald-500/10 border border-emerald-200/50'
                          : 'text-slate-600 hover:text-slate-800 hover:bg-white/60 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                        {/* Tab Icons */}
                        {tab.id === 'new-listing' && (
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        )}
                        {tab.id === 'saved-templates' && (
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        {tab.id === 'history' && (
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {tab.id === 'settings' && (
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {/* Active indicator */}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 sm:w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main Content */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 transition-all duration-500 hover:shadow-2xl hover:scale-[1.01]">
                {activeTab === 'new-listing' && (
                  <div className="p-10">
                    {/* Generation Controls */}
                    <GenerationControls onGenerate={handleGenerate} />

                    {/* Success Message */}
                    {successMessage && (
                      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-emerald-800">
                              Success!
                            </h3>
                            <div className="mt-2 text-sm text-emerald-700">
                              {successMessage}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {generationError && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                              Generation Error
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                              {generationError}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Main Layout: Form on left, Preview and Examples on right */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                      {/* Left Column: Property Form */}
                      <div className="space-y-8">
                        <PropertyForm
                          onChange={handleFormChange}
                          templates={templates}
                          onLoadTemplate={handleSelectTemplate}
                        />
                      </div>

                      {/* Right Column: Live Preview and Quick Examples */}
                      <div className="space-y-8">
                        <div className="sticky top-8">
                          <LivePreview
                            formData={formData}
                            generationSettings={generationSettings}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Results Display */}
                    {(Object.keys(generatedResults).length > 0 || isGenerating) && (
                      <div className="mt-12 pt-8 border-t border-gray-200">
                        <ResultsDisplay
                          results={generatedResults}
                          generationSettings={generationSettings}
                          onRefine={handleRefine}
                          onRegenerate={handleRegenerate}
                          onSaveTemplate={handleSaveTemplate}
                          onUseForVideo={handleUseForVideo}
                          onUseForFlyer={handleUseForFlyer}
                          onSelectVariant={handleSelectVariant}
                          isLoading={isGenerating}
                          userId={userId}
                          propertyData={formData}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'saved-templates' && (
                  <SavedTemplates
                    userId={userId}
                    onSelectTemplate={handleSelectTemplate}
                  />
                )}

                {activeTab === 'history' && (
                  <History />
                )}

                {activeTab === 'settings' && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
                    <p className="text-gray-500">Configure your AI property description preferences.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}