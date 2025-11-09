'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  url: string;
}

interface VideoResult {
  index: number;
  imageUrl: string;
  prompt: string;
  videoUrl: string;
}

export default function AiVideoMakerPage() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<VideoResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'generating' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (uploadedImages.length >= 10) {
      setError('You can only upload up to 10 images. Please clear some images first.');
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

    // Check if adding these would exceed 10 images
    if (uploadedImages.length + imageFiles.length > 10) {
      setError(`You can only upload ${10 - uploadedImages.length} more images`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const newImages: UploadedImage[] = [];

      for (const file of imageFiles) {
        const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const preview = URL.createObjectURL(file);

        // Upload to Supabase
        const fileName = `${id}-${file.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('video-assets')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('video-assets')
          .getPublicUrl(fileName);

        newImages.push({
          id,
          file,
          preview,
          url: publicUrl
        });
      }

      setUploadedImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [uploadedImages]);

  const generateVideos = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentStep('generating');
    setGeneratedVideos([]);

    try {
      const imageUrls = uploadedImages.map(img => img.url);
      const prompts: string[] = [];

      // Step 1: Generate GPT-4o prompts for each image
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        
        const response = await fetch('/api/video-generate/generate-prompts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: imageUrl
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to generate prompt for image ${i + 1}`);
        }

        const data = await response.json();
        prompts.push(data.prompt);
      }

      // Step 2: Generate videos using Kling AI
      const videos: VideoResult[] = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const prompt = prompts[i];

        const videoResponse = await fetch('/api/video-generate/kling', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
            prompt: prompt
          }),
        });

        if (!videoResponse.ok) {
          const errorData = await videoResponse.json();
          throw new Error(errorData.error || `Failed to generate video for image ${i + 1}`);
        }

        const videoData = await videoResponse.json();
        videos.push({
          index: i,
          imageUrl: imageUrl,
          prompt: prompt,
          videoUrl: videoData.videoUrl
        });
      }

      setGeneratedVideos(videos);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Generation error:', error);
      setError(error instanceof Error ? error.message : 'Video generation failed');
      setCurrentStep('upload');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetAll = () => {
    uploadedImages.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setUploadedImages([]);
    setGeneratedVideos([]);
    setError(null);
    setCurrentStep('upload');
  };

  const removeImage = (id: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === id);
    if (imageToRemove?.preview) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">AI Video Maker</h1>
        <p className="text-slate-600">
          Upload up to 10 images and generate professional videos with AI-powered camera movements
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Upload Images ({uploadedImages.length}/10)
          </h2>
          {uploadedImages.length > 0 && (
            <button
              onClick={resetAll}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {uploadedImages.length < 10 && (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
            <div className="mb-4">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-slate-600 mb-2">Drag and drop images, or click to browse</p>
              <p className="text-sm text-slate-500">PNG, JPG up to 10MB each (Max 10 images)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Choose Images'}
            </button>
          </div>
        )}

        {/* Uploaded Images Grid */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <img
                    src={image.url}
                    alt="Uploaded"
                    className="w-full h-32 object-cover"
                  />
                </div>
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Generate Button */}
        {uploadedImages.length > 0 && currentStep === 'upload' && (
          <div className="text-center">
            <button
              onClick={generateVideos}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating Videos...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H13m-3 3h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 14H13m-3-3v4m0-4H9m3 4v-4m0 4h1.586a1 1 0 00.707-.293l.707-.707A1 1 0 0014.414 13H15m3-3a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Generate Videos ({uploadedImages.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Generation Progress */}
      {currentStep === 'generating' && (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Generating Videos...</h2>
          <div className="space-y-4">
            {uploadedImages.map((image, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border border-slate-200 rounded-lg">
                <img src={image.url} alt={`Image ${index + 1}`} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-slate-600">Processing image {index + 1} of {uploadedImages.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Videos */}
      {currentStep === 'complete' && generatedVideos.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Generated Videos ({generatedVideos.length})
            </h2>
            <button
              onClick={resetAll}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create More Videos
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generatedVideos.map((video) => (
              <div key={video.index} className="border border-slate-200 rounded-lg overflow-hidden">
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
        </div>
      )}
    </div>
  );
}