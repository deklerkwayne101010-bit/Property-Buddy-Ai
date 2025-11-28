'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '../../../components/DashboardLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { supabase } from '../../../lib/supabase';

interface PropertyImage {
  id: string;
  filename: string;
  original_filename: string;
  url: string;
  uploaded_at: string;
  file_size: number;
}

interface Property {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const PropertyDetailPage: React.FC = () => {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPropertyData();
  }, [propertyId]);

  const fetchPropertyData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        setLoading(false);
        return;
      }

      // Fetch property details
      const propertyResponse = await fetch('/api/properties', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (propertyResponse.ok) {
        const propertyData = await propertyResponse.json();
        const foundProperty = propertyData.properties.find((p: Property) => p.id === propertyId);
        if (foundProperty) {
          setProperty(foundProperty);
        }
      }

      // Fetch property images
      const imagesResponse = await fetch(`/api/properties/${propertyId}/images`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        setImages(imagesData.images);
      }
    } catch (error) {
      console.error('Error fetching property data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Authentication required');
        setUploading(false);
        return;
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
          const response = await fetch(`/api/properties/${propertyId}/images`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            return data.image;
          } else {
            const error = await response.json();
            console.error('Upload failed:', error.error);
            return null;
          }
        } catch (error) {
          console.error('Upload error:', error);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result !== null);

      if (successfulUploads.length > 0) {
        setImages(prev => [...successfulUploads, ...prev]);
      }

      if (successfulUploads.length !== files.length) {
        alert(`${successfulUploads.length} of ${files.length} images uploaded successfully.`);
      }
    } catch (error) {
      console.error('Error during upload:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
  };

  const deleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Note: We'll need to add a DELETE endpoint for individual images
      // For now, this is a placeholder
      alert('Delete functionality will be implemented with the API endpoint');
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading property...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!property) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
            <p className="text-gray-600">The property you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
              <p className="text-gray-600 mt-2">{images.length} photo{images.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => window.location.href = '/properties'}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              ← Back to Properties
            </button>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center mb-8 transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Uploading images...</p>
              </div>
            ) : (
              <>
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Property Images</h3>
                <p className="text-gray-500 mb-4">
                  Drag and drop images here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    browse files
                  </button>
                </p>
                <p className="text-sm text-gray-400">PNG, JPG, GIF up to 10MB each</p>
              </>
            )}
          </div>

          {/* Images Grid */}
          {images.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Images Yet</h3>
              <p className="text-gray-500">Upload some images to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {images.map((image) => (
                <div key={image.id} className="bg-white rounded-lg shadow-md border overflow-hidden">
                  <div className="relative group">
                    <img
                      src={image.url}
                      alt={image.original_filename}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.href = `/photo-editor?property=${propertyId}&image=${image.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteImage(image.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate" title={image.original_filename}>
                      {image.original_filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(image.file_size || 0)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(image.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default PropertyDetailPage;
