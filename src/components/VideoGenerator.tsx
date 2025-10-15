'use client';

import { useState, useRef } from 'react';

interface VideoGeneratorProps {
  onGenerate?: (images: File[], description: string) => Promise<void>;
}

export default function VideoGenerator({ onGenerate }: VideoGeneratorProps) {
  const [images, setImages] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/') || (!file.type.includes('jpeg') && !file.type.includes('png'))) {
        alert(`${file.name} is not a valid image file. Only JPEG and PNG are allowed.`);
        return false;
      }
      // Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });

    // Check total count (max 10 images)
    const totalImages = images.length + validFiles.length;
    if (totalImages > 10) {
      alert(`You can upload a maximum of 10 images. You currently have ${images.length} images.`);
      return;
    }

    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles]);
      setError(null);
    }

    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 1000);

      if (onGenerate) {
        await onGenerate(images, description);
      } else {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      setProgress(100);
      // Simulate video URL (in real implementation, this would come from the API)
      setGeneratedVideo('https://example.com/generated-video.mp4');

      clearInterval(progressInterval);
    } catch (err) {
      setError('Failed to generate video. Please try again.');
      console.error('Video generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;

    // In a real implementation, this would download the actual video file
    const link = document.createElement('a');
    link.href = generatedVideo;
    link.download = 'property-video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setImages([]);
    setDescription('');
    setGeneratedVideo(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="text-center relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-secondary-600/10 rounded-3xl blur-3xl"></div>
          </div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-3 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-800 bg-clip-text text-transparent mb-4">
              AI Video Generator
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Transform your property photos into stunning promotional videos with AI-powered storytelling
            </p>
            <div className="flex items-center justify-center mt-6 space-x-2">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-primary-500 rounded-full border-2 border-white"></div>
                <div className="w-8 h-8 bg-secondary-500 rounded-full border-2 border-white"></div>
                <div className="w-8 h-8 bg-success-500 rounded-full border-2 border-white"></div>
              </div>
              <span className="text-sm text-neutral-500 ml-3">Trusted by 10,000+ real estate professionals</span>
            </div>
          </div>
        </div>

        {/* Enhanced Upload Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center">
              <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-2 rounded-xl mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Upload Property Images
            </h2>
            <div className="text-sm text-neutral-500 bg-neutral-50 px-3 py-1 rounded-full">
              {images.length}/10 images
            </div>
          </div>

          {/* Enhanced File Upload Area with Drag & Drop */}
          <div
            className="relative border-2 border-dashed border-neutral-300 rounded-2xl p-8 sm:p-12 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-all duration-300 mb-6 touch-manipulation group cursor-pointer"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-primary-500', 'bg-primary-50');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50');
              const files = Array.from(e.dataTransfer.files);
              handleFileUpload({ target: { files } } as any);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center">
                <div className="bg-gradient-to-r from-primary-100 to-secondary-100 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg sm:text-xl text-neutral-700 font-medium mb-2">
                  Drag & drop your property images here
                </p>
                <p className="text-base text-neutral-600 mb-4">or click to browse</p>
                <div className="flex flex-wrap justify-center gap-2 text-sm text-neutral-500">
                  <span className="bg-white px-3 py-1 rounded-full border">JPEG/PNG only</span>
                  <span className="bg-white px-3 py-1 rounded-full border">Max 10 images</span>
                  <span className="bg-white px-3 py-1 rounded-full border">Up to 10MB each</span>
                </div>
              </div>
            </label>
          </div>

          {/* Enhanced Image Preview Grid */}
          {images.length > 0 && (
            <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Selected Images ({images.length}/10)
                </h3>
                <button
                  onClick={() => setImages([])}
                  className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group animate-in zoom-in-95 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
                      <div className="relative aspect-square">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Property image ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-error-500 hover:bg-error-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 touch-manipulation"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-md">
                          {index + 1}
                        </div>
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-neutral-700 truncate">
                            {image.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Property Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-neutral-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Property Description
              <span className="text-neutral-400 text-xs ml-2">(Optional)</span>
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your property to create a more personalized and engaging video. Include key features, location highlights, or special amenities..."
                className="w-full px-4 py-4 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm sm:text-base min-h-[100px] sm:min-h-[120px] bg-neutral-50/50 focus:bg-white transition-all duration-200 placeholder:text-neutral-400"
                rows={4}
              />
              <div className="absolute bottom-3 right-3 text-xs text-neutral-400">
                {description.length}/500
              </div>
            </div>
          </div>

          {/* Enhanced Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-error-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-error-800 font-medium text-sm">Error</p>
                  <p className="text-error-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Generate Button */}
          <div className="text-center">
            <button
              onClick={handleGenerate}
              disabled={images.length === 0 || isGenerating}
              className="group relative px-8 sm:px-12 py-5 sm:py-6 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 disabled:from-neutral-400 disabled:to-neutral-500 text-white font-bold text-lg sm:text-xl rounded-2xl transition-all duration-300 disabled:cursor-not-allowed w-full sm:w-auto touch-manipulation min-h-[56px] shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:hover:scale-100 overflow-hidden"
              aria-label={isGenerating ? 'Generating video, please wait' : 'Generate property video'}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-center">
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Video...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H15m2 0h1.586a1 1 0 01.707.293l.707.707A1 1 0 0021 12.414V15m0 2a2 2 0 01-2 2h-1.586a1 1 0 01-.707-.293l-.707-.707A1 1 0 0016.586 16H14m-2 2H9a2 2 0 01-2-2v-1.586a1 1 0 01.293-.707l.707-.707A1 1 0 019.414 12V9" />
                    </svg>
                    Generate Property Video
                  </>
                )}
              </div>
            </button>
          </div>
      </div>

        {/* Enhanced Progress Indicator */}
        {isGenerating && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 border border-white/20 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-3 rounded-2xl shadow-lg">
                  <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H15m2 0h1.586a1 1 0 01.707.293l.707.707A1 1 0 0021 12.414V15m0 2a2 2 0 01-2 2h-1.586a1 1 0 01-.707-.293l-.707-.707A1 1 0 0016.586 16H14m-2 2H9a2 2 0 01-2-2v-1.586a1 1 0 01.293-.707l.707-.707A1 1 0 019.414 12V9" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
                AI is Crafting Your Video
              </h3>
              <p className="text-neutral-600 text-base sm:text-lg mb-8">
                Our AI is analyzing your images and creating a stunning promotional video
              </p>

              {/* Step-by-step progress visualization */}
              <div className="max-w-md mx-auto mb-8">
                <div className="flex items-center justify-between mb-4">
                  {[
                    { step: 1, label: 'Analyzing', icon: '🔍' },
                    { step: 2, label: 'Processing', icon: '⚡' },
                    { step: 3, label: 'Generating', icon: '🎬' },
                    { step: 4, label: 'Finalizing', icon: '✨' }
                  ].map((step, index) => {
                    const isActive = progress >= (index + 1) * 25;
                    const isCompleted = progress > (index + 1) * 25;
                    return (
                      <div key={step.step} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 transition-all duration-300 ${
                          isCompleted ? 'bg-success-500 text-white shadow-lg' :
                          isActive ? 'bg-primary-500 text-white shadow-lg animate-pulse' :
                          'bg-neutral-200 text-neutral-400'
                        }`}>
                          {isCompleted ? '✓' : step.icon}
                        </div>
                        <span className={`text-xs font-medium ${isActive || isCompleted ? 'text-neutral-900' : 'text-neutral-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-200 rounded-full h-3 mb-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-neutral-700 text-lg font-semibold">{progress}% complete</p>
              </div>

              <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-primary-800 font-medium text-sm">Please keep this page open</p>
                    <p className="text-primary-700 text-sm mt-1">
                      Video generation typically takes 2-5 minutes. You'll be notified when it's ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Video Preview and Download */}
        {generatedVideo && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 border border-white/20 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-r from-success-500 to-emerald-500 p-3 rounded-2xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                🎉 Your Property Video is Ready!
              </h3>
              <p className="text-neutral-600 text-lg mb-8">
                Your stunning promotional video has been created successfully
              </p>

              {/* Enhanced Video Preview */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-6 sm:p-8 lg:p-10 flex items-center justify-center min-h-[250px] sm:min-h-[300px] border-2 border-dashed border-neutral-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-secondary-500/5"></div>
                  <div className="relative text-center">
                    <div className="bg-gradient-to-r from-primary-100 to-secondary-100 p-6 rounded-3xl mb-6 inline-block">
                      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-neutral-700 mb-3 text-xl font-semibold">Video Generated Successfully!</p>
                    <p className="text-neutral-500 text-base max-w-md mx-auto leading-relaxed">
                      Your professional property video is ready for download. Click the button below to save it to your device.
                    </p>
                    <div className="flex items-center justify-center mt-4 space-x-4 text-sm text-neutral-400">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Just created
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0V1m10 3V1m0 3l1 1v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5l1-1z" />
                        </svg>
                        MP4 format
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleDownload}
                  className="group relative px-8 sm:px-10 py-5 sm:py-6 bg-gradient-to-r from-success-500 to-emerald-600 hover:from-success-600 hover:to-emerald-700 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 overflow-hidden touch-manipulation min-h-[56px]"
                  aria-label="Download generated video"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Video
                  </div>
                </button>
                <button
                  onClick={resetForm}
                  className="px-8 sm:px-10 py-5 sm:py-6 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-lg rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-neutral-200 touch-manipulation min-h-[56px]"
                  aria-label="Create another video"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Create Another
                  </div>
                </button>
              </div>

              {/* Success message */}
              <div className="mt-8 bg-success-50 rounded-xl p-4 border border-success-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-success-800 font-medium text-sm">Video created successfully!</p>
                    <p className="text-success-700 text-sm mt-1">
                      Your video is now ready to share with potential buyers or showcase on your listings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}