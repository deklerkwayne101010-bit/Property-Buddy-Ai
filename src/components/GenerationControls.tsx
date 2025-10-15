'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { hoverLift, hoverGlow, bounce } from './animations';
import LoadingSpinner from './LoadingSpinner';

interface GenerationControlsProps {
  onGenerate: (settings: GenerationSettings) => void;
}

export interface GenerationSettings {
  platforms: string[];
  tone: string;
  length: string;
  variations: number;
  seoKeywords: string;
}

export default function GenerationControls({ onGenerate }: GenerationControlsProps) {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Medium');
  const [variations, setVariations] = useState(1);
  const [seoKeywords, setSeoKeywords] = useState('');

  const platformOptions = [
    'Property24',
    'WhatsApp Status',
    'Facebook Post',
    'Instagram Caption',
    'Email Blurb',
    'SMS'
  ];

  const toneOptions = [
    'Professional',
    'Luxury',
    'Friendly',
    'Conversational',
    'Short & Punchy'
  ];

  const lengthOptions = ['Short', 'Medium', 'Long'];

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      setPlatforms([...platforms, platform]);
    } else {
      setPlatforms(platforms.filter(p => p !== platform));
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (platforms.length === 0) return;

    setIsGenerating(true);
    try {
      await onGenerate({
        platforms,
        tone,
        length,
        variations,
        seoKeywords
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-100/50 p-8 mb-8 backdrop-blur-sm hover:shadow-2xl hover:shadow-blue-500/15 transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      {...hoverGlow}
    >
      <div className="flex items-center space-x-3 mb-6">
        <motion.div
          className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </motion.div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">AI Generation Controls</h3>
          <p className="text-sm text-gray-600">Configure your property description generation settings</p>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Target Platforms
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {platformOptions.map((platform) => (
            <label key={platform} className="group relative">
              <input
                type="checkbox"
                checked={platforms.includes(platform)}
                onChange={(e) => handlePlatformChange(platform, e.target.checked)}
                className="sr-only peer"
              />
              <div className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                platforms.includes(platform)
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-300 shadow-lg shadow-blue-500/25'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded border-2 mr-3 transition-all ${
                    platforms.includes(platform)
                      ? 'bg-white border-white'
                      : 'border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {platforms.includes(platform) && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    platforms.includes(platform) ? 'text-white' : 'text-gray-700 group-hover:text-blue-700'
                  }`}>
                    {platform}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Tone Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Writing Tone
        </label>
        <div className="relative">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 hover:border-purple-300 appearance-none"
          >
            {toneOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Length Slider */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0V1m10 3V1m0 3l1 1v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5l1-1z" />
          </svg>
          Content Length
        </label>
        <div className="flex items-center space-x-3">
          {lengthOptions.map((option) => (
            <button
              key={option}
              onClick={() => setLength(option)}
              className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                length === option
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-300 hover:shadow-md'
              }`}
            >
              {option}
              {length === option && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Variations Count */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Number of Variations
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Generate {variations} version{variations !== 1 ? 's' : ''}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setVariations(Math.max(1, variations - 1))}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-8 text-center font-semibold text-orange-600">{variations}</span>
              <button
                onClick={() => setVariations(Math.min(5, variations + 1))}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="1"
              max="5"
              value={variations}
              onChange={(e) => setVariations(Number(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-orange-200 to-orange-400 rounded-lg appearance-none cursor-pointer slider-orange"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1</span>
              <span>5</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Keywords */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          SEO Keywords (Optional)
        </label>
        <input
          type="text"
          value={seoKeywords}
          onChange={(e) => setSeoKeywords(e.target.value)}
          placeholder="luxury apartment, modern kitchen, sea view..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all duration-200 hover:border-indigo-300"
        />
        <p className="text-xs text-gray-500 mt-2">Separate keywords with commas for better search optimization</p>
      </div>

      {/* Generate Button */}
      <motion.button
        onClick={handleGenerate}
        disabled={platforms.length === 0 || isGenerating}
        className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-400 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl shadow-lg disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed relative overflow-hidden group"
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        {...bounce}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <div className="relative flex items-center justify-center space-x-3">
          {isGenerating ? (
            <>
              <LoadingSpinner size="sm" variant="dots" color="gray" />
              <span className="text-lg">Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-lg">Generate AI Descriptions</span>
            </>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}