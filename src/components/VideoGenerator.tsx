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
  const [userImage, setUserImage] = useState<UserMedia | null>(null);
  const [userVoice, setUserVoice] = useState<UserMedia | null>(null);
  const [voiceClone, setVoiceClone] = useState<UserMedia | null>(null);
  const [avatarVideo, setAvatarVideo] = useState<UserMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [scriptText, setScriptText] = useState('');
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
      setUserImage(null);
      setUserVoice(null);
      setVoiceClone(null);
      setAvatarVideo(null);
      setLoading(false);
    }
  }, [user]);

  const loadUserMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('user_media')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        // If table doesn't exist, show a helpful message
        if (error.message.includes('relation "public.user_media" does not exist')) {
          console.log('user_media table not found. Please run the supabase-setup.sql script in your Supabase SQL Editor.');
        }
        return;
      }

      // Set the most recent image, voice, voice clone, and avatar video
      const image = data?.find(item => item.media_type === 'image');
      const voice = data?.find(item => item.media_type === 'voice');
      const clone = data?.find(item => item.media_type === 'voice_clone');
      const avatar = data?.find(item => item.media_type === 'avatar_video');

      setUserImage(image || null);
      setUserVoice(voice || null);
      setVoiceClone(clone || null);
      setAvatarVideo(avatar || null);
    } catch (error) {
      console.error('Error loading user media:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, mediaType: 'image' | 'voice') => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${mediaType}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('video-assets')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('user_media')
        .insert({
          user_id: user.id,
          media_type: mediaType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      // Reload media
      await loadUserMedia();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file, 'image');
    } else {
      alert('Please select a valid image file.');
    }
  };

  const handleVoiceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.startsWith('audio/') || file.type === 'video/webm')) {
      uploadFile(file, 'voice');
    } else {
      alert('Please select a valid audio file.');
    }
  };

  const generateVoiceClone = async () => {
    if (!userVoice || !scriptText.trim()) {
      alert('Please upload a voice recording and enter a script first.');
      return;
    }

    setIsGeneratingVoice(true);
    try {
      const response = await fetch('/api/voice-clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptText: scriptText.trim(),
          speakerUrl: userVoice.file_url,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate voice clone');
      }

      const data = await response.json();
      console.log('Voice clone API response:', data);

      if (!data.voiceCloneUrl) {
        throw new Error('No voice clone URL received from API');
      }

      // Save the voice clone to database
      console.log('Attempting to save to database...');
      const { data: insertData, error: dbError } = await supabase
        .from('user_media')
        .insert({
          user_id: user?.id,
          media_type: 'voice_clone',
          file_name: `voice_clone_${Date.now()}.wav`,
          file_url: data.voiceCloneUrl,
          file_size: 0, // We'll get this from the API response if available
        })
        .select();

      if (dbError) {
        console.error('Database insert error:', dbError);
        console.error('Error code:', dbError.code);
        console.error('Error message:', dbError.message);
        console.error('Error details:', dbError.details);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Voice clone saved to database successfully:', insertData);

      // Reload media to show the new voice clone
      await loadUserMedia();
      setScriptText(''); // Clear the script input
    } catch (error) {
      console.error('Error generating voice clone:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        alert(`Error generating voice clone: ${error.message}`);
      } else {
        console.error('Unknown error:', error);
        alert('Error generating voice clone. Please try again.');
      }
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const generateAvatarVideo = async () => {
    if (!userImage || !voiceClone) {
      alert('Please upload an image and generate a voice clone first.');
      return;
    }

    setIsGeneratingAvatar(true);
    try {
      const response = await fetch('/api/avatar-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: userImage.file_url,
          audioUrl: voiceClone.file_url,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate avatar video');
      }

      const data = await response.json();
      console.log('Avatar generation response:', data);

      if (!data.avatarVideoUrl) {
        throw new Error('No avatar video URL received from API');
      }

      // Save the avatar video to database
      console.log('Attempting to save avatar video to database...');
      const { data: insertData, error: dbError } = await supabase
        .from('user_media')
        .insert({
          user_id: user?.id,
          media_type: 'avatar_video',
          file_name: `avatar_video_${Date.now()}.mp4`,
          file_url: data.avatarVideoUrl,
          file_size: 0, // We'll get this from the API response if available
        })
        .select();

      if (dbError) {
        console.error('Database insert error:', dbError);
        console.error('Error code:', dbError.code);
        console.error('Error message:', dbError.message);
        console.error('Error details:', dbError.details);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Avatar video saved to database successfully:', insertData);

      // Reload media to show the new avatar video
      await loadUserMedia();
    } catch (error) {
      console.error('Error generating avatar video:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        alert(`Error generating avatar video: ${error.message}`);
      } else {
        console.error('Unknown error:', error);
        alert('Error generating avatar video. Please try again.');
      }
    } finally {
      setIsGeneratingAvatar(false);
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
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Video Generator</h1>
        <p className="text-gray-600">Step 1: Upload your personal media</p>
      </div>

      {/* Image Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
          Upload Your Photo
        </h2>

        {userImage ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <img
                src={userImage.file_url}
                alt="Your uploaded image"
                className="w-24 h-24 object-cover rounded-lg border"
              />
              <div className="flex-1">
                <p className="font-medium">{userImage.file_name}</p>
                <p className="text-sm text-gray-500">
                  {(userImage.file_size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-sm text-gray-500">
                  Uploaded: {new Date(userImage.created_at).toLocaleDateString()}
                </p>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public URL:
                  </label>
                  <input
                    type="text"
                    value={userImage.file_url}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                    onClick={(e) => e.currentTarget.select()}
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => document.getElementById('image-upload')?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Replace Image'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="space-y-4">
              <div className="text-gray-400">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">No image uploaded yet</p>
                <p className="text-gray-500">Upload a photo of yourself for the video avatar</p>
              </div>
              <button
                onClick={() => document.getElementById('image-upload')?.click()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
          </div>
        )}

        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Voice Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
          Upload Your Voice Recording
        </h2>

        {userVoice ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">{userVoice.file_name}</p>
                <p className="text-sm text-gray-500">
                  {(userVoice.file_size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-sm text-gray-500">
                  Uploaded: {new Date(userVoice.created_at).toLocaleDateString()}
                </p>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public URL:
                  </label>
                  <input
                    type="text"
                    value={userVoice.file_url}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                    onClick={(e) => e.currentTarget.select()}
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => document.getElementById('voice-upload')?.click()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Replace Voice'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="space-y-4">
              <div className="text-gray-400">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">No voice recording uploaded yet</p>
                <p className="text-gray-500">Upload an audio recording of your voice for voice cloning</p>
              </div>
              <button
                onClick={() => document.getElementById('voice-upload')?.click()}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Voice'}
              </button>
            </div>
          </div>
        )}

        <input
          id="voice-upload"
          type="file"
          accept="audio/*,video/webm"
          onChange={handleVoiceUpload}
          className="hidden"
        />
      </div>

      {/* Step 2: Voice Cloning */}
      {(userImage && userVoice) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
            Generate Voice Clone
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Script Text (what you want your AI voice to say):
              </label>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Enter the script text that will be spoken in your voice..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <button
              onClick={generateVoiceClone}
              disabled={isGeneratingVoice || !scriptText.trim()}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isGeneratingVoice ? 'Generating Voice Clone...' : 'Generate Voice Clone'}
            </button>

            {/* Voice Clone Preview */}
            {isGeneratingVoice && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                  <span className="text-purple-700 font-medium">Generating your voice clone...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Clone Result */}
      {voiceClone && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">✓</span>
            Voice Clone Generated
          </h2>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-purple-900">Voice Clone Preview</p>
                  <p className="text-sm text-purple-600">
                    Generated: {new Date(voiceClone.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.open(voiceClone.file_url, '_blank')}
                className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
              >
                Download
              </button>
            </div>

            <div className="mt-4">
              <audio controls className="w-full">
                <source src={voiceClone.file_url} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-purple-700 mb-1">
                Voice Clone URL:
              </label>
              <input
                type="text"
                value={voiceClone.file_url}
                readOnly
                className="w-full px-2 py-1 border border-purple-300 rounded text-xs font-mono bg-white"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Avatar Video Result */}
      {avatarVideo && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">✓</span>
            Avatar Video Generated
          </h2>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-indigo-900">Avatar Video Preview</p>
                  <p className="text-sm text-indigo-600">
                    Generated: {new Date(avatarVideo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.open(avatarVideo.file_url, '_blank')}
                className="px-3 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 transition-colors"
              >
                Download
              </button>
            </div>

            <div className="mt-4">
              <video controls className="w-full rounded-lg">
                <source src={avatarVideo.file_url} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-indigo-700 mb-1">
                Avatar Video URL:
              </label>
              <input
                type="text"
                value={avatarVideo.file_url}
                readOnly
                className="w-full px-2 py-1 border border-indigo-300 rounded text-xs font-mono bg-white"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Avatar Video Generation - Last Step */}
      {(userImage && userVoice && voiceClone) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
            Generate Avatar Video
          </h2>

          <div className="space-y-4">
            <p className="text-gray-600">
              Create an animated avatar video using your photo and voice clone.
            </p>

            <button
              onClick={generateAvatarVideo}
              disabled={isGeneratingAvatar}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isGeneratingAvatar ? 'Generating Avatar Video...' : 'Generate Avatar Video'}
            </button>

            {/* Avatar Video Preview */}
            {isGeneratingAvatar && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                  <span className="text-indigo-700 font-medium">Generating your avatar video...</span>
                </div>
                <p className="text-sm text-indigo-600 mt-2">
                  This may take several minutes as the AI creates your animated avatar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
