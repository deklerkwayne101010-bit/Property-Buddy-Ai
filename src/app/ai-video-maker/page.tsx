'use client';

import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface AnalysisResult {
  imageUrl: string;
  analysis: string;
  timestamp: string;
}

export default function AiVideoMakerPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList) => {
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
        setError('Image must be less than 10MB');
        return false;
      }
      return true;
    });

    if (imageFiles.length === 0) return;

    const file = imageFiles[0];
    setIsUploading(true);
    setError(null);

    try {
      // Upload to Supabase
      const fileName = `analysis-${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('video-assets')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('video-assets')
        .getPublicUrl(fileName);

      setUploadedImage(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const analyzeImage = async () => {
    if (!uploadedImage) {
      setError('Please upload an image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadedImage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysisResult({
        imageUrl: data.imageUrl,
        analysis: data.analysis,
        timestamp: data.metadata.timestamp
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    // Clean up object URLs
    if (uploadedImage && uploadedImage.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">AI Image Analyzer</h1>
        <p className="text-slate-600">
          Upload an image and analyze it with GPT-4o AI
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
          <h2 className="text-xl font-semibold text-slate-900">Upload Image</h2>
          {uploadedImage && (
            <button
              onClick={reset}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear
            </button>
          )}
        </div>

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
            <div className="border border-slate-200 rounded-lg overflow-hidden max-w-md mx-auto">
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="w-full h-64 object-cover"
              />
            </div>

            <div className="text-center">
              <button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Generate Result</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results Table */}
      {analysisResult && (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Analysis Results</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200 rounded-lg">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">Image</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">GPT-4o Analysis</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">
                    <img
                      src={analysisResult.imageUrl}
                      alt="Analyzed"
                      className="w-24 h-24 object-cover rounded border"
                    />
                  </td>
                  <td className="border border-slate-200 px-4 py-3 max-w-md">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {analysisResult.analysis}
                    </div>
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-sm text-slate-600">
                    {new Date(analysisResult.timestamp).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}