'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  url?: string;
}

export default function AiVideoMakerPage() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (uploadedImage) {
      setError('You can only upload one image. Please clear the current image first.');
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

    const file = imageFiles[0];
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const preview = URL.createObjectURL(file);

    const newImage: UploadedImage = {
      id,
      file,
      preview
    };

    setUploadedImage(newImage);
    setError(null);

    // Upload to Supabase
    await uploadToSupabase(newImage);
  }, [uploadedImage]);

  const uploadToSupabase = async (image: UploadedImage) => {
    setIsUploading(true);
    setError(null);

    try {
      const fileName = `${image.id}-${image.file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('video-assets')
        .upload(fileName, image.file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('video-assets')
        .getPublicUrl(fileName);

      setUploadedImage(prev => prev ? { ...prev, url: publicUrl } : null);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploadedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const convertToVideo = async () => {
    if (!uploadedImage?.url) {
      setError('Please upload an image first');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const response = await fetch('/api/video-generate/kling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadedImage.url
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Video conversion failed');
      }

      const data = await response.json();
      setVideoUrl(data.videoUrl);
    } catch (error) {
      console.error('Conversion error:', error);
      setError(error instanceof Error ? error.message : 'Video conversion failed');
    } finally {
      setIsConverting(false);
    }
  };

  const resetImage = () => {
    if (uploadedImage?.preview) {
      URL.revokeObjectURL(uploadedImage.preview);
    }
    setUploadedImage(null);
    setVideoUrl(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">AI Video Maker</h1>
        <p className="text-slate-600">
          Upload an image and convert it to a smooth video with subtle camera motion
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

      {/* Image Upload Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Upload Image</h2>

        {!uploadedImage ? (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-slate-600 mb-2">Drag and drop an image, or click to browse</p>
              <p className="text-sm text-slate-500">PNG, JPG up to 10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Choose Image'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">Uploaded Image</h3>
              <button
                onClick={resetImage}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <img
                src={uploadedImage.url || uploadedImage.preview}
                alt="Uploaded image"
                className="w-full h-64 object-cover"
              />
            </div>

            {uploadedImage.url && (
              <div className="flex justify-center">
                <button
                  onClick={convertToVideo}
                  disabled={isConverting}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isConverting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Converting to Video...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H13m-3 3h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 14H13m-3-3v4m0-4H9m3 4v-4m0 4h1.586a1 1 0 00.707-.293l.707-.707A1 1 0 0014.414 13H15m3-3a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Convert to Video</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {!uploadedImage.url && (
              <div className="text-center text-slate-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Uploading to server...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Result */}
      {videoUrl && (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Generated Video</h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <video
              src={videoUrl}
              controls
              className="w-full h-64"
              poster={uploadedImage?.url}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="mt-4 flex justify-center">
            <a
              href={videoUrl}
              download
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Download Video
            </a>
          </div>
        </div>
      )}
    </div>
  );
}