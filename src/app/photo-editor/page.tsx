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

interface Property {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  property_images: Array<{
    id: string;
    filename: string;
    original_filename: string;
    url: string;
    uploaded_at: string;
  }>;
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
  const [selectedReferenceImages, setSelectedReferenceImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedEditType, setSelectedEditType] = useState<'object-remover' | 'image-enhancer' | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showSavePromptDialog, setShowSavePromptDialog] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [windowPullingEnabled, setWindowPullingEnabled] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface SavedPrompt {
    id: string;
    name: string;
    prompt: string;
    editType: 'object-remover' | 'image-enhancer';
    createdAt: string;
  }

  // Load uploaded images, properties, and saved prompts on component mount
  useEffect(() => {
    loadUploadedImages();
    loadProperties();
    loadSavedPrompts();
  }, []);

  const loadUploadedImages = async () => {
    try {
      // Only load images uploaded by the current user
      // We'll use a different approach since Supabase storage doesn't have built-in user filtering
      // We'll store user-specific images in a user_media table and filter by user_id

      const { data: userMedia, error } = await supabase
        .from('user_media')
        .select('*')
        .eq('user_id', user?.id)
        .eq('media_type', 'image')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading user images:', error);
        return;
      }

      // Convert user_media records to UploadedImage format
      const images: UploadedImage[] = (userMedia || []).map(media => ({
        id: media.id,
        url: media.file_url,
        filename: media.file_name,
        uploadedAt: media.created_at
      }));

      setUploadedImages(images);
    } catch (error) {
      console.error('Error loading uploaded images:', error);
    }
  };

  const loadSavedPrompts = async () => {
    try {
      const { data: prompts, error } = await supabase
        .from('user_prompts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading saved prompts:', error);
        return;
      }

      setSavedPrompts(prompts || []);
    } catch (error) {
      console.error('Error loading saved prompts:', error);
    }
  };

  const loadProperties = async () => {
    setLoadingProperties(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        setLoadingProperties(false);
        return;
      }

      const response = await fetch('/api/properties', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      } else {
        console.error('Failed to load properties');
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handlePropertySelect = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
    // Clear current selections when switching properties
    setSelectedImageUrl(null);
    setSelectedReferenceImages([]);
  };

  const savePrompt = async () => {
    if (!user || !agentInstruction || !selectedEditType || !promptName.trim()) {
      alert('Please enter a name for your prompt and ensure you have instructions and edit type selected.');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_prompts')
        .insert({
          user_id: user.id,
          name: promptName.trim(),
          prompt: agentInstruction,
          edit_type: selectedEditType
        });

      if (error) {
        console.error('Error saving prompt:', error);
        alert('Failed to save prompt. Please try again.');
        return;
      }

      await loadSavedPrompts();
      setPromptName('');
      setShowSavePromptDialog(false);
      alert('Prompt saved successfully!');
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt. Please try again.');
    }
  };

  const loadPrompt = (prompt: SavedPrompt) => {
    setAgentInstruction(prompt.prompt);
    setSelectedEditType(prompt.editType);
  };

  const deletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this saved prompt?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_prompts')
        .delete()
        .eq('id', promptId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting prompt:', error);
        alert('Failed to delete prompt. Please try again.');
        return;
      }

      await loadSavedPrompts();
      alert('Prompt deleted successfully!');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt. Please try again.');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) {
      alert('You must be logged in to upload images.');
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `upload-${timestamp}-${file.name}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
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

      // Refresh the uploaded images list
      await loadUploadedImages();

      // Set the uploaded image as preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setIsUploading(false);
      alert('Image uploaded successfully! You can now select it from your personal gallery below.');
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

  const toggleReferenceImage = (imageUrl: string) => {
    setSelectedReferenceImages(prev => {
      if (prev.includes(imageUrl)) {
        // Remove if already selected
        return prev.filter(url => url !== imageUrl);
      } else if (prev.length < 2) {
        // Add if under limit
        return [...prev, imageUrl];
      } else {
        // Replace the first one if at limit
        return [prev[1], imageUrl];
      }
    });
  };

  const handleEnhancePhoto = async () => {
    if (!selectedImageUrl || !agentInstruction || !selectedEditType) return;

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStep('Sending to AI for processing...');

    try {
      const totalImages = 1 + selectedReferenceImages.length;
      setLoadingProgress(30);
      setLoadingStep(
        selectedEditType === 'image-enhancer'
          ? `AI is enhancing ${totalImages} photo${totalImages > 1 ? 's' : ''}...`
          : `AI is removing objects from your photo...`
      );

      // Combine user instruction with window pulling if enabled
      const finalPrompt = windowPullingEnabled
        ? `${agentInstruction} - Do not change, replace, invent, or modify the outside scenery in ANY way. Keep every pixel of the exterior exactly the same as the original — same buildings, trees, shapes, colors, shadows, and brightness.

Only remove the glare/reflection on the window glass so the original outside view becomes clearer. This is a restoration task, not a generation task.
Do NOT add or remove objects outside.
Do NOT change the weather, lighting, or sky.
Do NOT alter colors or exposure of the outside scene.
Do NOT hallucinate or fill in missing details.
Keep interior reflections intact except the glare being removed.`
        : agentInstruction;

      // Send the Supabase URL directly to the API with edit type
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: selectedImageUrl,
          prompt: finalPrompt,
          editType: selectedEditType,
          userId: user?.id,
          referenceImages: selectedReferenceImages,
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

  const downloadImage = async (url: string, filename: string) => {
    try {
      // Fetch the image as a blob to handle cross-origin downloads
      const response = await fetch(url);
      const blob = await response.blob();

      // Create a blob URL for download
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback to opening in new tab if download fails
      window.open(url, '_blank');
    }
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
      if (selectedPropertyId) {
        // Deleting from property images
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`/api/properties/${selectedPropertyId}/images/${image.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete property image');
        }

        // Refresh properties to update the image count
        await loadProperties();
      } else {
        // Deleting from uploaded images
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
          .from('images')
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

        // Refresh the uploaded images list
        await loadUploadedImages();
      }

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
      {/* Compact Hero Section with Workflow Steps */}
      <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            {/* Icon and Title */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-500 to-blue-600 rounded-xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              AI Photo Editor
            </h1>

            <p className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto">
              Transform your property images with advanced AI-powered editing
            </p>

            {/* Cost Badge */}
            <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 mb-6">
              <span className="text-blue-700 text-sm font-medium">1 Credit per edit</span>
            </div>

            {/* Workflow Steps */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-8 mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">Upload</span>
              </div>
              <div className="w-8 h-0.5 bg-slate-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                <span className="text-sm font-medium text-slate-500 hidden sm:inline">Configure</span>
              </div>
              <div className="w-8 h-0.5 bg-slate-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                <span className="text-sm font-medium text-slate-500 hidden sm:inline">Process</span>
              </div>
              <div className="w-8 h-0.5 bg-slate-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-semibold">4</div>
                <span className="text-sm font-medium text-slate-500 hidden sm:inline">Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-7xl">

        <div className="grid gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Upload Section Card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Image
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">Select an image to edit with AI</p>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Step 1
                </div>
              </div>
            </div>

            <div className="p-6">
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/30"
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
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={originalImage}
                        alt="Selected"
                        className="max-w-full max-h-48 rounded-lg shadow-md border border-slate-200"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center">
                        <div className="opacity-0 hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-md border">
                      Click to select a different image
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-800 mb-1">Drop your image here</p>
                      <p className="text-sm text-slate-600">or click to browse files</p>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">JPEG</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">PNG</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Property Selector */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Select Property
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">Choose a property to work with its images</p>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Step 1
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingProperties ? (
                <div className="text-center py-4">
                  <div className="text-gray-500">Loading properties...</div>
                </div>
              ) : properties.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🏠</div>
                  <p className="text-sm text-gray-500 mb-4">No properties yet</p>
                  <button
                    onClick={() => window.location.href = '/properties'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
                  >
                    Create Property
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <select
                    value={selectedPropertyId || ''}
                    onChange={(e) => handlePropertySelect(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select a property...</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name} ({property.property_images?.length || 0} photos)
                      </option>
                    ))}
                  </select>

                  {selectedPropertyId && (
                    <div className="text-sm text-gray-600">
                      <p>Selected: <span className="font-medium">{properties.find(p => p.id === selectedPropertyId)?.name}</span></p>
                      <p>{properties.find(p => p.id === selectedPropertyId)?.property_images?.length || 0} images available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Image Gallery Section Card */}
          {((selectedPropertyId && properties.find(p => p.id === selectedPropertyId)?.property_images?.length) || (!selectedPropertyId && uploadedImages.length > 0)) && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {selectedPropertyId ? 'Property Images' : 'Your Images'}
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {selectedPropertyId ? 'Select images from this property' : 'Select images from your personal gallery'}
                    </p>
                  </div>
                  <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    Step 1
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {/* Reference Images Selection Info */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-800">Reference Images</span>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      {selectedReferenceImages.length}/2 selected
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Select up to 2 images from {selectedPropertyId ? 'this property' : 'your gallery'} to use as reference for the AI editing process.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(selectedPropertyId
                    ? properties.find(p => p.id === selectedPropertyId)?.property_images?.map(img => ({
                        id: img.id,
                        url: img.url,
                        filename: img.original_filename,
                        uploadedAt: img.uploaded_at
                      })) || []
                    : uploadedImages
                  ).map((image) => (
                    <div
                      key={image.id}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                        selectedImageUrl === image.url
                          ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                          : selectedReferenceImages.includes(image.url)
                          ? 'border-green-500 shadow-lg shadow-green-500/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="w-full h-24 sm:h-32 object-cover"
                      />

                      {/* Selection indicators */}
                      <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 ${
                        selectedImageUrl === image.url ? 'bg-blue-500/10' :
                        selectedReferenceImages.includes(image.url) ? 'bg-green-500/10' : ''
                      }`}>

                        {/* Main image selection indicator */}
                        {selectedImageUrl === image.url && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}

                        {/* Reference image selection indicator */}
                        {selectedReferenceImages.includes(image.url) && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                            <span className="text-xs font-bold">
                              {selectedReferenceImages.indexOf(image.url) + 1}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Click overlay for main image selection */}
                      <div
                        className="absolute inset-0 cursor-pointer"
                        onClick={() => selectImage(image)}
                      />

                      {/* Reference image checkbox - appears on hover */}
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleReferenceImage(image.url);
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            selectedReferenceImages.includes(image.url)
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'bg-white/90 border-slate-300 hover:border-green-400'
                          }`}
                          title={selectedReferenceImages.includes(image.url) ? 'Remove as reference' : 'Add as reference'}
                        >
                          {selectedReferenceImages.includes(image.url) && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>

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
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Images Display */}
                {(selectedImageUrl || selectedReferenceImages.length > 0) && (
                  <div className="mt-6 space-y-4">
                    {/* Main Selected Image */}
                    {selectedImageUrl && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-blue-800 font-medium">Selected Image for Editing</span>
                          </div>
                          <button
                            onClick={() => setSelectedImageUrl(null)}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="mt-3 flex items-center space-x-3">
                          <img
                            src={selectedImageUrl}
                            alt="Selected for editing"
                            className="w-12 h-12 object-cover rounded-lg border-2 border-blue-300"
                          />
                          <span className="text-sm text-blue-700">This image will be processed by AI</span>
                        </div>
                      </div>
                    )}

                    {/* Selected Reference Images */}
                    {selectedReferenceImages.length > 0 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-green-800 font-medium">
                              Reference Images ({selectedReferenceImages.length}/2)
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedReferenceImages([])}
                            className="text-green-600 hover:text-green-800 text-sm underline"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="mt-3 flex items-center space-x-3">
                          {selectedReferenceImages.map((url, index) => (
                            <div key={url} className="relative">
                              <img
                                src={url}
                                alt={`Reference ${index + 1}`}
                                className="w-12 h-12 object-cover rounded-lg border-2 border-green-300"
                              />
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                          <span className="text-sm text-green-700">
                            These images will be used as reference for AI processing
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Type Selection Section Card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Choose Edit Type
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">Select the type of AI editing you want to perform</p>
                </div>
                <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                  Step 2
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Object Remover Option */}
                <div
                  onClick={() => setSelectedEditType('object-remover')}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedEditType === 'object-remover'
                      ? 'border-red-500 bg-red-50 shadow-lg shadow-red-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-red-300 hover:bg-red-50/50'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      selectedEditType === 'object-remover'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Object Remover</h3>
                      <p className="text-sm text-slate-600 mb-3">Remove unwanted objects, people, or elements from your image using AI</p>
                    </div>
                  </div>
                  {selectedEditType === 'object-remover' && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Image Enhancer Option */}
                <div
                  onClick={() => setSelectedEditType('image-enhancer')}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedEditType === 'image-enhancer'
                      ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      selectedEditType === 'image-enhancer'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Image Enhancer</h3>
                      <p className="text-sm text-slate-600 mb-3">Enhance, modify, or transform your image with advanced AI editing</p>
                    </div>
                  </div>
                  {selectedEditType === 'image-enhancer' && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {!selectedEditType && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">Please select an edit type to continue</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions Section Card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    AI Instructions
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">Describe how you want to transform your image</p>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Step 3
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      id="agent-instruction"
                      value={agentInstruction}
                      onChange={(e) => setAgentInstruction(e.target.value)}
                      placeholder={selectedEditType === 'object-remover'
                        ? "e.g., Remove the microwave, Remove the person in the background, Remove the car from the driveway..."
                        : "e.g., Add sunset background, Make it black and white, Enhance colors, Add dramatic lighting..."
                      }
                      className="w-full px-4 sm:px-6 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-slate-50/50 hover:bg-white hover:border-slate-300 text-sm sm:text-base"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                      {agentInstruction.length}/500
                    </div>
                  </div>

                  {/* Window Pulling Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">Window Pulling</span>
                    </div>
                    <button
                      onClick={() => setWindowPullingEnabled(!windowPullingEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        windowPullingEnabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          windowPullingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Save Prompt Button */}
                {agentInstruction && selectedEditType && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowSavePromptDialog(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Save Prompt
                    </button>
                  </div>
                )}

                {/* Quick Examples */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedEditType === 'object-remover' ? [
                      "Remove microwave",
                      "Remove person",
                      "Remove car",
                      "Remove furniture",
                      "Remove background clutter",
                      "Remove unwanted objects"
                    ] : [
                      "Add golden hour lighting",
                      "Convert to black & white",
                      "Enhance colors",
                      "Add cinematic look",
                      "Fix perspective",
                      "Add vintage filter",
                      "Boost contrast",
                      "Add sunset background"
                    ]).map((example, index) => (
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

                {/* Saved Prompts Section */}
                {savedPrompts.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Your saved prompts:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {savedPrompts.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-slate-800">{prompt.name}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                prompt.editType === 'object-remover'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {prompt.editType === 'object-remover' ? 'Remove' : 'Enhance'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 truncate mt-1">{prompt.prompt}</p>
                          </div>
                          <div className="flex items-center space-x-2 ml-3">
                            <button
                              onClick={() => loadPrompt(prompt)}
                              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => deletePrompt(prompt.id)}
                              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 text-center">
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
                    disabled={!selectedImageUrl || !agentInstruction || !selectedEditType || isLoading}
                    className="group relative bg-gradient-to-r from-slate-600 via-blue-600 to-indigo-600 hover:from-slate-700 hover:via-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 text-white font-bold py-3 px-8 sm:py-4 sm:px-12 rounded-2xl transition-all duration-500 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none overflow-hidden text-sm sm:text-lg"
                  >
                    <div className="relative z-10 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>
                        {selectedEditType === 'object-remover' ? 'Remove Objects with AI' :
                         selectedEditType === 'image-enhancer' ?
                           (selectedReferenceImages.length > 0 ? `Enhance ${1 + selectedReferenceImages.length} Images with AI` : 'Enhance Image with AI') :
                         'Process with AI'}
                      </span>
                    </div>
                    {!isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    )}
                  </button>

                  {(!selectedImageUrl || !agentInstruction || !selectedEditType) && (
                    <div className="mt-4 text-xs sm:text-sm text-slate-500">
                      {!selectedImageUrl && !agentInstruction && !selectedEditType && "Please select an image, choose edit type, and add instructions"}
                      {!selectedImageUrl && (agentInstruction || selectedEditType) && "Please select an image first"}
                      {selectedImageUrl && !selectedEditType && "Please choose an edit type"}
                      {selectedImageUrl && selectedEditType && !agentInstruction && "Please add instructions for the AI"}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Results Section */}
          {originalImage && editedImage && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      AI {selectedEditType === 'object-remover' ? 'Object Removal' : 'Enhancement'} Complete
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">Compare your original image with the AI-processed version</p>
                  </div>
                  <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                    Step 4
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {/* Side by Side Comparison */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Before / After Comparison
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    {/* Original Image */}
                    <div className="space-y-3">
                      <div className="relative">
                        <img
                          src={originalImage}
                          alt="Original"
                          className="w-full h-64 sm:h-80 object-cover rounded-xl border-2 border-slate-200"
                        />
                        <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                          Original
                        </div>
                      </div>
                    </div>

                    {/* Edited Image */}
                    <div className="space-y-3">
                      <div className="relative">
                        <img
                          src={editedImage}
                          alt="Edited"
                          className="w-full h-64 sm:h-80 object-cover rounded-xl border-2 border-emerald-200"
                        />
                        <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                          AI {selectedEditType === 'object-remover' ? 'Removed' : 'Enhanced'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      setEditedImage(null);
                      setOriginalImage(null);
                      setSelectedImageUrl(null);
                      setAgentInstruction('');
                      setSelectedEditType(null);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Result
                  </button>

                  {/* Download Enhanced Button */}
                  <button
                    onClick={() => downloadImage(editedImage, `ai-${selectedEditType === 'object-remover' ? 'removed' : 'enhanced'}-image.jpg`)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download {selectedEditType === 'object-remover' ? 'Removed' : 'Enhanced'}
                  </button>
                </div>

                {/* Save to Gallery Option */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-800">Save to Gallery</h4>
                        <p className="text-xs text-blue-600">Keep this result in your uploaded images for future use</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!user) {
                          alert('You must be logged in to save images.');
                          return;
                        }

                        try {
                          // Download the edited image as a blob
                          const response = await fetch(editedImage);
                          const blob = await response.blob();

                          // Upload to Supabase storage
                          const timestamp = Date.now();
                          const fileName = `saved-${timestamp}-ai-${selectedEditType === 'object-remover' ? 'removed' : 'enhanced'}.jpg`;

                          const { data, error } = await supabase.storage
                            .from('images')
                            .upload(fileName, blob, {
                              contentType: 'image/jpeg',
                              cacheControl: '3600',
                            });

                          if (error) throw error;

                          // Get the public URL
                          const { data: { publicUrl } } = supabase.storage
                            .from('images')
                            .getPublicUrl(fileName);

                          // Store metadata in user_media table for user-specific filtering
                          const { error: mediaError } = await supabase
                            .from('user_media')
                            .insert({
                              user_id: user.id,
                              media_type: 'image',
                              file_name: fileName,
                              file_url: publicUrl,
                              file_size: blob.size
                            });

                          if (mediaError) {
                            console.error('Error storing media metadata:', mediaError);
                            // Don't fail the save, just log the error
                          }

                          // Refresh the uploaded images list
                          await loadUploadedImages();
                          alert('Image saved to your personal gallery successfully!');
                        } catch (error) {
                          console.error('Error saving to gallery:', error);
                          alert('Failed to save image to gallery. Please try again.');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Success Message */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center bg-emerald-100 border border-emerald-200 rounded-full px-4 py-2 sm:px-6 sm:py-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-emerald-800 font-medium text-sm sm:text-base">
                      Your image has been successfully {selectedEditType === 'object-remover' ? 'processed for object removal' : 'enhanced'} with AI!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Prompt Dialog */}
      {showSavePromptDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Save Your Prompt</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prompt Name
                </label>
                <input
                  type="text"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  placeholder="e.g., Remove background clutter"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={50}
                />
              </div>
              <div className="text-sm text-slate-600">
                <p><strong>Edit Type:</strong> {selectedEditType === 'object-remover' ? 'Object Remover' : 'Image Enhancer'}</p>
                <p className="mt-1"><strong>Prompt:</strong> {agentInstruction}</p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSavePromptDialog(false);
                  setPromptName('');
                }}
                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={savePrompt}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
              >
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
    </DashboardLayout>
  );
}