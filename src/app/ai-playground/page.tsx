'use client';

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

interface UploadedImage {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
}

export default function AIPlayground() {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedReferenceImages, setSelectedReferenceImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded images and generated images on component mount
  useEffect(() => {
    loadUploadedImages();
    loadGeneratedImages();
    loadCredits();
  }, []);

  const loadCredits = async () => {
    if (!user) return;

    try {
      const { data: credits, error } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading credits:', error);
        return;
      }

      setCreditsRemaining(credits?.credits_balance || 0);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const loadUploadedImages = async () => {
    if (!user) return;

    try {
      const { data: userMedia, error } = await supabase
        .from('user_media')
        .select('*')
        .eq('user_id', user.id)
        .eq('media_type', 'image')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading user images:', error);
        return;
      }

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

  const loadGeneratedImages = async () => {
    if (!user) return;

    try {
      const { data: images, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .eq('tool_type', 'ai_playground')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading generated images:', error);
        return;
      }

      setGeneratedImages(images || []);
    } catch (error) {
      console.error('Error loading generated images:', error);
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
      const fileName = `playground-ref-${timestamp}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

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
      }

      await loadUploadedImages();
      alert('Reference image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
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

  const toggleReferenceImage = (imageUrl: string) => {
    setSelectedReferenceImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      } else if (prev.length < 4) {
        return [...prev, imageUrl];
      } else {
        return [prev[1], prev[2], prev[3], imageUrl];
      }
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for the AI.');
      return;
    }

    if (!user) {
      alert('You must be logged in to use AI Playground.');
      return;
    }

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStep('Sending prompt to AI...');

    try {
      setLoadingProgress(30);
      setLoadingStep('AI is generating your image...');

      const response = await fetch('/api/ai-playground', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageUrls: selectedReferenceImages,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      setLoadingProgress(70);
      setLoadingStep('Processing your generated image...');

      const { image_url, credits_remaining } = await response.json();

      setLoadingProgress(90);
      setLoadingStep('Saving your result...');

      // Save to generated images
      const { error: saveError } = await supabase
        .from('generated_images')
        .insert({
          user_id: user.id,
          tool_type: 'ai_playground',
          image_url: image_url,
          prompt: prompt.trim(),
          reference_images: selectedReferenceImages
        });

      if (saveError) {
        console.error('Error saving generated image:', saveError);
      }

      setLoadingProgress(100);
      setLoadingStep('Complete!');

      // Update credits and reload images
      setCreditsRemaining(credits_remaining);
      await loadGeneratedImages();

      // Small delay to show completion
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStep('');
      }, 500);

    } catch (error) {
      console.error('Error generating image:', error);
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setIsLoading(false);
      setLoadingProgress(0);
      setLoadingStep('');
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      window.open(url, '_blank');
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
        {/* Compact Hero Section */}
        <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                AI Playground
              </h1>

              <p className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto">
                Experiment with Google's Nano Banana Pro AI model. Upload reference images and craft creative prompts to generate unique images.
              </p>

              {/* Credits Badge */}
              <div className="inline-flex items-center bg-purple-50 border border-purple-200 rounded-full px-3 py-1.5 mb-6">
                <span className="text-purple-700 text-sm font-medium">
                  {creditsRemaining !== null ? `${creditsRemaining} Credits Remaining` : 'Loading credits...'}
                </span>
              </div>

              {/* Cost Information */}
              <div className="inline-flex items-center bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 mb-6">
                <span className="text-orange-700 text-sm font-medium">
                  5 Credits per generation
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid gap-8 lg:gap-12 max-w-5xl mx-auto">

            {/* Reference Images Upload Section */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Reference Images (Optional)
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">Upload images to guide the AI's creative process</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-purple-400 hover:bg-purple-50/30"
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

                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-800 mb-1">Drop reference images here</p>
                      <p className="text-sm text-slate-600">or click to browse files (max 4 images)</p>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">JPEG</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md">PNG</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reference Images Gallery */}
            {uploadedImages.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Your Reference Images
                      </h2>
                      <p className="text-sm text-slate-600 mt-0.5">Select images to use as reference for AI generation</p>
                    </div>
                    <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      {selectedReferenceImages.length}/4 selected
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {uploadedImages.map((image) => (
                      <div
                        key={image.id}
                        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                          selectedReferenceImages.includes(image.url)
                            ? 'border-purple-500 shadow-lg shadow-purple-500/30'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => toggleReferenceImage(image.url)}
                      >
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="w-full h-24 sm:h-32 object-cover"
                        />

                        <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 ${
                          selectedReferenceImages.includes(image.url) ? 'bg-purple-500/10' : ''
                        }`}>

                          {selectedReferenceImages.includes(image.url) && (
                            <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1">
                              <span className="text-xs font-bold">
                                {selectedReferenceImages.indexOf(image.url) + 1}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Prompt Input Section */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      AI Prompt
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">Describe what you want the AI to create</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., A futuristic cityscape at sunset with flying cars, cyberpunk aesthetic, highly detailed, 8k resolution..."
                      className="w-full px-4 sm:px-6 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-slate-50/50 hover:bg-white hover:border-slate-300 text-sm sm:text-base"
                      rows={6}
                      maxLength={1000}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                      {prompt.length}/1000
                    </div>
                  </div>

                  {/* Quick Examples */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Quick inspiration:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "A serene mountain landscape at dawn",
                        "Cyberpunk city street at night",
                        "Abstract geometric art in vibrant colors",
                        "Steampunk flying machine over Victorian London",
                        "Surreal underwater city with bioluminescent creatures",
                        "Minimalist portrait in the style of Picasso",
                        "Cosmic nebula with swirling galaxies",
                        "Vintage travel poster for Mars colony"
                      ].map((example, index) => (
                        <button
                          key={index}
                          onClick={() => setPrompt(example)}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-slate-100 to-slate-50 hover:from-purple-100 hover:to-purple-50 text-slate-700 hover:text-purple-700 rounded-full border border-slate-200 hover:border-purple-300 transition-all duration-200 hover:scale-105 hover:shadow-md"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="p-6 text-center">
                {isLoading ? (
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${loadingProgress}%` }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <p className="text-lg font-semibold text-slate-800">{loadingStep}</p>
                      <p className="text-sm text-slate-600">This usually takes 10-30 seconds</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || (creditsRemaining !== null && creditsRemaining < 5)}
                    className="group relative bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 text-white font-bold py-3 px-8 sm:py-4 sm:px-12 rounded-2xl transition-all duration-500 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none overflow-hidden text-sm sm:text-lg"
                  >
                    <div className="relative z-10 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Generate with AI (5 Credits)</span>
                    </div>
                    {!isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    )}
                  </button>
                )}

                {(!prompt.trim() || (creditsRemaining !== null && creditsRemaining < 1)) && (
                  <div className="mt-4 text-xs sm:text-sm text-slate-500">
                    {!prompt.trim() && !(!creditsRemaining || creditsRemaining < 5) && "Please enter a prompt first"}
                    {creditsRemaining !== null && creditsRemaining < 5 && "Insufficient credits - please purchase more credits"}
                  </div>
                )}
              </div>
            </div>

            {/* Generated Images Gallery */}
            {generatedImages.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Your Generated Images
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">Images created with AI Playground</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generatedImages.map((image) => (
                      <div key={image.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="aspect-square mb-4">
                          <img
                            src={image.url}
                            alt={`Generated: ${image.prompt}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-slate-700 line-clamp-2">{image.prompt}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {new Date(image.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => downloadImage(image.url, `ai-playground-${image.id}.png`)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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