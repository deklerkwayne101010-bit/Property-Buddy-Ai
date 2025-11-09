'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  url?: string;
}

interface VideoJob {
  id: string;
  status: string;
  totalImages: number;
  completedImages: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobProgress {
  prompts: {
    completed: number;
    processing: number;
    failed: number;
    total: number;
  };
  videos: {
    completed: number;
    processing: number;
    failed: number;
    total: number;
  };
}

interface JobImage {
  id: string;
  imageUrl: string;
  imageName: string;
  promptStatus: string;
  videoStatus: string;
  gpt4oPrompt?: string;
  klingVideoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobStatus {
  job: VideoJob;
  progress: JobProgress;
  images: JobImage[];
}

export default function AiVideoEditorPage() {
  const { user } = useAuth();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const maxFiles = 10;
    const currentCount = uploadedImages.length;
    const availableSlots = maxFiles - currentCount;

    if (files.length > availableSlots) {
      setError(`You can only upload ${availableSlots} more image(s). Maximum is ${maxFiles} images.`);
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
    setError(null);
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

  const processVideo = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    if (uploadedImages.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStatus('Uploading images...');

    try {
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Upload images and create job
      const formData = new FormData();
      uploadedImages.forEach((image, index) => {
        formData.append('images', image.file);
      });

      const uploadResponse = await fetch('/api/video-generate/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload images');
      }

      const uploadData = await uploadResponse.json();
      const jobId = uploadData.jobId;
      setCurrentJob({ id: jobId, status: 'pending', totalImages: uploadedImages.length, completedImages: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

      setProcessingStatus('Images uploaded. Generating AI prompts...');

      // Start status polling
      statusIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/video-generate/${jobId}/status`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (statusResponse.ok) {
            const statusData: JobStatus = await statusResponse.json();
            setJobStatus(statusData);

            if (statusData.job.status === 'processing_prompts') {
              setProcessingStatus(`Generating prompts... ${statusData.progress.prompts.completed}/${statusData.progress.prompts.total} completed`);
            } else if (statusData.job.status === 'generating_videos') {
              setProcessingStatus(`Creating videos... ${statusData.progress.videos.completed}/${statusData.progress.videos.total} completed`);
            } else if (statusData.job.status === 'completed') {
              setProcessingStatus('Video generation complete!');
              if (statusIntervalRef.current) {
                clearInterval(statusIntervalRef.current);
                statusIntervalRef.current = null;
              }
              setIsProcessing(false);
            } else if (statusData.job.status === 'failed') {
              throw new Error(statusData.job.errorMessage || 'Video generation failed');
            }
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 3000);

      // Step 2: Generate prompts
      const promptsResponse = await fetch(`/api/video-generate/${jobId}/prompts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!promptsResponse.ok) {
        const errorData = await promptsResponse.json();
        throw new Error(errorData.error || 'Failed to start prompt generation');
      }

      // Step 3: Generate videos (this will be called automatically after prompts complete)
      // The status polling above will handle the progress updates

    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process video. Please try again.';
      setError(errorMessage);
      setProcessingStatus('');
      setIsProcessing(false);

      // Clear status interval if it exists
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    }
  };

  const resetEditor = () => {
    // Clean up object URLs
    uploadedImages.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });

    setUploadedImages([]);
    setCurrentJob(null);
    setJobStatus(null);
    setError(null);
    setProcessingStatus('');

    // Clear status interval if it exists
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  // Cleanup function for interval on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Video Editor</h1>
            <p className="text-slate-600">Transform your property images into stunning videos with AI</p>
          </div>

          {/* Upload Section */}
          {!jobStatus && (
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
                  Drag and drop up to 10 images, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  disabled={uploadedImages.length >= 10}
                >
                  Choose Images
                </button>
                <p className="text-sm text-slate-500 mt-2">
                  {uploadedImages.length}/10 images uploaded
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Image Preview Grid */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.preview}
                        alt={`Upload ${uploadedImages.indexOf(image) + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {uploadedImages.indexOf(image) + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Process Button */}
              {uploadedImages.length > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={processVideo}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Create AI Video</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Processing Progress */}
          {isProcessing && jobStatus && (
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Creating Your Video Clips</h3>
                <p className="text-slate-600 mb-4">
                  {processingStatus || 'This may take several minutes depending on the number of images...'}
                </p>

                {/* Progress Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{jobStatus.progress.prompts.completed}</div>
                    <div className="text-sm text-slate-500">Prompts Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{jobStatus.progress.videos.completed}</div>
                    <div className="text-sm text-slate-500">Videos Created</div>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(jobStatus.progress.prompts.completed + jobStatus.progress.videos.completed) / (jobStatus.job.totalImages * 2) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {Math.round((jobStatus.progress.prompts.completed + jobStatus.progress.videos.completed) / (jobStatus.job.totalImages * 2) * 100)}% complete
                </p>
              </div>
            </div>
          )}

          {/* Prompts Review Section */}
          {jobStatus && jobStatus.job.status === 'processing_prompts' && jobStatus.progress.prompts.completed > 0 && (
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Prompts Generated Successfully!</h3>
                <p className="text-slate-600">Review the generated prompts below and click continue to start video generation.</p>
              </div>

              {/* Prompts List */}
              <div className="space-y-4 mb-6">
                {jobStatus.images.map((image, index) => (
                  <div key={image.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <img
                        src={image.imageUrl}
                        alt={`Property image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 mb-2">Image {index + 1}</h4>
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded border">
                          {image.gpt4oPrompt || 'Generating prompt...'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Button - Only show when ALL prompts are completed */}
              {jobStatus.progress.prompts.completed === jobStatus.job.totalImages && (
                <div className="flex justify-center">
                  <button
                    onClick={async () => {
                      setProcessingStatus('Starting video generation...');

                      try {
                        // Get auth token
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.access_token) {
                          throw new Error('Authentication required');
                        }

                        // Start video generation
                        const videosResponse = await fetch(`/api/video-generate/${jobStatus.job.id}/videos`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`
                          }
                        });

                        if (!videosResponse.ok) {
                          const errorData = await videosResponse.json();
                          throw new Error(errorData.error || 'Failed to start video generation');
                        }

                        setProcessingStatus('Video generation started...');
                      } catch (error) {
                        console.error('Error starting video generation:', error);
                        setError(error instanceof Error ? error.message : 'Failed to start video generation');
                        setProcessingStatus('');
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Continue to Video Generation</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {jobStatus && jobStatus.job.status === 'completed' && (
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Video Clips Created Successfully!</h3>
                <p className="text-slate-600 mb-6">
                  {jobStatus.progress.videos.completed} video clips generated from {jobStatus.job.totalImages} images
                </p>

                {/* Video Clips Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {jobStatus.images
                    .filter(img => img.videoStatus === 'completed' && img.klingVideoUrl)
                    .map((image, index) => (
                    <div key={image.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Image Preview */}
                      <div className="relative">
                        <img
                          src={image.imageUrl}
                          alt={`Property image ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          Image {index + 1}
                        </div>
                      </div>

                      {/* Video Player */}
                      <div className="p-3">
                        <video
                          controls
                          className="w-full h-32 object-cover rounded mb-2"
                          poster={image.imageUrl}
                        >
                          <source src={image.klingVideoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>

                        {/* Download Button */}
                        <a
                          href={image.klingVideoUrl}
                          download={`property-video-${index + 1}.mp4`}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resetEditor}
                    className="bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Create Another Video
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}