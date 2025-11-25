'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Canvas from '../../components/canvas-editor/Canvas';
import PropertiesPanel from '../../components/canvas-editor/PropertiesPanel';
import Toolbar from '../../components/canvas-editor/Toolbar';
import ContextToolbar from '../../components/canvas-editor/ContextToolbar';
import Sidebar from '../../components/canvas-editor/Sidebar';
import { CanvasElement, ElementType, ShapeType } from '../../lib/canvas-types';


// Simple UUID generator fallback
const generateId = () => Math.random().toString(36).substr(2, 9);

const TemplateEditorPage: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fileName, setFileName] = useState('Untitled Design');
  const [zoom, setZoom] = useState(1);
  const [cropMode, setCropMode] = useState(false);

  // Undo/Redo Logic
  const addToHistory = useCallback((newElements: CanvasElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Initial load
  useEffect(() => {
    if (history.length === 0) {
      addToHistory([]);
    }
  }, [addToHistory, history.length]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  // Element Management
  const addElement = (type: ElementType, payload: Partial<CanvasElement> = {}) => {
    const newElement: CanvasElement = {
      id: generateId(),
      type,
      x: 200, // Default center-ish
      y: 200,
      width: type === ElementType.TEXT ? 300 : 200,
      height: type === ElementType.TEXT ? 100 : 200,
      rotation: 0,
      zIndex: elements.length + 1,
      opacity: 1,
      ...payload
    };

    // Defaults for specific types
    if (type === ElementType.SHAPE && !payload.backgroundColor) {
      newElement.backgroundColor = '#94a3b8'; // Slate 400
      newElement.shapeType = ShapeType.RECTANGLE;
    }
    if (type === ElementType.TEXT && !payload.color) {
      newElement.color = '#1e293b'; // Slate 800
    }

    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
    setElements(newElements);
  };

  const deleteElement = useCallback((id?: string) => {
    const targetId = typeof id === 'string' ? id : selectedId;
    if (targetId) {
      const newElements = elements.filter(el => el.id !== targetId);
      setElements(newElements);
      addToHistory(newElements);
      if (targetId === selectedId) setSelectedId(null);
    }
  }, [elements, selectedId, addToHistory]);

  const duplicateElement = (id: string) => {
    const elementToCopy = elements.find(el => el.id === id);
    if (elementToCopy) {
      const newElement = {
        ...elementToCopy,
        id: generateId(),
        x: elementToCopy.x + 20,
        y: elementToCopy.y + 20,
        zIndex: elements.length + 1
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setSelectedId(newElement.id);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        // Check if not editing text
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          deleteElement();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteElement, handleUndo, handleRedo]);

  const handleDownload = async () => {
    try {
      // Show loading message
      const loadingMsg = document.createElement('div');
      loadingMsg.textContent = 'Generating image...';
      loadingMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 9999;
        font-family: Arial, sans-serif;
        pointer-events: none;
      `;
      document.body.appendChild(loadingMsg);

      // Create a new canvas element for manual rendering
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Unable to create canvas context');
      }

      // Set canvas size to Facebook optimal dimensions (higher resolution for better quality)
      const scale = 2; // 2x scale for high quality
      exportCanvas.width = 1200 * scale;
      exportCanvas.height = 630 * scale;

      // Scale context for high DPI
      ctx.scale(scale, scale);

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 630);

      // Sort elements by z-index for proper layering
      const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

      // Render each element manually
      for (const element of sortedElements) {
        ctx.save();

        // Apply transformations
        ctx.translate(element.x, element.y);
        if (element.rotation) {
          ctx.rotate((element.rotation * Math.PI) / 180);
        }
        if (element.opacity !== undefined && element.opacity !== 1) {
          ctx.globalAlpha = element.opacity;
        }

        if (element.type === ElementType.TEXT) {
          // Render text element
          if (!element.content) continue;

          // Calculate optimal font size to fit text within the box
          const text = element.content;
          const maxWidth = element.width - 20; // Padding
          const maxHeight = element.height - 20; // Padding
          const lines = text.split('\n');

          // Start with a reasonable font size and scale down if needed
          const fontSize = Math.min(element.fontSize || 32, maxHeight / lines.length * 0.8);

          // Binary search for optimal font size
          let minSize = 8;
          let maxSize = fontSize * 2;

          while (maxSize - minSize > 1) {
            const testSize = (minSize + maxSize) / 2;
            ctx.font = `${element.fontStyle || 'normal'} ${element.fontWeight || 'normal'} ${testSize}px ${element.fontFamily || 'Arial, sans-serif'}`;

            let totalHeight = 0;
            let fitsWidth = true;

            for (const line of lines) {
              const metrics = ctx.measureText(line);
              if (metrics.width > maxWidth) {
                fitsWidth = false;
                break;
              }
              totalHeight += testSize * 1.2; // Line height
            }

            if (fitsWidth && totalHeight <= maxHeight) {
              minSize = testSize;
            } else {
              maxSize = testSize;
            }
          }

          // Use the optimal font size
          const optimalFontSize = Math.floor(minSize);
          ctx.font = `${element.fontStyle || 'normal'} ${element.fontWeight || 'normal'} ${optimalFontSize}px ${element.fontFamily || 'Arial, sans-serif'}`;
          ctx.fillStyle = element.color || '#000000';
          ctx.textAlign = (element.textAlign as CanvasTextAlign) || 'left';

          // Render text with calculated font size
          const lineHeight = optimalFontSize * 1.2;
          let y = 10; // Top padding

          for (const line of lines) {
            if (element.textAlign === 'center') {
              ctx.fillText(line, element.width / 2, y);
            } else if (element.textAlign === 'right') {
              ctx.fillText(line, element.width - 10, y);
            } else {
              ctx.fillText(line, 10, y);
            }
            y += lineHeight;
          }

        } else if (element.type === ElementType.IMAGE && element.src) {
          // Render image element
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            // Wait for image to load
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = element.src!;
            });

            // Apply border radius if specified
            if (element.borderRadius && element.borderRadius > 0) {
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(0, 0, element.width, element.height, element.borderRadius);
              ctx.clip();
            }

            // Handle cropping if crop properties are set
            if (element.cropX !== undefined && element.cropY !== undefined &&
                element.cropWidth !== undefined && element.cropHeight !== undefined) {
              // Draw the cropped portion of the image
              const sourceX = element.cropX;
              const sourceY = element.cropY;
              const sourceWidth = element.cropWidth;
              const sourceHeight = element.cropHeight;

              ctx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
                0, 0, element.width, element.height // Destination rectangle
              );
            } else {
              // Draw the full image
              ctx.drawImage(img, 0, 0, element.width, element.height);
            }

            if (element.borderRadius && element.borderRadius > 0) {
              ctx.restore();
            }

          } catch (imageError) {
            console.warn('Failed to load image for export:', element.src, imageError);
            // Draw a placeholder rectangle for failed images
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, element.width, element.height);
            ctx.strokeStyle = '#d1d5db';
            ctx.strokeRect(0, 0, element.width, element.height);
          }

        } else if (element.type === ElementType.SHAPE) {
          // Render shape element
          ctx.fillStyle = element.backgroundColor || '#94a3b8';

          if (element.shapeType === ShapeType.TRIANGLE) {
            ctx.beginPath();
            ctx.moveTo(element.width / 2, 0);
            ctx.lineTo(0, element.height);
            ctx.lineTo(element.width, element.height);
            ctx.closePath();
            ctx.fill();
          } else {
            // Rectangle (default)
            if (element.borderRadius && element.borderRadius > 0) {
              ctx.beginPath();
              ctx.roundRect(0, 0, element.width, element.height, element.borderRadius);
              ctx.fill();
            } else {
              ctx.fillRect(0, 0, element.width, element.height);
            }
          }
        }

        ctx.restore();
      }

      // Remove loading message
      if (document.body.contains(loadingMsg)) {
        document.body.removeChild(loadingMsg);
      }

      // Convert to blob and download
      exportCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Show success message
          const successMsg = document.createElement('div');
          successMsg.textContent = 'Image exported successfully!';
          successMsg.className = 'fade-out';
          successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            pointer-events: none;
          `;
          document.body.appendChild(successMsg);
          setTimeout(() => {
            if (document.body.contains(successMsg)) {
              document.body.removeChild(successMsg);
            }
          }, 3000);
        } else {
          alert('Failed to generate image. Please try again.');
        }
      }, 'image/png');

    } catch (error) {
      console.error('Export failed:', error);

      // Remove loading message if it exists
      const loadingMsg = document.querySelector('div[style*="Generating image"]');
      if (loadingMsg && document.body.contains(loadingMsg)) {
        document.body.removeChild(loadingMsg);
      }

      // Provide specific error messages for known issues
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          errorMessage = 'Export failed due to image loading restrictions. Make sure all images are from trusted sources or try using images from the same domain.';
        } else if (error.message.includes('canvas')) {
          errorMessage = 'Export failed due to canvas rendering issues. Try refreshing the page or using a different browser.';
        } else {
          errorMessage = error.message;
        }
      }

      alert(`Failed to export image: ${errorMessage}`);
    }
  };

  const selectedElement = elements.find(el => el.id === selectedId) || null;

  const handleToggleCropMode = () => {
    setCropMode(prev => !prev);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="h-screen flex flex-col bg-gray-100 text-gray-800 font-sans">
          <Toolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDownload={handleDownload}
            onDelete={() => deleteElement()}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            hasSelection={!!selectedId}
            fileName={fileName}
            setFileName={setFileName}
          />

          <ContextToolbar
            selectedElement={selectedElement}
            elements={elements}
            onUpdateElement={updateElement}
            onAddElement={addElement}
            cropMode={cropMode}
            onToggleCropMode={handleToggleCropMode}
          />

          <div className="flex flex-1 overflow-hidden relative">
            <Sidebar onAddElement={addElement} />

            {/* Canvas Area */}
            <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-4 relative">
              {/* Zoom Controls Overlay */}
              <div className="absolute bottom-4 left-8 z-10 bg-white rounded-full shadow px-3 py-1 flex items-center gap-2 text-sm">
                <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="hover:bg-gray-100 px-2 rounded">-</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="hover:bg-gray-100 px-2 rounded">+</button>
              </div>

              <Canvas
                elements={elements}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdateElement={updateElement}
                onDelete={deleteElement}
                onDuplicate={duplicateElement}
                zoom={zoom}
                cropMode={cropMode}
                onToggleCropMode={handleToggleCropMode}
              />
            </div>

            <PropertiesPanel
              element={selectedElement}
              onUpdate={(id, updates) => {
                updateElement(id, updates);
              }}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default TemplateEditorPage;