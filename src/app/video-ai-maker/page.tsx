'use client';

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface UploadedImage {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
}

interface AnalyzedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  isEditing?: boolean;
}

interface VideoResult {
  index: number;
  imageUrl: string;
  prompt: string;
  videoUrl: string;
}

export default function VideoAiMaker() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [analyzedImages, setAnalyzedImages] = useState<AnalyzedImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'analyzed' | 'generating' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start with empty uploaded images list for current session only
  // No longer loading all user images on mount - only session uploads are shown

  const handleImageUpload = async (file: File) => {
    if (!user) {
      alert('You must be logged in to upload images.');
      return;
    }

    if (uploadedImages.length >= 10) {
      setError('You can only upload up to 10 images. Please delete some images first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const fileName = `video-${timestamp}-${file.name}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('video-assets')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('video-assets')
        .getPublicUrl(fileName);

      // Store metadata in user_media table for user-specific filtering
      const { error: mediaError } = await supabase
        .from('user_media')
        .insert({
          user_id: user.id,
          media_type: 'image',
          file_name: fileName,
          file_url: publicUrl,
          file_size: file.size
        });

      if (mediaError) {
        console.error('Error storing media metadata:', mediaError);
        // Don't fail the upload, just log the error
      }

      // Add the uploaded image to the current session list
      const uploadedImage: UploadedImage = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: publicUrl,
        filename: fileName,
        uploadedAt: new Date().toISOString()
      };

      setUploadedImages(prev => [...prev, uploadedImage]);

      setIsUploading(false);
      alert('Image uploaded successfully! You can now analyze all your images with AI.');
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        handleImageUpload(file);
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        handleImageUpload(file);
      }
    }
  };

  const selectImage = (image: UploadedImage) => {
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.id === image.id);
      if (isSelected) {
        // Remove from selection
        return prev.filter(img => img.id !== image.id);
      } else {
        // Add to selection (max 10)
        if (prev.length >= 10) {
          alert('You can select a maximum of 10 images for video generation.');
          return prev;
        }
        return [...prev, image];
      }
    });
  };

  const analyzeSelectedImages = async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCurrentStep('analyzing');
    setAnalyzedImages([]);

    try {
      const analyzed: AnalyzedImage[] = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];

        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: image.url
          }),
        });

        // Always check response validity before parsing JSON
        if (!response.ok) {
          const text = await response.text();
          console.error("Image analysis error response:", text);
          throw new Error(`Request failed: ${response.status} - ${text}`);
        }

        // Safe to parse JSON now that we know response is ok
        const data = await response.json();
        console.log('Analyze image response:', data);
        console.log('Analysis field:', data.analysis);
        console.log('Analysis type:', typeof data.analysis);

        if (!data.analysis || typeof data.analysis !== 'string') {
          throw new Error(`Invalid analysis response for image ${i + 1}: ${JSON.stringify(data)}`);
        }

        analyzed.push({
          id: image.id,
          imageUrl: image.url,
          prompt: data.analysis
        });
      }

      setAnalyzedImages(analyzed);
      setCurrentStep('analyzed');
    } catch (error) {
      console.error('Error analyzing images:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze images');
      setCurrentStep('upload');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateVideos = async () => {
    if (analyzedImages.length === 0) {
      setError('Please analyze images first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentStep('generating');
    setGeneratedVideos([]);

    try {
      const videos: VideoResult[] = [];

      for (let i = 0; i < analyzedImages.length; i++) {
        const analyzedImage = analyzedImages[i];

        console.log('Generating video for image', i + 1);
        console.log('Analyzed image:', analyzedImage);
        console.log('Prompt:', analyzedImage.prompt);
        console.log('Prompt type:', typeof analyzedImage.prompt);
        console.log('Prompt length:', analyzedImage.prompt ? analyzedImage.prompt.length : 'N/A');

        console.log(`Starting video generation for image ${i + 1}...`);
        console.log('Using prompt:', analyzedImage.prompt);

        // Start video generation (async)
        const startResponse = await fetch('/api/video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: "standard",
            prompt: analyzedImage.prompt,
            duration: 5,
            start_image: analyzedImage.imageUrl,
            negative_prompt: ""
          }),
        });

        // Always check response validity before parsing JSON
        if (!startResponse.ok) {
          const text = await startResponse.text();
          console.error("Video generation start error response:", text);
          throw new Error(`Request failed: ${startResponse.status} - ${text}`);
        }

        // Safe to parse JSON now that we know response is ok
        const startData = await startResponse.json();
        const predictionId = startData.predictionId;

        console.log(`Video generation started for image ${i + 1}, prediction ID: ${predictionId}`);

        // Poll for completion
        let videoUrl = null;
        let attempts = 0;
        const maxAttempts = 180; // 3 minutes with 1-second intervals

        while (!videoUrl && attempts < maxAttempts) {
          attempts++;
          console.log(`Polling attempt ${attempts}/${maxAttempts} for image ${i + 1}...`);

          try {
            const statusResponse = await fetch(`/api/video/status?id=${predictionId}`);

            if (!statusResponse.ok) {
              const text = await statusResponse.text();
              console.error("Status check error response:", text);
              throw new Error(`Status check failed: ${statusResponse.status} - ${text}`);
            }

            const statusData = await statusResponse.json();

            if (statusData.status === 'succeeded') {
              videoUrl = statusData.videoUrl;
              console.log(`Video generation completed for image ${i + 1}!`);
              break;
            } else if (statusData.status === 'failed') {
              throw new Error(`Video generation failed for image ${i + 1}: ${statusData.error}`);
            } else {
              // Still processing, wait 30 seconds before next check
              await new Promise(resolve => setTimeout(resolve, 30000));
            }
          } catch (pollError) {
            console.error(`Polling error for image ${i + 1}:`, pollError);
            // Continue polling unless it's a critical error
            if (attempts >= maxAttempts) {
              throw pollError;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (!videoUrl) {
          throw new Error(`Video generation timed out for image ${i + 1} after ${maxAttempts * 2} seconds`);
        }

        videos.push({
          index: i,
          imageUrl: analyzedImage.imageUrl,
          prompt: analyzedImage.prompt,
          videoUrl: videoUrl
        });
      }

      setGeneratedVideos(videos);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error generating videos:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate videos');
      setCurrentStep('analyzed');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetAll = () => {
    setAnalyzedImages([]);
    setGeneratedVideos([]);
    setError(null);
    setCurrentStep('upload');
  };

  const startEditingPrompt = (id: string) => {
    setAnalyzedImages(prev => prev.map(img =>
      img.id === id ? { ...img, isEditing: true } : img
    ));
  };

  const savePromptEdit = (id: string, newPrompt: string) => {
    setAnalyzedImages(prev => prev.map(img =>
      img.id === id ? { ...img, prompt: newPrompt, isEditing: false } : img
    ));
  };

  const cancelPromptEdit = (id: string) => {
    setAnalyzedImages(prev => prev.map(img =>
      img.id === id ? { ...img, isEditing: false } : img
    ));
  };

  const deleteImage = async (image: UploadedImage) => {
    if (!user) {
      alert('You must be logged in to delete images.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${image.filename}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(image.id);
    try {
      console.log('Attempting to delete image:', image.id, 'for user:', user.id);

      // First, get the file path from user_media to delete from storage
      const { data: mediaRecord, error: fetchError } = await supabase
        .from('user_media')
        .select('file_name')
        .eq('id', image.id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching media record:', fetchError);
        throw new Error('Failed to find image record');
      }

      // Delete from Supabase storage
      const { error: storageError } = await supabase.storage
        .from('video-assets')
        .remove([mediaRecord.file_name]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from user_media table
      const { error: mediaError } = await supabase
        .from('user_media')
        .delete()
        .eq('id', image.id)
        .eq('user_id', user.id); // Extra security check

      if (mediaError) {
        console.error('Media delete error:', mediaError);
        throw mediaError;
      }

      // Images are added to the current session list automatically

      // Clear current selection if it was the deleted image
      setSelectedImages(prev => prev.filter(img => img.id !== image.id));

      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="bg-gradient-to-br from-slate-50 via-white to-blue-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-blue-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:pt-32">
          <motion.div
            className="transition-all duration-1000"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-500 to-blue-600 rounded-xl mb-8 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </motion.div>
            <motion.h1
              className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              AI Image
              <motion.span
                className="block bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Analyzer
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Upload an image and let AI analyze it for you with advanced GPT-4o vision capabilities.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-7xl">

        <div className="grid gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Upload Section Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-slate-500/20 hover:scale-[1.02]">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 sm:px-8 py-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <svg className="w-6 h-6 mr-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Your Image
              </h2>
              <p className="text-sm text-slate-600 mt-1">Drag and drop or click to select an image file</p>
            </div>

            <div
              className="relative p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/50 group"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png"
                className="hidden"
              />

              {uploadedImages.length > 0 ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
                    <p className="text-slate-700 font-medium">{uploadedImages.length} image(s) uploaded successfully!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-slate-100 to-blue-100 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 transition-transform duration-300 group-hover:scale-110" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl sm:text-2xl font-semibold text-slate-800">Drop your image here</p>
                    <p className="text-slate-600 text-sm sm:text-base">or click to browse your files</p>
                    <div className="flex items-center justify-center space-x-3 sm:space-x-4 mt-4">
                      <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm bg-slate-100 text-slate-800">JPEG</span>
                      <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">PNG</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Gallery Section Card */}
          {uploadedImages.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20 hover:scale-[1.02]">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 sm:px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Your Personal Gallery
                </h2>
                <p className="text-sm text-slate-600 mt-1">Only you can see your uploaded images</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.id}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                        selectedImages.some(img => img.id === image.id)
                          ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="w-full h-24 sm:h-32 object-cover"
                      />
                      <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 ${
                        selectedImages.some(img => img.id === image.id) ? 'bg-blue-500/10' : ''
                      }`}>
                        {selectedImages.some(img => img.id === image.id) && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}

                      {/* Click overlay for selection */}
                      <div
                        className="absolute inset-0 cursor-pointer"
                        onClick={() => selectImage(image)}
                      />

                      {/* Delete button - appears on hover (positioned after overlay to be on top) */}
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteImage(image);
                          }}
                          disabled={isDeleting === image.id}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete image"
                        >
                          {isDeleting === image.id ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs truncate">{image.filename}</p>
                    </div>
                    </div>
                  ))}
                </div>

                {selectedImages.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-800 font-medium">{selectedImages.length} Image(s) Selected</span>
                      </div>
                      <button
                        onClick={() => setSelectedImages([])}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analyze Selected Images Button */}
          {selectedImages.length > 0 && currentStep === 'upload' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02]">
              <div className="p-6 sm:p-8 text-center">
                <button
                  onClick={analyzeSelectedImages}
                  disabled={isAnalyzing}
                  className="group relative bg-gradient-to-r from-slate-600 via-blue-600 to-indigo-600 hover:from-slate-700 hover:via-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 text-white font-bold py-3 px-8 sm:py-4 sm:px-12 rounded-2xl transition-all duration-500 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none overflow-hidden text-sm sm:text-lg"
                >
                  <div className="relative z-10 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>{isAnalyzing ? 'Analyzing Images...' : `Analyze ${selectedImages.length} Selected Image(s) with AI`}</span>
                  </div>
                  {!isAnalyzing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                </button>

                {error && (
                  <div className="mt-4 text-center">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analyzed Images Table */}
          {analyzedImages.length > 0 && currentStep === 'analyzed' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 sm:px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  AI Analysis Results
                </h2>
                <p className="text-sm text-slate-600 mt-1">GPT-4o analysis of your images</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 w-16">#</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 w-24">Image</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Camera Movement Prompt</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyzedImages.map((analyzedImage, index) => (
                        <tr key={analyzedImage.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4">
                            <img
                              src={analyzedImage.imageUrl}
                              alt={`Image ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                            />
                          </td>
                          <td className="py-3 px-4 flex-1">
                            {analyzedImage.isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  defaultValue={analyzedImage.prompt}
                                  className="w-full p-2 border border-slate-300 rounded text-sm resize-none"
                                  rows={3}
                                  placeholder="Enter camera movement prompt..."
                                  id={`prompt-${analyzedImage.id}`}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      const textarea = document.getElementById(`prompt-${analyzedImage.id}`) as HTMLTextAreaElement;
                                      savePromptEdit(analyzedImage.id, textarea.value);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => cancelPromptEdit(analyzedImage.id)}
                                    className="px-3 py-1 bg-slate-500 text-white text-xs rounded hover:bg-slate-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-700 leading-relaxed max-w-md">
                                {analyzedImage.prompt}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {!analyzedImage.isEditing && (
                              <button
                                onClick={() => startEditingPrompt(analyzedImage.id)}
                                className="px-3 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-700"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={generateVideos}
                    disabled={isGenerating}
                    className="group relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 disabled:from-purple-400 disabled:via-pink-400 disabled:to-red-400 text-white font-bold py-3 px-8 sm:py-4 sm:px-12 rounded-2xl transition-all duration-500 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none overflow-hidden text-sm sm:text-lg"
                  >
                    <div className="relative z-10 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{isGenerating ? 'Generating Videos...' : `Generate ${analyzedImages.length} Video(s)`}</span>
                    </div>
                    {!isGenerating && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Video Generation Progress */}
          {currentStep === 'generating' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 sm:px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generating Videos
                </h2>
                <p className="text-sm text-slate-600 mt-1">This process can take several minutes per video. Please be patient.</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-yellow-800 font-medium">Video Generation in Progress</p>
                        <p className="text-yellow-700 text-sm">AI video generation typically takes 2-5 minutes per video. The page will update automatically when complete.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyzedImages.map((analyzedImage, index) => (
                      <div key={analyzedImage.id} className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start space-x-4">
                          <img
                            src={analyzedImage.imageUrl}
                            alt={`Image ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900 mb-2">Video {index + 1}</h3>
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm text-slate-600">Processing...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generated Videos */}
          {generatedVideos.length > 0 && currentStep === 'complete' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 sm:px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Generated Videos
                </h2>
                <p className="text-sm text-slate-600 mt-1">Your AI-generated videos are ready</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedVideos.map((video) => (
                    <div key={video.index} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-slate-200">
                        <h3 className="font-medium text-slate-900">Video {video.index + 1}</h3>
                        <p className="text-sm text-slate-600 mt-1">{video.prompt}</p>
                      </div>
                      <div className="p-4">
                        <video
                          src={video.videoUrl}
                          controls
                          className="w-full h-48 bg-slate-100 rounded"
                          poster={video.imageUrl}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="mt-3 flex justify-center">
                          <a
                            href={video.videoUrl}
                            download
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            Download Video
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={resetAll}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                  >
                    Create More Videos
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
    </DashboardLayout>
  );
}