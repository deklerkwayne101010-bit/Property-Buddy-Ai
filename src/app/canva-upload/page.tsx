'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { CanvaTemplate, EditableZone } from '../../types/template';

export default function CanvaUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template state
  const [template, setTemplate] = useState<Partial<CanvaTemplate>>({
    name: '',
    description: '',
    category: 'brochure',
    backgroundImage: '',
    editableZones: [],
    canvasWidth: 800,
    canvasHeight: 600,
    isPublic: true,
    tags: []
  });

  // UI state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingZone, setEditingZone] = useState<EditableZone | null>(null);

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'templates');

      // Upload to your storage (you'll need to implement this API endpoint)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.url;

      setUploadedImage(imageUrl);
      setTemplate(prev => ({ ...prev, backgroundImage: imageUrl }));

      // Try to get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setTemplate(prev => ({
          ...prev,
          canvasWidth: img.width,
          canvasHeight: img.height
        }));
      };
      img.src = imageUrl;

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Add editable zone
  const addEditableZone = (type: 'text' | 'image') => {
    const newZone: EditableZone = {
      id: `zone-${Date.now()}`,
      type,
      label: type === 'text' ? 'New Text Field' : 'New Image Zone',
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : 150,
      height: type === 'text' ? 40 : 150,
      defaultValue: type === 'text' ? 'Click to edit' : '',
      placeholder: type === 'text' ? 'Enter text here' : 'Upload image',
      required: false
    };

    setTemplate(prev => ({
      ...prev,
      editableZones: [...(prev.editableZones || []), newZone]
    }));
  };

  // Update zone
  const updateZone = (zoneId: string, updates: Partial<EditableZone>) => {
    setTemplate(prev => ({
      ...prev,
      editableZones: prev.editableZones?.map(zone =>
        zone.id === zoneId ? { ...zone, ...updates } : zone
      )
    }));
  };

  // Delete zone
  const deleteZone = (zoneId: string) => {
    setTemplate(prev => ({
      ...prev,
      editableZones: prev.editableZones?.filter(zone => zone.id !== zoneId)
    }));
  };

  // Save template
  const saveTemplate = async () => {
    if (!template.name || !template.backgroundImage || !template.editableZones?.length) {
      alert('Please fill in all required fields and add at least one editable zone');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/canva-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        alert('Canva template saved successfully!');
        router.push('/templates');
      } else {
        alert('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between py-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Upload Canva Template
              </h1>
              <p className="text-xl text-slate-600">
                Upload your Canva design and define editable zones for your agents.
              </p>
            </div>
            <button
              onClick={() => router.push('/templates')}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ← Back to Templates
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel - Template Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Template Info</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={template.name}
                      onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Luxury Property Brochure"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={template.description}
                      onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe what this template is for..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category
                    </label>
                    <select
                      value={template.category}
                      onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value as 'brochure' | 'flyer' | 'social-media' | 'email' | 'presentation' }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="brochure">📄 Property Brochures</option>
                      <option value="flyer">📄 Marketing Flyers</option>
                      <option value="social-media">📱 Social Media Posts</option>
                      <option value="email">📧 Email Templates</option>
                      <option value="presentation">📊 Presentations</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Canva Design</h3>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : '📤 Upload Canva Design'}
                  </button>
                  {uploadedImage && (
                    <div className="text-sm text-green-600">
                      ✅ Design uploaded successfully
                    </div>
                  )}
                </div>
              </div>

              {/* Add Editable Zones */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Editable Zones</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => addEditableZone('text')}
                    className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors text-left"
                  >
                    <div className="font-medium text-slate-900">📝 Add Text Zone</div>
                    <div className="text-sm text-slate-600">Agents can edit text content</div>
                  </button>
                  <button
                    onClick={() => addEditableZone('image')}
                    className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors text-left"
                  >
                    <div className="font-medium text-slate-900">🖼️ Add Image Zone</div>
                    <div className="text-sm text-slate-600">Agents can upload images</div>
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveTemplate}
                disabled={isSaving || !template.name || !uploadedImage}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isSaving ? 'Saving...' : '💾 Save Template'}
              </button>
            </div>

            {/* Right Panel - Canvas Preview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Template Preview</h3>

                {uploadedImage ? (
                  <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                    {/* Background Image */}
                    <Image
                      src={uploadedImage}
                      alt="Template background"
                      width={template.canvasWidth || 800}
                      height={template.canvasHeight || 600}
                      className="w-full h-auto"
                      style={{
                        maxWidth: '100%',
                        height: 'auto'
                      }}
                    />

                    {/* Editable Zones Overlay */}
                    {template.editableZones?.map((zone) => (
                      <div
                        key={zone.id}
                        className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-pointer hover:bg-blue-500/30 transition-colors"
                        style={{
                          left: `${(zone.x / template.canvasWidth!) * 100}%`,
                          top: `${(zone.y / template.canvasHeight!) * 100}%`,
                          width: `${(zone.width / template.canvasWidth!) * 100}%`,
                          height: `${(zone.height / template.canvasHeight!) * 100}%`,
                        }}
                        onClick={() => setEditingZone(zone)}
                        title={`${zone.label} - Click to edit`}
                      >
                        <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {zone.label}
                        </div>
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-blue-700 font-medium text-sm">
                            {zone.type === 'text' ? 'T' : '🖼️'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Canvas Dimensions Indicator */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {template.canvasWidth} × {template.canvasHeight}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-slate-900 mb-2">Upload Your Canva Design</h4>
                    <p className="text-slate-600 mb-4">
                      Export your design from Canva as PNG or JPG and upload it here
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Choose File
                    </button>
                  </div>
                )}

                {/* Zone List */}
                {template.editableZones && template.editableZones.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Editable Zones ({template.editableZones.length})</h4>
                    <div className="space-y-2">
                      {template.editableZones.map((zone) => (
                        <div key={zone.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{zone.type === 'text' ? '📝' : '🖼️'}</span>
                            <div>
                              <div className="font-medium text-slate-900">{zone.label}</div>
                              <div className="text-sm text-slate-600">
                                {zone.width}×{zone.height} at ({zone.x}, {zone.y})
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingZone(zone)}
                              className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteZone(zone.id)}
                              className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                            >
                              Delete
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

          {/* Edit Zone Modal */}
          {editingZone && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Zone</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Zone Label
                    </label>
                    <input
                      type="text"
                      value={editingZone.label}
                      onChange={(e) => setEditingZone(prev => prev ? { ...prev, label: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {editingZone.type === 'text' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Default Text
                        </label>
                        <input
                          type="text"
                          value={editingZone.defaultValue || ''}
                          onChange={(e) => setEditingZone(prev => prev ? { ...prev, defaultValue: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={editingZone.placeholder || ''}
                          onChange={(e) => setEditingZone(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingZone.required || false}
                      onChange={(e) => setEditingZone(prev => prev ? { ...prev, required: e.target.checked } : null)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-slate-700">
                      Required field
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setEditingZone(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editingZone) {
                        updateZone(editingZone.id, editingZone);
                        setEditingZone(null);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
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