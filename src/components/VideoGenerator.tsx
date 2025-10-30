'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UserMedia {
  id: string;
  media_type: 'image' | 'voice' | 'voice_clone' | 'avatar_video';
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

export default function VideoGenerator() {
  const { user } = useAuth();
  const [uploadedImages, setUploadedImages] = useState<UserMedia[]>([]);
  const [selectedImages, setSelectedImages] = useState<UserMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<UserMedia | null>(null);
  const [loading, setLoading] = useState(true);

  // Load existing user media on component mount
  useEffect(() => {
    if (user) {
      loadUserMedia();
    }
  }, [user]);

  // Add useEffect to handle auth state changes
  useEffect(() => {
    if (!user) {
      setUploadedImages([]);
      setSelectedImages([]);
      setGeneratedVideo(null);
      setLoading(false);
    }
  }, [user]);

  const loadUserMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('user_media')
        .select('*')
        .eq('user_id', user?.id)
        .eq('media_type', 'image')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        // If table doesn't exist, show a helpful message
        if (error.message.includes('relation "public.user_media" does not exist')) {
          console.log('user_media table not found. Please run the supabase-setup.sql script in your Supabase SQL Editor.');
        }
        return;
      }

      setUploadedImages(data || []);
    } catch (error) {
      console.error('Error loading user media:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/image_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('user_media')
        .insert({
          user_id: user.id,
          media_type: 'image',
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      // Reload media
      await loadUserMedia();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Upload multiple files
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        uploadImage(file);
      } else {
        alert(`File "${file.name}" is not a valid image file.`);
      }
    });
  };

  const toggleImageSelection = (image: UserMedia) => {
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.id === image.id);
      if (isSelected) {
        return prev.filter(img => img.id !== image.id);
      } else if (prev.length < 10) {
        return [...prev, image];
      } else {
        alert('You can select up to 10 images only.');
        return prev;
      }
    });
  };

  const generateVideo = async () => {
    if (selectedImages.length === 0) {
      alert('Please select at least one image.');
      return;
    }

    setIsGeneratingVideo(true);
    try {
      const response = await fetch('/api/video-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: selectedImages.map(img => img.file_url),
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate video');
      }

      const data = await response.json();
      console.log('Video generation response:', data);

      if (!data.videoUrl) {
        throw new Error('No video URL received from API');
      }

      // Save the video to database
      const { data: insertData, error: dbError } = await supabase
        .from('user_media')
        .insert({
          user_id: user?.id,
          media_type: 'avatar_video',
          file_name: `generated_video_${Date.now()}.mp4`,
          file_url: data.videoUrl,
          file_size: 0,
        })
        .select();

      if (dbError) throw dbError;

      console.log('Video saved to database successfully:', insertData);
      setGeneratedVideo(insertData[0]);
      setSelectedImages([]); // Clear selection after successful generation
    } catch (error) {
      console.error('Error generating video:', error);
      if (error instanceof Error) {
        alert(`Error generating video: ${error.message}`);
      } else {
        alert('Error generating video. Please try again.');
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Video Generator</h1>
        <p className="text-gray-600 mb-4">Upload property images and create stunning AI-generated videos</p>

        {/* Template Selection */}
        <div className="mb-6">
          <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">1️⃣</span>
              </div>
              <span className="text-blue-800 font-semibold text-sm">Template 1: Property Showcase</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Upload up to 10 images to create a cinematic property video</p>
        </div>

        {/* Cost Display */}
        <div className="inline-flex items-center bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-full px-4 py-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">🎥</span>
            </div>
            <span className="text-orange-800 font-semibold text-sm">4 Credits per video</span>
          </div>
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
          Upload Property Images
        </h2>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <div className="space-y-4">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Upload Property Images</p>
              <p className="text-gray-500">Upload multiple images of your property to create a video</p>
            </div>
            <button
              onClick={() => document.getElementById('image-upload')?.click()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload Images'}
            </button>
          </div>
        </div>

        <input
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Uploaded Images Gallery */}
      {uploadedImages.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
            Select Images for Property Video (Up to 10)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose images in the order you want them to appear in your property showcase video.
            Each image will be transformed into a 5-second cinematic video clip.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {uploadedImages.map((image) => {
              const isSelected = selectedImages.some(img => img.id === image.id);
              return (
                <div
                  key={image.id}
                  onClick={() => toggleImageSelection(image)}
                  className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                    isSelected
                      ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <img
                    src={image.file_url}
                    alt={image.file_name}
                    className="w-full h-24 sm:h-32 object-cover"
                  />
                  <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 ${
                    isSelected ? 'bg-blue-500/10' : ''
                  }`}>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs truncate">{image.file_name}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedImages.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">{selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected</p>
                    <p className="text-sm text-blue-600">Ready to generate video</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedImages([])}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Video Section */}
      {selectedImages.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
            Generate AI Video
          </h2>

          <div className="space-y-4">
            <p className="text-gray-600">
              Create a cinematic property showcase video using AI. Each selected image will be transformed into a 5-second video clip with subtle camera movements and lighting effects, then smoothly stitched together into one cohesive property tour ({selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected).
            </p>

            <button
              onClick={generateVideo}
              disabled={isGeneratingVideo}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              {isGeneratingVideo ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating Video...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Generate Property Video</span>
                </div>
              )}
            </button>

            {/* Generation Progress */}
            {isGeneratingVideo && (
              <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <div>
                    <p className="text-lg font-semibold text-purple-800">Creating your AI property video...</p>
                    <p className="text-sm text-purple-600">This may take several minutes as the AI processes your images</p>
                  </div>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-3">
                  <div className="bg-purple-500 h-3 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated Video Result */}
      {generatedVideo && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">✓</span>
            AI Property Video Generated
          </h2>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-800">Your AI Property Video</p>
                  <p className="text-sm text-green-600">
                    Generated: {new Date(generatedVideo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.open(generatedVideo.file_url, '_blank')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Download Video
                </button>
                <button
                  onClick={() => {
                    setGeneratedVideo(null);
                    setSelectedImages([]);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Create New Video
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
              <video controls className="w-full">
                <source src={generatedVideo.file_url} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-green-700 mb-2">
                Video URL:
              </label>
              <input
                type="text"
                value={generatedVideo.file_url}
                readOnly
                className="w-full px-3 py-2 border border-green-300 rounded-lg bg-white text-sm font-mono"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
