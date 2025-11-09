'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  url?: string;
}

interface ProcessingResult {
  imageId: string;
  imageUrl: string;
  gpt4oResult?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export default function AiVideoMakerPage() {
  const { user } = useAuth();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    // Only allow single image upload
    if (uploadedImages.length > 0) {
      setError('You can only upload one image at a time. Please clear the current image first.');
      return;
    }

    if (files.length > 1) {
      setError('Please select only one image.');
      return;
    }

    const imageFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Each image must be less than 10MB');
        return false;
      }
      return true;
    });

    if (imageFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    // Upload images to Supabase storage
    const uploadedImagesData: UploadedImage[] = [];

    for (const file of imageFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from('video-assets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError('Failed to upload image. Please try again.');
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('video-assets')
          .getPublicUrl(fileName);

        // Record the upload in the database for cleanup tracking
        const { error: dbError } = await supabase
          .from('user_media')
          .insert({
            user_id: user?.id,
            media_type: 'image',
            file_name: fileName,
            file_url: publicUrl,
            file_size: file.size
          });

        if (dbError) {
          console.error('Database error:', dbError);
          // Don't fail the upload for database errors, but log it
        }

        uploadedImagesData.push({
          id: Date.now().toString() + Math.random().toString(36).substring(2),
          file,
          preview: URL.createObjectURL(file),
          url: publicUrl
        });
      } catch (err) {
        console.error('Error uploading file:', err);
        setError('Failed to upload image. Please try again.');
      }
    }

    setUploadedImages(prev => [...prev, ...uploadedImagesData]);
    setIsUploading(false);
  }, [uploadedImages.length, user?.id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // Clean up object URLs
      const removed = prev.find(img => img.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const resetImages = () => {
    // Clean up object URLs
    uploadedImages.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setUploadedImages([]);
    setProcessingResults([]);
    setError(null);
  };

  const processImagesSequentially = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload an image first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Initialize processing result for single image
    const initialResult: ProcessingResult = {
      imageId: uploadedImages[0].id,
      imageUrl: uploadedImages[0].url || uploadedImages[0].preview,
      status: 'processing'
    };

    setProcessingResults([initialResult]);

    try {
      // Call GPT-4o API for the single image
      const result = await processImageWithGPT4o(uploadedImages[0]);

      // Update result to completed
      setProcessingResults([{
        ...initialResult,
        status: 'completed',
        gpt4oResult: result
      }]);

    } catch (error) {
      console.error('Error processing image:', error);

      // Update result with error
      setProcessingResults([{
        ...initialResult,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed'
      }]);
    }

    setIsProcessing(false);
  };

  const processImageWithGPT4o = async (image: UploadedImage): Promise<string> => {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Call GPT-4o API directly (simplified version)
    const response = await fetch('/api/video-generate/camera-movements', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: image.url
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process image');
    }

    const data = await response.json();
    return data.cameraMovement;
  };

  if (!user) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Video Maker</h1>
            <p className="text-slate-600">Upload property images to create stunning AI-generated videos</p>
          </div>

          {/* Upload Section */}
          <div className="space-y-6">
            {/* Upload Area */}
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Property Images</h3>
              <p className="text-slate-600 mb-4">
                Drag and drop an image, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadedImages.length >= 1 || isUploading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Choose Image'}
              </button>
              <p className="text-sm text-slate-500 mt-2">
                {uploadedImages.length}/1 image uploaded
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Uploaded Images Display */}
            {uploadedImages.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Uploaded Images</h3>
                  <button
                    onClick={resetImages}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Clear All
                  </button>
                </div>

                {/* Images Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  {uploadedImages.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Supabase URLs Display */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-md font-semibold text-slate-900 mb-3">Supabase Public URLs:</h4>
                  <div className="space-y-2">
                    {uploadedImages.map((image, index) => (
                      <div key={image.id} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-600 min-w-[60px]">
                          Image {index + 1}:
                        </span>
                        <code className="flex-1 text-xs bg-slate-100 p-2 rounded border font-mono break-all">
                          {image.url}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button - Show only after image is uploaded */}
            {uploadedImages.length === 1 && uploadedImages[0].url && (
              <div className="flex justify-center">
                <button
                  onClick={processImagesSequentially}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Analyzing Image...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>Analyze Image</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Image and Result Display - Side by Side */}
            {processingResults.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Image Analysis Result</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Image Box */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-700">Uploaded Image</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <img
                        src={processingResults[0].imageUrl}
                        alt="Analyzed image"
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  </div>

                  {/* GPT-4o Result Box */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-slate-700">GPT-4o Camera Movement Analysis</h4>
                      {processingResults[0].status === 'processing' && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                      {processingResults[0].status === 'completed' && (
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {processingResults[0].status === 'failed' && (
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-lg p-4 min-h-64">
                      {processingResults[0].status === 'processing' ? (
                        <div className="text-blue-600 italic flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>Analyzing image with GPT-4o...</span>
                        </div>
                      ) : processingResults[0].status === 'completed' ? (
                        <div className="text-slate-900 whitespace-pre-wrap text-sm leading-relaxed">
                          {processingResults[0].gpt4oResult}
                        </div>
                      ) : processingResults[0].status === 'failed' ? (
                        <div className="text-red-600 text-sm">
                          <strong>Error:</strong> {processingResults[0].error}
                        </div>
                      ) : (
                        <div className="text-slate-500 italic text-sm">Waiting for analysis...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}