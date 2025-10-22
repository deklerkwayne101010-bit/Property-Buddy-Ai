'use client';

import { useState, useCallback, useMemo } from 'react';

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

interface PropertyFormProps {
  onChange: (data: PropertyFormData) => void;
  templates?: Template[];
  onLoadTemplate?: (template: Template) => void;
}

export default function PropertyForm({ onChange, templates = [], onLoadTemplate }: PropertyFormProps) {
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

  const [errors, setErrors] = useState<Partial<PropertyFormData>>({});
  const [newFeature, setNewFeature] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const languages = useMemo(() => ['English', 'Afrikaans', 'Zulu'], []);

  const validateField = (field: keyof PropertyFormData, value: string | string[] | File[]): string => {
    switch (field) {
      case 'title':
        if (typeof value !== 'string' || !value.trim()) return 'Title is required';
        if (value.length < 10) return 'Title must be at least 10 characters';
        break;
      case 'shortSummary':
        if (typeof value !== 'string' || !value.trim()) return 'Short summary is required';
        if (value.length < 20) return 'Short summary must be at least 20 characters';
        break;
      case 'address':
        if (typeof value !== 'string' || !value.trim()) return 'Address is required';
        break;
      case 'suburb':
        if (typeof value !== 'string' || !value.trim()) return 'Suburb is required';
        break;
      case 'city':
        if (typeof value !== 'string' || !value.trim()) return 'City is required';
        break;
      case 'price':
        if (typeof value !== 'string' || !value) return 'Price is required';
        const priceNum = parseInt(value);
        if (isNaN(priceNum) || priceNum <= 0) return 'Please enter a valid price';
        break;
      case 'beds':
        if (typeof value !== 'string' || !value) return 'Number of bedrooms is required';
        const bedsNum = parseInt(value);
        if (isNaN(bedsNum) || bedsNum < 0) return 'Please enter a valid number of bedrooms';
        break;
      case 'baths':
        if (typeof value !== 'string' || !value) return 'Number of bathrooms is required';
        const bathsNum = parseInt(value);
        if (isNaN(bathsNum) || bathsNum < 0) return 'Please enter a valid number of bathrooms';
        break;
      case 'garages':
        if (typeof value === 'string' && value) {
          const garagesNum = parseInt(value);
          if (isNaN(garagesNum) || garagesNum < 0) return 'Please enter a valid number of garages';
        }
        break;
    }
    return '';
  };

  const updateFormData = useCallback((field: keyof PropertyFormData, value: string | string[] | File[]) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);

    // Validate field
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));

    onChange(updatedData);
  }, [formData, onChange]);

  const addFeature = useCallback(() => {
    if (newFeature.trim() && !formData.keyFeatures.includes(newFeature.trim())) {
      const updatedFeatures = [...formData.keyFeatures, newFeature.trim()];
      updateFormData('keyFeatures', updatedFeatures);
      setNewFeature('');
    }
  }, [newFeature, formData.keyFeatures, updateFormData]);

  const removeFeature = useCallback((feature: string) => {
    const updatedFeatures = formData.keyFeatures.filter(f => f !== feature);
    updateFormData('keyFeatures', updatedFeatures);
  }, [formData.keyFeatures, updateFormData]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not a valid image file.`);
        return false;
      }
      // Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      updateFormData('photos', [...formData.photos, ...validFiles]);
    }

    // Reset input
    e.target.value = '';
  }, [formData.photos, updateFormData]);

  const removePhoto = useCallback((index: number) => {
    const updatedPhotos = formData.photos.filter((_, i) => i !== index);
    updateFormData('photos', updatedPhotos);
  }, [formData.photos, updateFormData]);

  const loadTemplate = useCallback((template: Template) => {
    // Extract property data from template content using placeholders
    const content = template.content;
    const extractedData: Partial<PropertyFormData> = {};

    // Try to extract common placeholders
    const priceMatch = content.match(/\{\{price\}\}|\{\{Price\}\}/);
    const bedsMatch = content.match(/\{\{beds?\}\}|\{\{Beds?\}\}/);
    const suburbMatch = content.match(/\{\{suburb\}\}|\{\{Suburb\}\}/);

    // If template has placeholders, pre-fill with template content
    if (priceMatch || bedsMatch || suburbMatch) {
      // This is a template with placeholders - let the parent handle it
      if (onLoadTemplate) {
        onLoadTemplate(template);
      }
    } else {
      // This is a regular template - try to extract data
      // For now, just set the title and summary if they can be inferred
      if (template.name) {
        extractedData.title = template.name;
      }
      if (template.content && template.content.length < 200) {
        extractedData.shortSummary = template.content;
      }

      // Update form with extracted data
      if (Object.keys(extractedData).length > 0) {
        const updatedData = { ...formData, ...extractedData };
        setFormData(updatedData);
        onChange(updatedData);
      }
    }

    setShowTemplateSelector(false);
  }, [formData, onChange, onLoadTemplate]);

  return (
    <div className="space-y-8">
      {/* Template Selector */}
      {templates.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Quick Start with Template</h3>
                <p className="text-sm text-blue-700">Load a saved template to speed up your property listing</p>
              </div>
            </div>
            <button
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <svg className={`w-4 h-4 transition-transform duration-200 ${showTemplateSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>{showTemplateSelector ? 'Hide Templates' : 'Browse Templates'}</span>
              </div>
            </button>
          </div>

          {showTemplateSelector && (
            <div className="mt-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
              {templates.slice(0, 5).map((template, index) => (
                <div
                  key={template.id}
                  className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                  onClick={() => loadTemplate(template)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">{template.name}</div>
                    <div className="text-sm text-gray-600 line-clamp-2 mt-1 group-hover:text-gray-700">{template.content}</div>
                    <div className="flex gap-2 mt-3">
                      <span className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs font-medium rounded-full border border-gray-300">
                        {template.category}
                      </span>
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 text-xs font-medium rounded-full border border-blue-300">
                        {template.platform}
                      </span>
                      {template.is_shared && (
                        <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-700 text-xs font-medium rounded-full border border-green-300">
                          Team
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <div className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                      Use Template
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <svg className="w-4 h-4 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
              {templates.length > 5 && (
                <div className="text-center py-3">
                  <div className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-600 text-sm font-medium rounded-full border border-gray-200">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    And {templates.length - 5} more templates available
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <div className="group">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Property Title *
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateFormData('title', e.target.value)}
            placeholder="e.g., Modern 3-Bedroom Apartment in Sandton"
            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.title
                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-300'
            }`}
            required
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              formData.title.length > 0 ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
          </div>
        </div>
        {errors.title && (
          <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.title}
          </div>
        )}
      </div>

      {/* Short Summary */}
      <div className="group">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Short Summary *
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.shortSummary}
            onChange={(e) => updateFormData('shortSummary', e.target.value)}
            placeholder="One-liner description of the property"
            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.shortSummary
                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                : 'border-gray-200 focus:ring-green-500 focus:border-green-500 bg-white hover:border-green-300'
            }`}
            required
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              formData.shortSummary.length > 0 ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
          </div>
        </div>
        {errors.shortSummary && (
          <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.shortSummary}
          </div>
        )}
      </div>

      {/* Address, Suburb, City */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-gray-200/50">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Property Location</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => updateFormData('address', e.target.value)}
              placeholder="123 Main Street"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.address
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-300'
              }`}
              required
            />
            {errors.address && (
              <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.address}
              </div>
            )}
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Suburb *</label>
            <input
              type="text"
              value={formData.suburb}
              onChange={(e) => updateFormData('suburb', e.target.value)}
              placeholder="Sandton"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.suburb
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-300'
              }`}
              required
            />
            {errors.suburb && (
              <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.suburb}
              </div>
            )}
          </div>
          <div className="group sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateFormData('city', e.target.value)}
              placeholder="Johannesburg"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.city
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-300'
              }`}
              required
            />
            {errors.city && (
              <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.city}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="group">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Property Price (R) *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <span className="text-gray-500 font-medium">R</span>
          </div>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => updateFormData('price', e.target.value)}
            placeholder="2500000"
            className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.price
                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-white hover:border-emerald-300'
            }`}
            required
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              formData.price && parseInt(formData.price) > 0 ? 'bg-emerald-500' : 'bg-gray-300'
            }`}></div>
          </div>
        </div>
        {errors.price && (
          <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.price}
          </div>
        )}
      </div>

      {/* Beds, Baths, Garages */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              Bedrooms *
            </label>
            <input
              type="number"
              value={formData.beds}
              onChange={(e) => updateFormData('beds', e.target.value)}
              placeholder="3"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.beds
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-300'
              }`}
              required
            />
            {errors.beds && (
              <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.beds}
              </div>
            )}
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Bathrooms *
            </label>
            <input
              type="number"
              value={formData.baths}
              onChange={(e) => updateFormData('baths', e.target.value)}
              placeholder="2"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.baths
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-200 focus:ring-cyan-500 focus:border-cyan-500 bg-white hover:border-cyan-300'
              }`}
              required
            />
            {errors.baths && (
              <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.baths}
              </div>
            )}
          </div>
          <div className="group sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Garages
            </label>
            <input
              type="number"
              value={formData.garages}
              onChange={(e) => updateFormData('garages', e.target.value)}
              placeholder="1"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.garages
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-200 focus:ring-gray-500 focus:border-gray-500 bg-white hover:border-gray-300'
              }`}
            />
            {errors.garages && (
              <div className="mt-2 flex items-center text-sm text-red-600 animate-in slide-in-from-top-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m.01 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.garages}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Key Features</h3>
        </div>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                placeholder="Add a feature (e.g., Pool, Garden, Modern Kitchen)"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 hover:border-purple-300"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  newFeature.trim().length > 0 ? 'bg-purple-500' : 'bg-gray-300'
                }`}></div>
              </div>
            </div>
            <button
              onClick={addFeature}
              disabled={!newFeature.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add</span>
              </div>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {formData.keyFeatures.map((feature, index) => (
              <span
                key={index}
                className="group inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200 hover:border-purple-300 transition-all duration-200 transform hover:scale-105 cursor-pointer"
              >
                <span className="mr-2">{feature}</span>
                <button
                  onClick={() => removeFeature(feature)}
                  className="text-purple-600 hover:text-purple-800 transition-colors opacity-70 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          {formData.keyFeatures.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className="text-sm">No features added yet. Add some highlights to make your property stand out!</p>
            </div>
          )}
        </div>
      </div>


      {/* Language Selector */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200/50">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Language</h3>
            <p className="text-sm text-gray-600">Choose the language for your property descriptions</p>
          </div>
        </div>
        <div className="relative">
          <select
            value={formData.language}
            onChange={(e) => updateFormData('language', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 hover:border-teal-300 appearance-none"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className="mt-3 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            formData.language === 'English' ? 'bg-green-500' :
            formData.language === 'Afrikaans' ? 'bg-orange-500' : 'bg-blue-500'
          }`}></div>
          <span className="text-sm text-gray-600">
            Selected: <span className="font-medium text-gray-900">{formData.language}</span>
          </span>
        </div>
      </div>
    </div>
  );
}