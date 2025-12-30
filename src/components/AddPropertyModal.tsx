'use client';

import React, { useState, useEffect } from 'react';
import { Property, PROPERTY_TYPES } from '@/types/property';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingProperty?: Property | null;
}

export default function AddPropertyModal({
  isOpen,
  onClose,
  onSave,
  editingProperty
}: AddPropertyModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    listingPrice: '',
    propertyType: 'House' as Property['propertyType'],
    bedrooms: '',
    bathrooms: '',
    parking: '',
    size: '',
    description: '',
    photos: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingProperty) {
      setFormData({
        title: editingProperty.title,
        address: editingProperty.address,
        listingPrice: editingProperty.listingPrice.toString(),
        propertyType: editingProperty.propertyType,
        bedrooms: editingProperty.bedrooms.toString(),
        bathrooms: editingProperty.bathrooms.toString(),
        parking: editingProperty.parking.toString(),
        size: editingProperty.size.toString(),
        description: editingProperty.description,
        photos: editingProperty.photos
      });
    } else {
      setFormData({
        title: '',
        address: '',
        listingPrice: '',
        propertyType: 'House',
        bedrooms: '',
        bathrooms: '',
        parking: '',
        size: '',
        description: '',
        photos: []
      });
    }
    setErrors({});
  }, [editingProperty, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.listingPrice.trim()) {
      newErrors.listingPrice = 'Listing price is required';
    } else if (isNaN(Number(formData.listingPrice)) || Number(formData.listingPrice) <= 0) {
      newErrors.listingPrice = 'Please enter a valid price';
    }

    if (!formData.bedrooms.trim()) {
      newErrors.bedrooms = 'Bedrooms is required';
    } else if (isNaN(Number(formData.bedrooms)) || Number(formData.bedrooms) < 0) {
      newErrors.bedrooms = 'Please enter a valid number';
    }

    if (!formData.bathrooms.trim()) {
      newErrors.bathrooms = 'Bathrooms is required';
    } else if (isNaN(Number(formData.bathrooms)) || Number(formData.bathrooms) < 0) {
      newErrors.bathrooms = 'Please enter a valid number';
    }

    if (!formData.parking.trim()) {
      newErrors.parking = 'Parking is required';
    } else if (isNaN(Number(formData.parking)) || Number(formData.parking) < 0) {
      newErrors.parking = 'Please enter a valid number';
    }

    if (!formData.size.trim()) {
      newErrors.size = 'Size is required';
    } else if (isNaN(Number(formData.size)) || Number(formData.size) <= 0) {
      newErrors.size = 'Please enter a valid size';
    }

    if (formData.photos.length > 5) {
      newErrors.photos = 'Maximum 5 photos allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      const propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title.trim(),
        address: formData.address.trim(),
        listingPrice: Number(formData.listingPrice),
        propertyType: formData.propertyType,
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        parking: Number(formData.parking),
        size: Number(formData.size),
        description: formData.description.trim(),
        photos: formData.photos,
        linkedLeadIds: editingProperty?.linkedLeadIds || []
      };

      onSave(propertyData);
      onClose();
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoAdd = () => {
    const url = prompt('Enter photo URL:');
    if (url && url.trim()) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, url.trim()]
      }));
    }
  };

  const handlePhotoRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingProperty ? 'Update property information' : 'Enter property details to get started'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-8">
              {/* Title and Address Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2 group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Property Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 ${
                        errors.title
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                      }`}
                      placeholder="Beautiful family home in Sandton"
                    />
                  </div>
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.title}
                    </p>
                  )}
                </div>

                <div className="lg:col-span-2 group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Property Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 ${
                        errors.address
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                      }`}
                      placeholder="123 Main Street, Sandton, Johannesburg"
                    />
                  </div>
                  {errors.address && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Price and Type Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Listing Price (ZAR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 font-medium">R</span>
                    </div>
                    <input
                      type="number"
                      value={formData.listingPrice}
                      onChange={(e) => handleChange('listingPrice', e.target.value)}
                      className={`w-full pl-8 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 ${
                        errors.listingPrice
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                      }`}
                      placeholder="2500000"
                      min="0"
                    />
                  </div>
                  {errors.listingPrice && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.listingPrice}
                    </p>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Property Type
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => handleChange('propertyType', e.target.value as Property['propertyType'])}
                      className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 hover:border-gray-300 transition-all duration-200 appearance-none bg-white"
                    >
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Details Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Bedrooms <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => handleChange('bedrooms', e.target.value)}
                      className={`w-full pl-8 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-center ${
                        errors.bedrooms
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                      }`}
                      placeholder="3"
                      min="0"
                    />
                  </div>
                  {errors.bedrooms && (
                    <p className="text-red-600 text-xs mt-1 text-center">{errors.bedrooms}</p>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Bathrooms <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => handleChange('bathrooms', e.target.value)}
                      className={`w-full pl-8 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-center ${
                        errors.bathrooms
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                      }`}
                      placeholder="2"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  {errors.bathrooms && (
                    <p className="text-red-600 text-xs mt-1 text-center">{errors.bathrooms}</p>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Parking <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      value={formData.parking}
                      onChange={(e) => handleChange('parking', e.target.value)}
                      className={`w-full pl-8 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-center ${
                        errors.parking
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                      }`}
                      placeholder="2"
                      min="0"
                    />
                  </div>
                  {errors.parking && (
                    <p className="text-red-600 text-xs mt-1 text-center">{errors.parking}</p>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Size (m²) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      value={formData.size}
                      onChange={(e) => handleChange('size', e.target.value)}
                      className={`w-full pl-8 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-center ${
                        errors.size
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                      }`}
                      placeholder="150"
                      min="0"
                    />
                  </div>
                  {errors.size && (
                    <p className="text-red-600 text-xs mt-1 text-center">{errors.size}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Property Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 hover:border-gray-300 transition-all duration-200 resize-none"
                  placeholder="Describe the property features, amenities, and highlights..."
                />
              </div>

              {/* Photos */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Property Photos <span className="text-sm font-normal text-gray-500">(Max 5)</span>
                </label>
                <div className="space-y-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="url"
                        value={photo}
                        onChange={(e) => {
                          const newPhotos = [...formData.photos];
                          newPhotos[index] = e.target.value;
                          setFormData(prev => ({ ...prev, photos: newPhotos }));
                        }}
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                        placeholder="https://example.com/photo.jpg"
                      />
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Remove photo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {formData.photos.length < 5 && (
                    <button
                      type="button"
                      onClick={handlePhotoAdd}
                      className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-gray-600 group-hover:text-blue-600 font-medium transition-colors duration-200">Add Property Photo</span>
                      </div>
                    </button>
                  )}
                </div>
                {errors.photos && (
                  <p className="text-red-600 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.photos}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 font-medium order-2 sm:order-1 transform hover:scale-105"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 font-semibold order-1 sm:order-2 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingProperty ? 'Update Property' : 'Add Property'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}