'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Template, TemplateElement, TEMPLATE_CATEGORIES } from '../../types/template';

interface DragState {
  isDragging: boolean;
  draggedElement: TemplateElement | null;
  offset: { x: number; y: number };
}

export default function TemplateEditorPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Template state
  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    category: 'brochure',
    canvasWidth: 800,
    canvasHeight: 600,
    elements: []
  });

  // UI state
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedElement: null,
    offset: { x: 0, y: 0 }
  });
  const [showElementPanel, setShowElementPanel] = useState(true);

  // Add new element
  const addElement = useCallback((type: 'text' | 'image' | 'spacer') => {
    const newElement: TemplateElement = {
      id: `element-${Date.now()}`,
      type,
      content: type === 'text' ? 'Click to edit text' : type === 'image' ? '' : '',
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : type === 'image' ? 150 : 100,
      height: type === 'text' ? 40 : type === 'image' ? 150 : 20,
      editable: type === 'text',
      zIndex: template.elements?.length || 0
    };

    setTemplate(prev => ({
      ...prev,
      elements: [...(prev.elements || []), newElement]
    }));
  }, [template.elements]);

  // Handle mouse down on element
  const handleMouseDown = useCallback((e: React.MouseEvent, element: TemplateElement) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offset = {
      x: e.clientX - rect.left - element.x,
      y: e.clientY - rect.top - element.y
    };

    setDragState({
      isDragging: true,
      draggedElement: element,
      offset
    });
    setSelectedElement(element.id);
  }, []);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedElement || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragState.offset.x;
    const newY = e.clientY - rect.top - dragState.offset.y;

    setTemplate(prev => ({
      ...prev,
      elements: prev.elements?.map(el =>
        el.id === dragState.draggedElement!.id
          ? { ...el, x: Math.max(0, newX), y: Math.max(0, newY) }
          : el
      )
    }));
  }, [dragState]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedElement: null,
      offset: { x: 0, y: 0 }
    });
  }, []);

  // Update element content
  const updateElementContent = useCallback((elementId: string, content: string) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements?.map(el =>
        el.id === elementId ? { ...el, content } : el
      )
    }));
  }, []);

  // Delete element
  const deleteElement = useCallback((elementId: string) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements?.filter(el => el.id !== elementId)
    }));
    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  }, [selectedElement]);

  // Save template
  const saveTemplate = async () => {
    if (!template.name || !template.description || !template.elements?.length) {
      alert('Please fill in all required fields and add at least one element');
      return;
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        alert('Template saved successfully!');
        router.push('/templates');
      } else {
        alert('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/templates')}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ← Back to Templates
              </button>
              <div>
                <input
                  type="text"
                  placeholder="Template Name"
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
                />
                <input
                  type="text"
                  placeholder="Template Description"
                  value={template.description}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  className="text-sm text-slate-600 bg-transparent border-none focus:outline-none focus:ring-0"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={template.category}
                onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value as 'brochure' | 'flyer' | 'social-media' | 'email' | 'presentation' }))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TEMPLATE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowElementPanel(!showElementPanel)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {showElementPanel ? 'Hide' : 'Show'} Elements
              </button>
              <button
                onClick={saveTemplate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Save Template
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Element Panel */}
            {showElementPanel && (
              <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto">
                <h3 className="font-semibold text-slate-900 mb-4">Add Elements</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => addElement('text')}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="font-medium text-slate-900">📝 Text</div>
                    <div className="text-sm text-slate-600">Add editable text</div>
                  </button>
                  <button
                    onClick={() => addElement('image')}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="font-medium text-slate-900">🖼️ Image</div>
                    <div className="text-sm text-slate-600">Add image placeholder</div>
                  </button>
                  <button
                    onClick={() => addElement('spacer')}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="font-medium text-slate-900">⬜ Spacer</div>
                    <div className="text-sm text-slate-600">Add empty space</div>
                  </button>
                </div>

                {/* Element Properties */}
                {selectedElement && (
                  <div className="mt-6 pt-4 border-t border-slate-300">
                    <h4 className="font-semibold text-slate-900 mb-3">Element Properties</h4>
                    {(() => {
                      const element = template.elements?.find(el => el.id === selectedElement);
                      if (!element) return null;

                      return (
                        <div className="space-y-3">
                          {element.type === 'text' && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Text Content
                              </label>
                              <textarea
                                value={element.content}
                                onChange={(e) => updateElementContent(element.id, e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                rows={3}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Width
                              </label>
                              <input
                                type="number"
                                value={element.width}
                                onChange={(e) => setTemplate(prev => ({
                                  ...prev,
                                  elements: prev.elements?.map(el =>
                                    el.id === element.id ? { ...el, width: parseInt(e.target.value) || 100 } : el
                                  )
                                }))}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Height
                              </label>
                              <input
                                type="number"
                                value={element.height}
                                onChange={(e) => setTemplate(prev => ({
                                  ...prev,
                                  elements: prev.elements?.map(el =>
                                    el.id === element.id ? { ...el, height: parseInt(e.target.value) || 40 } : el
                                  )
                                }))}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={element.editable || false}
                              onChange={(e) => setTemplate(prev => ({
                                ...prev,
                                elements: prev.elements?.map(el =>
                                  el.id === element.id ? { ...el, editable: e.target.checked } : el
                                )
                              }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label className="ml-2 text-sm text-slate-700">
                              Editable by agents
                            </label>
                          </div>
                          <button
                            onClick={() => deleteElement(element.id)}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Delete Element
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Canvas */}
            <div className="flex-1 bg-slate-100 p-8 overflow-auto">
              <div className="flex justify-center">
                <div
                  ref={canvasRef}
                  className="relative bg-white shadow-lg border border-slate-300"
                  style={{
                    width: template.canvasWidth,
                    height: template.canvasHeight
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Canvas Grid */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                        linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px'
                    }}
                  />

                  {/* Template Elements */}
                  {template.elements?.map((element) => (
                    <div
                      key={element.id}
                      className={`absolute cursor-move border-2 transition-all ${
                        selectedElement === element.id
                          ? 'border-blue-500 shadow-lg'
                          : 'border-transparent hover:border-slate-300'
                      }`}
                      style={{
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        height: element.height,
                        zIndex: element.zIndex
                      }}
                      onMouseDown={(e) => handleMouseDown(e, element)}
                      onClick={() => setSelectedElement(element.id)}
                    >
                      {element.type === 'text' && (
                        <div className="w-full h-full flex items-center justify-center p-2">
                          <span className="text-sm text-slate-700 break-words text-center">
                            {element.content || 'Click to edit text'}
                          </span>
                        </div>
                      )}
                      {element.type === 'image' && (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                          {element.content ? (
                            <Image
                              src={element.content}
                              alt="Template image"
                              width={element.width}
                              height={element.height}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center text-slate-500">
                              <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <div className="text-xs">Image</div>
                            </div>
                          )}
                        </div>
                      )}
                      {element.type === 'spacer' && (
                        <div className="w-full h-full bg-slate-100 border-2 border-dashed border-slate-300"></div>
                      )}

                      {/* Selection indicator */}
                      {selectedElement === element.id && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))}

                  {/* Canvas dimensions indicator */}
                  <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-white px-2 py-1 rounded shadow">
                    {template.canvasWidth} × {template.canvasHeight}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}