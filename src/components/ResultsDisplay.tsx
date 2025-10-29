'use client';

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface GeneratedResult {
  id: string;
  platform: string;
  tone: string;
  length: string;
  content: string;
  isFavorite: boolean;
  timestamp: Date;
}

interface TemplateData {
  name: string;
  content: string;
  category: string;
  platform: string;
  tone: string;
  length: string;
  isShared: boolean;
  userId: string;
}

interface ResultsDisplayProps {
  results: { [platform: string]: string[] };
  generationSettings: {
    platforms: string[];
    tone: string;
    length: string;
    variations: number;
    seoKeywords?: string;
  };
  onRefine: (content: string, platform: string) => Promise<string>;
  onRegenerate: (platform: string) => Promise<void>;
  onSaveTemplate: (templateData: TemplateData) => void;
  onUseForVideo: (content: string) => void;
  onUseForFlyer: (content: string) => void;
  onSelectVariant?: (platform: string, variantIndex: number) => void;
  isLoading?: boolean;
  userId?: string;
  propertyData?: {
    title?: string;
    address?: string;
    suburb?: string;
    city?: string;
    price?: string;
    beds?: string;
    baths?: string;
    garages?: string;
    keyFeatures?: string[];
  };
}

export default function ResultsDisplay({
  results,
  generationSettings,
  onRefine,
  onRegenerate,
  onSaveTemplate,
  onUseForVideo,
  onUseForFlyer,
  onSelectVariant,
  isLoading = false,
  userId,
  propertyData
}: ResultsDisplayProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [regeneratingPlatforms, setRegeneratingPlatforms] = useState<Set<string>>(new Set());
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<GeneratedResult | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'residential',
    isShared: false
  });
  const [showScheduleModal, setShowScheduleModal] = useState<GeneratedResult | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    platform: 'facebook',
    message: ''
  });
  const [savingToCRM, setSavingToCRM] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const shareViaWhatsApp = (content: string, platform: string) => {
    const message = `Check out this ${platform} property description:\n\n${content}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = (content: string, platform: string) => {
    const subject = `Property Description for ${platform}`;
    const body = `Hi,\n\nHere's a property description I generated:\n\n${content}\n\nBest regards`;
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const emailUrl = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
    window.open(emailUrl, '_blank');
  };

  const saveToCRM = async (result: GeneratedResult) => {
    if (!propertyData || !userId) return;

    setSavingToCRM(prev => new Set(prev).add(result.id));

    try {
      // Save to Supabase - assuming a projects/listings table exists
      const { data, error } = await supabase
        .from('projects') // or 'listings' - adjust based on your schema
        .insert({
          user_id: userId,
          title: propertyData.title || 'Untitled Property',
          description: result.content,
          platform: result.platform,
          tone: result.tone,
          length: result.length,
          address: propertyData.address,
          suburb: propertyData.suburb,
          city: propertyData.city,
          price: propertyData.price,
          beds: propertyData.beds,
          baths: propertyData.baths,
          garages: propertyData.garages,
          key_features: propertyData.keyFeatures,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      showToast('Successfully saved to CRM!', 'success');
      console.log('Saved to CRM:', data);
    } catch (error) {
      console.error('Error saving to CRM:', error);
      showToast('Failed to save to CRM. Please try again.', 'error');
    } finally {
      setSavingToCRM(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.id);
        return newSet;
      });
    }
  };

  const handleSchedulePost = (result: GeneratedResult) => {
    setShowScheduleModal(result);
    setScheduleForm({
      date: '',
      time: '',
      platform: result.platform.toLowerCase(),
      message: result.content
    });
  };

  const schedulePost = async () => {
    if (!showScheduleModal) return;

    try {
      // Framework ready for calendar/posting service integration
      const scheduledDateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`);

      // TODO: Integrate with calendar/posting service
      console.log('Scheduling post:', {
        content: scheduleForm.message,
        platform: scheduleForm.platform,
        scheduledFor: scheduledDateTime,
        propertyData
      });

      // For now, just log - integrate with actual scheduling service
      showToast(`Post scheduled for ${scheduledDateTime.toLocaleString()}`, 'success');

      setShowScheduleModal(null);
    } catch (error) {
      console.error('Error scheduling post:', error);
      showToast('Failed to schedule post. Please try again.', 'error');
    }
  };

  const downloadAsTxt = (content: string, platform: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-description.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAll = () => {
    const allContent = Object.entries(results)
      .map(([platform, descriptions]) =>
        descriptions.map((desc, index) =>
          `=== ${platform} - Variation ${index + 1} ===\n${desc}\n\n`
        ).join('')
      )
      .join('');

    const blob = new Blob([allContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-descriptions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startEditing = (id: string, content: string) => {
    setEditingId(id);
    setEditingContent(content);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const refined = await onRefine(editingContent, editingId.split('-')[0]);
      setEditingContent(refined);
    } catch (error) {
      console.error('Failed to refine content:', error);
    } finally {
      setRefiningId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
    setRefiningId(null);
  };

  const handleRegenerate = async (platform: string) => {
    setRegeneratingPlatforms(prev => new Set(prev).add(platform));
    try {
      await onRegenerate(platform);
    } finally {
      setRegeneratingPlatforms(prev => {
        const newSet = new Set(prev);
        newSet.delete(platform);
        return newSet;
      });
    }
  };

  const handleSaveTemplateClick = (result: GeneratedResult) => {
    setShowSaveTemplateModal(result);
    setTemplateForm({
      name: `${result.platform} ${result.tone} Template`,
      category: 'residential',
      isShared: false
    });
  };

  const handleSaveTemplate = async () => {
    if (!showSaveTemplateModal || !userId) return;

    try {
      const templateData: TemplateData = {
        name: templateForm.name,
        content: showSaveTemplateModal.content,
        category: templateForm.category,
        platform: showSaveTemplateModal.platform,
        tone: showSaveTemplateModal.tone,
        length: showSaveTemplateModal.length,
        isShared: templateForm.isShared,
        userId: userId
      };

      await onSaveTemplate(templateData);
      showToast('Template saved successfully!', 'success');
      setShowSaveTemplateModal(null);
      setTemplateForm({ name: '', category: 'residential', isShared: false });
    } catch (error) {
      console.error('Error saving template:', error);
      showToast('Failed to save template. Please try again.', 'error');
    }
  };

  const allResults: GeneratedResult[] = Object.entries(results).flatMap(([platform, descriptions]) =>
    descriptions.map((content, index) => ({
      id: `${platform}-${index}`,
      platform,
      tone: generationSettings.tone,
      length: generationSettings.length,
      content,
      isFavorite: false, // This would come from saved state
      timestamp: new Date()
    }))
  );

  const handleSelectVariant = (platform: string, variantIndex: number) => {
    if (onSelectVariant) {
      onSelectVariant(platform, variantIndex);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>

        {/* Results Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
              {/* Header Skeleton */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-12"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-14"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Content Skeleton */}
              <div className="mb-4 space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-3 bg-gray-200 rounded animate-pulse"
                    style={{ width: `${Math.random() * 30 + 70}%` }}
                  />
                ))}
              </div>

              {/* Actions Skeleton */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-6 bg-gray-200 rounded animate-pulse w-12"></div>
                ))}
              </div>

              {/* Integration Buttons Skeleton */}
              <div className="space-y-2 mt-3 pt-3 border-t">
                <div className="flex gap-2">
                  <div className="flex-1 h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allResults.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center text-gray-500">
          No results yet. Generate some descriptions to see them here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          toastType === 'success' ? 'bg-green-500' :
          toastType === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated Property Descriptions</h2>
        <p className="text-gray-600">Here are your AI-generated property descriptions</p>
      </div>

      {/* Full Results Display */}
      <div className="space-y-8">
        {allResults.map((result, index) => (
          <div key={result.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Header with Platform Info */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                    {result.platform}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    {result.tone}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    {result.length}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  Variation {parseInt(result.id.split('-')[1]) + 1}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => copyToClipboard(result.content)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => startEditing(result.id, result.content)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              {editingId === result.id ? (
                <div className="space-y-4">
                  <textarea
                    ref={textareaRef}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg text-base min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Edit your description..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={saveEdit}
                      disabled={refiningId === result.id}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
                    >
                      {refiningId === result.id ? 'Refining with AI...' : 'Refine with AI'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="prose prose-gray max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 text-base leading-relaxed">
                      {result.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save as Template</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter template name..."
                />
              </div>

              <div>
                <label htmlFor="template-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="template-category"
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="luxury">Luxury</option>
                  <option value="budget">Budget</option>
                  <option value="investment">Investment</option>
                  <option value="rental">Rental</option>
                  <option value="sale">Sale</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="template-shared"
                  checked={templateForm.isShared}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, isShared: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="template-shared" className="ml-2 block text-sm text-gray-700">
                  Share with team
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveTemplate}
                disabled={!templateForm.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Template
              </button>
              <button
                onClick={() => setShowSaveTemplateModal(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Post Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Post</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="schedule-date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="schedule-time" className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  id="schedule-time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="schedule-platform" className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  id="schedule-platform"
                  value={scheduleForm.platform}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div>
                <label htmlFor="schedule-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  id="schedule-message"
                  value={scheduleForm.message}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Add additional message or leave as is..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={schedulePost}
                disabled={!scheduleForm.date || !scheduleForm.time}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Schedule Post
              </button>
              <button
                onClick={() => setShowScheduleModal(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}