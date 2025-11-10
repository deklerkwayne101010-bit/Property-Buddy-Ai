'use client';

import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface ProcessingItem {
  imageUrl: string;
  prompt?: string;
  videoUrl?: string;
  promptStatus: 'pending' | 'processing' | 'completed' | 'failed';
  videoStatus: 'pending' | 'processing' | 'completed' | 'failed';
  promptId?: string;
  videoId?: string;
}

export default function AiVideoMakerPage() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList) => {
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
      const newImageUrls: string[] = [];

      for (const file of imageFiles) {
        // Upload to Supabase
        const fileName = `video-${Date.now()}-${file.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('video-assets')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('video-assets')
          .getPublicUrl(fileName);

        newImageUrls.push(publicUrl);
      }

      setUploadedImages(prev => [...prev, ...newImageUrls]);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Utility functions for API calls
  async function startPromptAnalysis(imageUrl: string) {
    const res = await fetch("/api/start-prompt-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl })
    });
    return res.json();
  }

  async function startVideoGeneration(imageUrl: string, prompt: string) {
    const res = await fetch("/api/start-video-generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, prompt })
    });
    return res.json();
  }

  async function getPrediction(id: string) {
    const res = await fetch(`/api/get-prediction?id=${encodeURIComponent(id)}`);
    return res.json();
  }

  // Poll until finished (resolves to prediction data)
  async function waitForPrediction(id: string, interval = 3000, maxAttempts = 120) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const pred = await getPrediction(id);
      if (pred.status === "succeeded") return pred;
      if (pred.status === "failed") throw new Error(pred.error || "Prediction failed");
      await new Promise(r => setTimeout(r, interval));
      attempts++;
    }
    throw new Error("Prediction timed out");
  }

  const processImagesSequentially = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Initialize processing items
    const items: ProcessingItem[] = uploadedImages.map(imageUrl => ({
      imageUrl,
      promptStatus: 'pending',
      videoStatus: 'pending'
    }));

    setProcessingItems(items);

    try {
      // Step 1: Generate prompts sequentially
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Update status to processing
        setProcessingItems(prev => prev.map((p, idx) =>
          idx === i ? { ...p, promptStatus: 'processing' } : p
        ));

        try {
          // Start prompt analysis
          const start = await startPromptAnalysis(item.imageUrl);
          item.promptId = start.id;

          // Wait for completion
          const promptPred = await waitForPrediction(start.id);

          // Extract prompt text (depends on model - inspect prediction.output)
          const rawOutput = promptPred.output;
          const promptText = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

          // Wrap/inject constraints into final prompt
          const finalPrompt = `Analyze this image and produce a short motion instruction for an image-to-video model.
${promptText}
CONSTRAINTS: Do not add, remove, or alter any objects. Keep geometry exact. Motion only.`;

          item.prompt = finalPrompt;
          item.promptStatus = 'completed';

          // Update UI
          setProcessingItems(prev => prev.map((p, idx) =>
            idx === i ? { ...p, prompt: finalPrompt, promptStatus: 'completed' } : p
          ));

        } catch (error) {
          console.error(`Prompt generation failed for image ${i + 1}:`, error);
          item.promptStatus = 'failed';
          setProcessingItems(prev => prev.map((p, idx) =>
            idx === i ? { ...p, promptStatus: 'failed' } : p
          ));
        }
      }

      // Step 2: Generate videos sequentially for completed prompts
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Skip if prompt failed
        if (item.promptStatus !== 'completed' || !item.prompt) continue;

        // Update status to processing
        setProcessingItems(prev => prev.map((p, idx) =>
          idx === i ? { ...p, videoStatus: 'processing' } : p
        ));

        try {
          // Start video generation
          const startVideo = await startVideoGeneration(item.imageUrl, item.prompt);
          item.videoId = startVideo.id;

          // Wait for completion
          const videoPred = await waitForPrediction(startVideo.id);

          // Extract video URL (often videoPred.output[0])
          const videoUrl = Array.isArray(videoPred.output) ? videoPred.output[0] : videoPred.output;

          item.videoUrl = videoUrl;
          item.videoStatus = 'completed';

          // Update UI
          setProcessingItems(prev => prev.map((p, idx) =>
            idx === i ? { ...p, videoUrl, videoStatus: 'completed' } : p
          ));

        } catch (error) {
          console.error(`Video generation failed for image ${i + 1}:`, error);
          item.videoStatus = 'failed';
          setProcessingItems(prev => prev.map((p, idx) =>
            idx === i ? { ...p, videoStatus: 'failed' } : p
          ));
        }
      }

    } catch (error) {
      console.error('Processing error:', error);
      setError(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    // Clean up object URLs
    uploadedImages.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setUploadedImages([]);
    setProcessingItems([]);
    setError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return '⏸️';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">AI Video Maker</h1>
        <p className="text-slate-600">
          Upload images and generate professional videos with AI-powered camera movements
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
            Upload Images ({uploadedImages.length})
          </h2>
          {uploadedImages.length > 0 && (
            <button
              onClick={reset}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {uploadedImages.length === 0 && (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
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
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative group">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                </div>
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Generate Button */}
        {uploadedImages.length > 0 && (
          <div className="text-center">
            <button
              onClick={processImagesSequentially}
              disabled={isProcessing}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
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

      {/* Processing Results */}
      {processingItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Processing Results</h2>

          <div className="space-y-6">
            {processingItems.map((item, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={item.imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-24 h-24 object-cover rounded border"
                  />

                  <div className="flex-1 space-y-4">
                    <h3 className="font-medium text-slate-900">Image {index + 1}</h3>

                    {/* Prompt Status */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Prompt:</span>
                      <span className={`text-sm ${getStatusColor(item.promptStatus)}`}>
                        {getStatusIcon(item.promptStatus)} {item.promptStatus}
                      </span>
                    </div>

                    {item.prompt && (
                      <div className="bg-slate-50 p-3 rounded text-sm text-slate-700">
                        {item.prompt}
                      </div>
                    )}

                    {/* Video Status */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Video:</span>
                      <span className={`text-sm ${getStatusColor(item.videoStatus)}`}>
                        {getStatusIcon(item.videoStatus)} {item.videoStatus}
                      </span>
                    </div>

                    {item.videoUrl && (
                      <div className="mt-4">
                        <video
                          src={item.videoUrl}
                          controls
                          className="w-full max-w-md h-48 bg-slate-100 rounded"
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="mt-2">
                          <a
                            href={item.videoUrl}
                            download
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                          >
                            Download Video
                          </a>
                        </div>
                      </div>
                    )}
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