'use client';

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Slider functionality
const useImageSlider = () => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return { sliderPosition, isDragging, sliderRef, handleMouseDown };
};

interface UploadedImage {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
}

export default function PhotoEditor() {
  const { user } = useAuth();
  const { sliderPosition, isDragging, sliderRef, handleMouseDown } = useImageSlider();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [agentInstruction, setAgentInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded images on component mount
  useEffect(() => {
    loadUploadedImages();
  }, []);

  const loadUploadedImages = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('images')
        .list('', {
          limit: 20,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error loading images:', error);
        return;
      }

      const images: UploadedImage[] = data.map(file => ({
        id: file.id || file.name,
        url: supabase.storage.from('images').getPublicUrl(file.name).data.publicUrl,
        filename: file.name,
        uploadedAt: file.created_at || new Date().toISOString()
      }));

      setUploadedImages(images);
    } catch (error) {
      console.error('Error loading uploaded images:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `upload-${timestamp}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) {
        throw error;
      }

      // Refresh the uploaded images list
      await loadUploadedImages();

      // Set the uploaded image as preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setIsUploading(false);
      alert('Image uploaded successfully! You can now select it from the gallery below.');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
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
    setSelectedImageUrl(image.url);
    setOriginalImage(image.url);
  };

  const handleEnhancePhoto = async () => {
    if (!selectedImageUrl || !agentInstruction) return;

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStep('Sending to AI for enhancement...');

    try {
      setLoadingProgress(30);
      setLoadingStep('AI is enhancing your photo...');

      // Send the Supabase URL directly to the API
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: selectedImageUrl,
          prompt: agentInstruction,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit image');
      }

      setLoadingProgress(70);
      setLoadingStep('Processing your image...');

      const { edited_image_url } = await response.json();

      setLoadingProgress(90);
      setLoadingStep('Finalizing your enhanced image...');

      setLoadingProgress(100);
      setLoadingStep('Complete!');

      // Small delay to show completion
      setTimeout(() => {
        setEditedImage(edited_image_url);
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStep('');
      }, 500);

    } catch (error) {
      console.error('Error enhancing photo:', error);
      alert('Failed to enhance photo. Please try again.');
      setIsLoading(false);
      setLoadingProgress(0);
      setLoadingStep('');
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                className="block bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Photo Editor
              </motion.span>
            </motion.h1>
            <motion.p
              className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Transform your images with advanced AI-powered editing. Upload a photo and describe the changes you want to see.
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

              {originalImage ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <img
                      src={originalImage}
                      alt="Selected"
                      className="max-w-full max-h-64 sm:max-h-80 rounded-2xl shadow-lg border-4 border-white transition-all duration-300 group-hover:shadow-xl group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-2xl transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
                    <p className="text-slate-700 font-medium">Click to change image</p>
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
                  Your Uploaded Images
                </h2>
                <p className="text-sm text-slate-600 mt-1">Select an image to edit</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => selectImage(image)}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                        selectedImageUrl === image.url
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
                        selectedImageUrl === image.url ? 'bg-blue-500/10' : ''
                      }`}>
                        {selectedImageUrl === image.url && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs truncate">{image.filename}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedImageUrl && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-800 font-medium">Selected Image</span>
                      </div>
                      <button
                        onClick={() => setSelectedImageUrl(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions Section Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02]">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 sm:px-8 py-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                AI Instructions
              </h2>
              <p className="text-sm text-slate-600 mt-1">Describe how you want to transform your image</p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    id="agent-instruction"
                    value={agentInstruction}
                    onChange={(e) => setAgentInstruction(e.target.value)}
                    placeholder="e.g., Remove microwave, Add sunset background, Make it black and white, Enhance colors, Add dramatic lighting..."
                    className="w-full px-4 sm:px-6 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-slate-50/50 hover:bg-white hover:border-slate-300 text-sm sm:text-base"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                    {agentInstruction.length}/500
                  </div>
                </div>

                {/* Quick Examples */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Remove background",
                      "Add golden hour lighting",
                      "Convert to black & white",
                      "Enhance colors",
                      "Add cinematic look",
                      "Fix perspective",
                      "Add vintage filter",
                      "Boost contrast"
                    ].map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setAgentInstruction(example)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-slate-100 to-slate-50 hover:from-blue-100 hover:to-blue-50 text-slate-700 hover:text-blue-700 rounded-full border border-slate-200 hover:border-blue-300 transition-all duration-200 hover:scale-105 hover:shadow-md"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02]">
            <div className="p-6 sm:p-8 text-center">
              {isLoading ? (
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      ></div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  </div>

                  {/* Loading Steps */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-3 h-3 bg-slate-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <p className="text-lg font-semibold text-slate-800">{loadingStep}</p>
                    <p className="text-sm text-slate-600">This usually takes 10-30 seconds</p>
                  </div>

                  {/* Animated AI Working Indicator */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-slate-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleEnhancePhoto}
                    disabled={!selectedImageUrl || !agentInstruction || isLoading}
                    className="group relative bg-gradient-to-r from-slate-600 via-blue-600 to-indigo-600 hover:from-slate-700 hover:via-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 text-white font-bold py-3 px-8 sm:py-4 sm:px-12 rounded-2xl transition-all duration-500 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none overflow-hidden text-sm sm:text-lg"
                  >
                    <div className="relative z-10 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Enhance Photo with AI</span>
                    </div>
                    {!isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    )}
                  </button>

                  {(!selectedImageUrl || !agentInstruction) && (
                    <div className="mt-4 text-xs sm:text-sm text-slate-500">
                      {!selectedImageUrl && !agentInstruction && "Please select an image and add instructions"}
                      {!selectedImageUrl && agentInstruction && "Please select an image first"}
                      {selectedImageUrl && !agentInstruction && "Please add instructions for the AI"}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Results Section */}
          {originalImage && editedImage && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 sm:px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  AI Enhancement Complete
                </h2>
                <p className="text-sm text-slate-600 mt-1">Compare your original image with the AI-enhanced version</p>
              </div>

              <div className="p-6 sm:p-8">
                {/* Before/After Slider */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                        <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Before / After Comparison
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">Drag to compare</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Slider Container */}
                    <div
                      ref={sliderRef}
                      className="relative w-full h-96 sm:h-[500px] overflow-hidden cursor-ew-resize"
                      onMouseDown={handleMouseDown}
                    >
                      {/* Before Image (Bottom Layer) */}
                      <img
                        src={originalImage}
                        alt="Original"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* After Image (Top Layer with dynamic clip) */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{
                          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                        }}
                      >
                        <img
                          src={editedImage}
                          alt="Edited"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>

                      {/* Slider Handle */}
                      <div
                        className="absolute inset-y-0 w-1 bg-white shadow-lg z-10"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-blue-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        </div>
                      </div>

                      {/* Center Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20"
                        style={{ left: `${sliderPosition}%` }}
                      />

                      {/* Labels */}
                      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Before
                      </div>
                      <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        After
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => downloadImage(originalImage, 'original-image.jpg')}
                        className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Original
                      </button>
                      <button
                        onClick={() => downloadImage(editedImage, 'ai-enhanced-image.jpg')}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Enhanced
                      </button>
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                <div className="mt-6 sm:mt-8 text-center">
                  <div className="inline-flex items-center bg-emerald-100 border border-emerald-200 rounded-full px-4 py-2 sm:px-6 sm:py-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-emerald-800 font-medium text-sm sm:text-base">Your image has been successfully enhanced with AI!</span>
                  </div>
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