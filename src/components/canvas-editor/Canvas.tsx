import React, { useRef, useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { CanvasElement, ElementType, ShapeType, DragState, ResizeState } from '../../lib/canvas-types';
import {
    IconTrash,
    IconLayerFront,
    IconLayerBack,
    IconLayerForward,
    IconLayerBackward
} from './Icons';
import { supabase } from '../../lib/supabase';


interface CanvasProps {
   elements: CanvasElement[];
   selectedId: string | null;
   onSelect: (id: string | null) => void;
   onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
   onDelete: (id: string) => void;
   onDuplicate?: (id: string) => void;
   zoom: number;
   cropMode?: boolean;
   ocrMode?: boolean;
   backgroundImage?: string | null;
   canvasDimensions?: { width: number, height: number } | null;
   onToggleCropMode?: () => void;
   onToggleOcrMode?: () => void;
   onAddElement?: (type: ElementType, payload?: Partial<CanvasElement>) => void;
}

const Canvas: React.FC<CanvasProps> = ({
   elements,
   selectedId,
   onSelect,
   onUpdateElement,
   onDelete,
   onDuplicate,
   zoom,
   cropMode = false,
   ocrMode = false,
   backgroundImage,
   canvasDimensions: providedCanvasDimensions,
   onToggleCropMode,
   onToggleOcrMode,
   onAddElement
}) => {
   // Use provided canvas dimensions or calculate dynamic ones
   const getCanvasDimensions = () => {
     // If we have provided dimensions (from background image), use them
     if (providedCanvasDimensions) {
       return providedCanvasDimensions;
     }

     // Otherwise calculate based on content
     if (elements.length === 0) {
       return { width: 800, height: 600 };
     }

     // Find the bounds of all elements
     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

     elements.forEach(el => {
       minX = Math.min(minX, el.x);
       minY = Math.min(minY, el.y);
       maxX = Math.max(maxX, el.x + el.width);
       maxY = Math.max(maxY, el.y + el.height);
     });

     // Add padding
     const padding = 100;
     const width = Math.max(800, maxX - minX + padding * 2);
     const height = Math.max(600, maxY - minY + padding * 2);

     // Cap maximum dimensions for responsiveness
     const maxWidth = typeof window !== 'undefined' && window.innerWidth < 1200 ? window.innerWidth - 400 : 1200;
     const maxHeight = typeof window !== 'undefined' && window.innerHeight < 900 ? window.innerHeight - 200 : 900;

     return {
       width: Math.min(width, maxWidth),
       height: Math.min(height, maxHeight)
     };
   };

   const canvasDimensions = getCanvasDimensions();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);

  // Cropping State
  const [cropRect, setCropRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number, y: number } | null>(null);

  // OCR State
  const [ocrRect, setOcrRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isOcrSelecting, setIsOcrSelecting] = useState(false);
  const [ocrStart, setOcrStart] = useState<{ x: number, y: number } | null>(null);
  const [extractedTexts, setExtractedTexts] = useState<Array<{ id: string, content: string, x: number, y: number, width: number, height: number, isEditing: boolean }>>([]);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);


  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Force re-render when elements change to recalculate canvas dimensions
  const [, forceUpdate] = useState({});
  useEffect(() => {
    forceUpdate({});
  }, [elements]);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      forceUpdate({});
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Handlers
  const handleMouseDownElement = (e: React.MouseEvent, id: string) => {
    // If we are currently editing this element, don't start drag
    if (editingId === id) {
        return;
    }

    e.stopPropagation(); // Prevent canvas deselect
    const el = elements.find(item => item.id === id);
    if (!el) return;
    
    // Left click handling
    if (e.button === 0) {
        onSelect(id);
        setDragState({
          isDragging: true,
          startX: e.clientX,
          startY: e.clientY,
          initialX: el.x,
          initialY: el.y
        });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(id);
      setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const handleMouseDownResize = (e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    const el = elements.find(item => item.id === id);
    if (!el) return;

    setResizeState({
      isResizing: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width,
      initialHeight: el.height,
      initialFontSize: el.fontSize // Capture font size for scaling
    });
  };

  const handleLayer = (id: string, action: 'front' | 'back' | 'forward' | 'backward') => {
      const el = elements.find(e => e.id === id);
      if (!el) return;
      
      const currentZ = el.zIndex;
      let newZ = currentZ;
      const allZ = elements.map(e => e.zIndex);

      if (action === 'front') {
          const maxZ = Math.max(...allZ, 0);
          newZ = maxZ + 1;
      } else if (action === 'back') {
           const minZ = Math.min(...allZ, 0);
           newZ = minZ - 1;
      } else if (action === 'forward') {
          newZ = currentZ + 1;
      } else if (action === 'backward') {
          newZ = currentZ - 1;
      }

      onUpdateElement(id, { zIndex: newZ });
      setContextMenu(null);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState && selectedId) {
         const dx = (e.clientX - dragState.startX) / zoom;
         const dy = (e.clientY - dragState.startY) / zoom;
         
         onUpdateElement(selectedId, {
             x: dragState.initialX + dx,
             y: dragState.initialY + dy
         });
      }

      if (resizeState && selectedId) {
          const el = elements.find(i => i.id === selectedId);
          if (!el) return;

          const dx = (e.clientX - resizeState.startX) / zoom;
          const dy = (e.clientY - resizeState.startY) / zoom;
          
          let newX = resizeState.initialX;
          let newY = resizeState.initialY;
          let newWidth = resizeState.initialWidth;
          let newHeight = resizeState.initialHeight;
          let newFontSize = resizeState.initialFontSize;

          const isCorner = ['nw', 'ne', 'sw', 'se'].includes(resizeState.handle);

          // Special logic for Text Scaling on corners
          if (el.type === ElementType.TEXT && isCorner) {
              // Calculate width change based on handle direction
              let deltaW = 0;
              if (resizeState.handle.includes('e')) deltaW = dx;
              if (resizeState.handle.includes('w')) deltaW = -dx;

              // Calculate scale based on width change
              const prospectiveWidth = resizeState.initialWidth + deltaW;
              const scale = Math.max(0.1, prospectiveWidth / resizeState.initialWidth);

              // Apply scale
              newWidth = resizeState.initialWidth * scale;
              newHeight = resizeState.initialHeight * scale;
              if (resizeState.initialFontSize) {
                  newFontSize = resizeState.initialFontSize * scale;
              }

              // Adjust Position
              if (resizeState.handle.includes('w')) {
                  newX = resizeState.initialX + (resizeState.initialWidth - newWidth);
              }
              if (resizeState.handle.includes('n')) {
                  newY = resizeState.initialY + (resizeState.initialHeight - newHeight);
              }

              onUpdateElement(selectedId, {
                  x: newX,
                  y: newY,
                  width: newWidth,
                  height: newHeight,
                  fontSize: newFontSize
              });

          } else {
              // Standard Resizing Logic (Shapes, Images, or Text Side Handles)
              
              if (resizeState.handle.includes('e')) newWidth = resizeState.initialWidth + dx;
              if (resizeState.handle.includes('s')) newHeight = resizeState.initialHeight + dy;
              if (resizeState.handle.includes('w')) {
                  newWidth = resizeState.initialWidth - dx;
                  newX = resizeState.initialX + dx;
              }
              if (resizeState.handle.includes('n')) {
                  newHeight = resizeState.initialHeight - dy;
                  newY = resizeState.initialY + dy;
              }

              // Min constraints
              if (newWidth < 10) newWidth = 10;
              if (newHeight < 10) newHeight = 10;

              onUpdateElement(selectedId, {
                  x: newX,
                  y: newY,
                  width: newWidth,
                  height: newHeight
              });
          }
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    if (dragState || resizeState) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, selectedId, onUpdateElement, zoom, elements]);

  const handleDoubleClick = (e: React.MouseEvent, id: string, type: ElementType) => {
      e.stopPropagation();
      if (type === ElementType.TEXT) {
          setEditingId(id);
      }
  };

  // Cropping Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if (!cropMode || !selectedId) return;

      const selectedElement = elements.find(el => el.id === selectedId);
      if (!selectedElement || selectedElement.type !== ElementType.IMAGE) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      // Check if click is within the selected image bounds
      if (x >= selectedElement.x && x <= selectedElement.x + selectedElement.width &&
          y >= selectedElement.y && y <= selectedElement.y + selectedElement.height) {

          setIsCropping(true);
          setCropStart({ x, y });
          setCropRect({ x, y, width: 0, height: 0 });
      }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
      if (!isCropping || !cropStart) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      const width = x - cropStart.x;
      const height = y - cropStart.y;

      setCropRect({
          x: Math.min(cropStart.x, x),
          y: Math.min(cropStart.y, y),
          width: Math.abs(width),
          height: Math.abs(height)
      });
  };

  const handleCanvasMouseUp = () => {
      if (!isCropping || !cropRect || !selectedId) return;

      const selectedElement = elements.find(el => el.id === selectedId);
      if (!selectedElement) return;

      // Convert crop rectangle to image-relative coordinates
      const cropX = (cropRect.x - selectedElement.x) / selectedElement.width * (selectedElement.originalWidth || selectedElement.width);
      const cropY = (cropRect.y - selectedElement.y) / selectedElement.height * (selectedElement.originalHeight || selectedElement.height);
      const cropWidth = cropRect.width / selectedElement.width * (selectedElement.originalWidth || selectedElement.width);
      const cropHeight = cropRect.height / selectedElement.height * (selectedElement.originalHeight || selectedElement.height);

      // Apply cropping
      onUpdateElement(selectedId, {
          cropX: Math.max(0, cropX),
          cropY: Math.max(0, cropY),
          cropWidth: Math.max(1, cropWidth),
          cropHeight: Math.max(1, cropHeight)
      });

      // Reset cropping state
      setIsCropping(false);
      setCropStart(null);
      setCropRect(null);
  };

  // OCR Handlers
  const handleOcrMouseDown = (e: React.MouseEvent) => {
      if (!ocrMode) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      setIsOcrSelecting(true);
      setOcrStart({ x, y });
      setOcrRect({ x, y, width: 0, height: 0 });
  };

  const handleOcrMouseMove = (e: React.MouseEvent) => {
      if (!isOcrSelecting || !ocrStart) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      const width = x - ocrStart.x;
      const height = y - ocrStart.y;

      setOcrRect({
          x: Math.min(ocrStart.x, x),
          y: Math.min(ocrStart.y, y),
          width: Math.abs(width),
          height: Math.abs(height)
      });
  };

  const handleOcrMouseUp = async () => {
      if (!isOcrSelecting || !ocrRect) return;

      // Only process if rectangle is large enough
      if (ocrRect.width < 20 || ocrRect.height < 15) {
          setIsOcrSelecting(false);
          setOcrStart(null);
          setOcrRect(null);
          return;
      }

      setIsProcessingOcr(true);

      try {
          // Check if there's a background image to work with
          if (!backgroundImage) {
              alert('Please upload a background image first before using OCR.');
              return;
          }

          console.log('Starting OCR processing...');
          console.log('OCR Rectangle:', ocrRect);
          console.log('Background image:', backgroundImage);

          // Try using the existing OCR API endpoint instead of Tesseract.js
          const formData = new FormData();

          // Create a canvas to extract the selected region from the background image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();

          await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = backgroundImage;
          });

          console.log('Background image loaded, dimensions:', img.width, 'x', img.height);

          // Calculate the region coordinates relative to the background image
          // The background image is scaled to fit (contain) within the canvas dimensions
          const canvasAspectRatio = canvasDimensions.width / canvasDimensions.height;
          const imgAspectRatio = img.width / img.height;

          let drawWidth, drawHeight, offsetX, offsetY;

          if (imgAspectRatio > canvasAspectRatio) {
              // Image is wider than canvas - fit by width
              drawWidth = canvasDimensions.width;
              drawHeight = canvasDimensions.width / imgAspectRatio;
              offsetX = 0;
              offsetY = (canvasDimensions.height - drawHeight) / 2;
          } else {
              // Image is taller than canvas - fit by height
              drawHeight = canvasDimensions.height;
              drawWidth = canvasDimensions.height * imgAspectRatio;
              offsetX = (canvasDimensions.width - drawWidth) / 2;
              offsetY = 0;
          }

          console.log('Canvas scaling - drawWidth:', drawWidth, 'drawHeight:', drawHeight, 'offsetX:', offsetX, 'offsetY:', offsetY);

          // Calculate the selected region relative to the scaled background image
          const scaleX = img.width / drawWidth;
          const scaleY = img.height / drawHeight;

          const imageX = (ocrRect.x - offsetX) * scaleX;
          const imageY = (ocrRect.y - offsetY) * scaleY;
          const imageWidth = ocrRect.width * scaleX;
          const imageHeight = ocrRect.height * scaleY;

          console.log('Image region - x:', imageX, 'y:', imageY, 'width:', imageWidth, 'height:', imageHeight);

          // Ensure we don't go outside image bounds
          const clampedImageX = Math.max(0, Math.min(imageX, img.width - imageWidth));
          const clampedImageY = Math.max(0, Math.min(imageY, img.height - imageHeight));
          const clampedImageWidth = Math.min(imageWidth, img.width - clampedImageX);
          const clampedImageHeight = Math.min(imageHeight, img.height - clampedImageY);

          console.log('Clamped region - x:', clampedImageX, 'y:', clampedImageY, 'width:', clampedImageWidth, 'height:', clampedImageHeight);

          canvas.width = clampedImageWidth;
          canvas.height = clampedImageHeight;

          ctx?.drawImage(
              img,
              clampedImageX, clampedImageY, clampedImageWidth, clampedImageHeight,
              0, 0, clampedImageWidth, clampedImageHeight
          );

          // Convert canvas to base64 data URL and send to OCR API
          const dataUrl = canvas.toDataURL('image/png');

          console.log('Sending OCR request to API...');

          // Get authentication token
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
              throw new Error('Authentication required');
          }

          const response = await fetch('/api/ocr', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                  imageUrl: dataUrl,
                  region: {
                      x: clampedImageX,
                      y: clampedImageY,
                      width: clampedImageWidth,
                      height: clampedImageHeight
                  }
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'OCR API request failed');
          }

          const result = await response.json();
          console.log('OCR API response:', result);

          const extractedText = result.text || result.extracted_text || '';

          if (extractedText.trim()) {
              console.log('Text extracted successfully:', extractedText);

              // Add extracted text as a new text element
              const newTextId = `ocr-text-${Date.now()}`;
              setExtractedTexts(prev => [...prev, {
                  id: newTextId,
                  content: extractedText.trim(),
                  x: ocrRect.x,
                  y: ocrRect.y,
                  width: ocrRect.width,
                  height: ocrRect.height,
                  isEditing: false
              }]);

              alert(`Text extracted: "${extractedText.trim()}"\nClick on the green overlay to edit and apply the text.`);
          } else {
              console.log('No text found in OCR response');
              alert('No text found in the selected area. Try selecting a different region or ensure the text is clear and well-lit.');
          }

      } catch (error) {
          console.error('OCR processing failed:', error);
          alert(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      } finally {
          setIsProcessingOcr(false);
          setIsOcrSelecting(false);
          setOcrStart(null);
          setOcrRect(null);
      }
  };

  const handleTextClick = (textId: string) => {
      setExtractedTexts(prev => prev.map(text =>
          text.id === textId
              ? { ...text, isEditing: true }
              : { ...text, isEditing: false }
      ));
  };

  const handleTextEdit = (textId: string, newContent: string) => {
      setExtractedTexts(prev => prev.map(text =>
          text.id === textId
              ? { ...text, content: newContent }
              : text
      ));
  };

  const handleTextDelete = (textId: string) => {
      setExtractedTexts(prev => prev.filter(text => text.id !== textId));
  };

  const applyOcrText = (textId: string) => {
      const textItem = extractedTexts.find(t => t.id === textId);
      if (textItem && textItem.content.trim() && onAddElement) {
          onAddElement(ElementType.TEXT, {
              content: textItem.content,
              x: textItem.x,
              y: textItem.y,
              width: textItem.width,
              height: textItem.height,
              fontSize: Math.max(12, textItem.height * 0.7),
              color: '#000000',
              zIndex: Math.max(...elements.map(el => el.zIndex), 0) + 1
          });

          // Remove from extracted texts
          setExtractedTexts(prev => prev.filter(t => t.id !== textId));
      }
  };


  return (
    <>
        <div
            ref={canvasRef}
            className="canvas-container relative bg-white shadow-lg overflow-hidden transition-transform transform origin-center"
            style={{
                width: canvasDimensions.width,
                height: canvasDimensions.height,
                transform: `scale(${zoom})`,
                backgroundImage: backgroundImage
                    ? `url(${backgroundImage})`
                    : 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: backgroundImage ? 'contain' : '20px 20px',
                backgroundRepeat: backgroundImage ? 'no-repeat' : 'repeat',
                backgroundPosition: 'center'
            }}
            onMouseDown={(e) => {
                if (ocrMode) {
                    handleOcrMouseDown(e);
                } else if (cropMode) {
                    handleCanvasMouseDown(e);
                } else {
                    onSelect(null);
                    setEditingId(null);
                }
            }}
            onMouseMove={(e) => {
                if (ocrMode) {
                    handleOcrMouseMove(e);
                } else {
                    handleCanvasMouseMove(e);
                }
            }}
            onMouseUp={() => {
                if (ocrMode) {
                    handleOcrMouseUp();
                } else {
                    handleCanvasMouseUp();
                }
            }}
            onDragOver={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()} // Disable default context menu on canvas bg
        >
            {elements.map(el => {
                const isSelected = selectedId === el.id;
                const isEditing = editingId === el.id;
                
                return (
                    <div
                        key={el.id}
                        style={{
                            position: 'absolute',
                            left: el.x,
                            top: el.y,
                            width: el.width,
                            height: el.height,
                            transform: `rotate(${el.rotation}deg)`,
                            zIndex: el.zIndex,
                            opacity: el.opacity,
                            cursor: dragState ? 'grabbing' : (isEditing ? 'text' : 'grab'),
                            // Styles specifically for shapes
                            backgroundColor: el.type === ElementType.SHAPE ? el.backgroundColor : undefined,
                            borderRadius: el.borderRadius,
                            clipPath: el.shapeType === ShapeType.TRIANGLE ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined
                        }}
                        onMouseDown={(e) => handleMouseDownElement(e, el.id)}
                        onDoubleClick={(e) => handleDoubleClick(e, el.id, el.type)}
                        onContextMenu={(e) => handleContextMenu(e, el.id)}
                        className="group"
                    >
                        {/* Render Content */}
                        {el.type === ElementType.TEXT && (
                            isEditing ? (
                                <textarea
                                    autoFocus
                                    value={el.content}
                                    onChange={(e) => onUpdateElement(el.id, { content: e.target.value })}
                                    onBlur={() => setEditingId(null)}
                                    onMouseDown={(e) => e.stopPropagation()} 
                                    className="w-full h-full bg-transparent outline-none resize-none p-0 border-none overflow-hidden"
                                    style={{
                                        fontSize: el.fontSize,
                                        fontWeight: el.fontWeight,
                                        fontStyle: el.fontStyle,
                                        textDecoration: el.textDecoration,
                                        fontFamily: el.fontFamily,
                                        color: el.color,
                                        textAlign: el.textAlign,
                                        lineHeight: 1.2
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        fontSize: el.fontSize,
                                        fontWeight: el.fontWeight,
                                        fontStyle: el.fontStyle,
                                        textDecoration: el.textDecoration,
                                        fontFamily: el.fontFamily,
                                        color: el.color,
                                        textAlign: el.textAlign,
                                        width: '100%',
                                        height: '100%',
                                        userSelect: 'none',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: 1.2
                                    }}
                                >
                                    {el.content}
                                </div>
                            )
                        )}

                        {el.type === ElementType.IMAGE && (
                            <div className="w-full h-full relative overflow-hidden" style={{ borderRadius: el.borderRadius }}>
                                <img
                                    src={el.src}
                                    alt="element"
                                    className="w-full h-full object-contain pointer-events-none"
                                    style={{
                                        borderRadius: el.borderRadius,
                                        transform: (el.cropX !== undefined && el.cropY !== undefined) ? `translate(${-el.cropX}px, ${-el.cropY}px)` : undefined,
                                        transformOrigin: 'top left'
                                    }}
                                />
                            </div>
                        )}

                        {/* Selection UI */}
                        {isSelected && !isEditing && (
                            <>
                                <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none"></div>
                                {/* Resize Handles */}
                                {['nw', 'ne', 'sw', 'se'].map(handle => (
                                    <div
                                        key={handle}
                                        className={`absolute w-3 h-3 bg-white border border-purple-500 rounded-full z-10
                                            ${handle.includes('n') ? '-top-1.5' : '-bottom-1.5'}
                                            ${handle.includes('w') ? '-left-1.5' : '-right-1.5'}
                                            cursor-${handle}-resize
                                        `}
                                        onMouseDown={(e) => handleMouseDownResize(e, el.id, handle)}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                );
            })}

            {/* Cropping Overlay */}
            {cropMode && cropRect && (
                <div
                    style={{
                        position: 'absolute',
                        left: cropRect.x,
                        top: cropRect.y,
                        width: cropRect.width,
                        height: cropRect.height,
                        border: '2px solid #3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        pointerEvents: 'none',
                        zIndex: 1000
                    }}
                />
            )}

            {/* Crop Mode Instructions */}
            {cropMode && selectedId && !isCropping && (
                <div
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 1000,
                        backgroundColor: 'rgba(59, 130, 246, 0.9)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                    }}
                >
                    Click and drag on the selected image to crop
                </div>
            )}

            {/* OCR Selection Rectangle */}
            {ocrMode && isOcrSelecting && ocrRect && (
                <div
                    style={{
                        position: 'absolute',
                        left: ocrRect.x,
                        top: ocrRect.y,
                        width: ocrRect.width,
                        height: ocrRect.height,
                        border: '2px solid #10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        pointerEvents: 'none',
                        zIndex: 1000
                    }}
                />
            )}

            {/* OCR Mode Instructions */}
            {ocrMode && !isOcrSelecting && !isProcessingOcr && (
                <div
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 1000,
                        backgroundColor: 'rgba(16, 185, 129, 0.9)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                    }}
                >
                    Click and drag to select text areas for OCR extraction
                </div>
            )}

            {/* OCR Processing Indicator */}
            {isProcessingOcr && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '10px' }}>🔍 Extracting text...</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>This may take a few seconds</div>
                    </div>
                </div>
            )}

            {/* Extracted Text Overlays */}
            {extractedTexts.map((textItem) => (
                <div
                    key={textItem.id}
                    style={{
                        position: 'absolute',
                        left: textItem.x,
                        top: textItem.y,
                        width: textItem.width,
                        height: textItem.height,
                        zIndex: 1000,
                        cursor: 'pointer',
                        backgroundColor: textItem.isEditing ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                        border: textItem.isEditing ? '2px solid #10b981' : '2px solid #10b981',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={() => handleTextClick(textItem.id)}
                >
                    {textItem.isEditing ? (
                        <div style={{ width: '100%', padding: '8px' }}>
                            <textarea
                                value={textItem.content}
                                onChange={(e) => handleTextEdit(textItem.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    minHeight: '40px',
                                    border: '1px solid #10b981',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    fontSize: '12px',
                                    resize: 'none'
                                }}
                                placeholder="Edit text..."
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        applyOcrText(textItem.id);
                                    }}
                                    style={{
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTextDelete(textItem.id);
                                    }}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#065f46',
                            padding: '4px'
                        }}>
                            {textItem.content || 'Click to edit'}
                        </div>
                    )}
                </div>
            ))}

        </div>

        {/* Custom Context Menu */}
        {contextMenu && (
            <div
                className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-48 z-50 flex flex-col"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Crop Options - Only show for images */}
                {(() => {
                    const element = elements.find(el => el.id === contextMenu.id);
                    if (element?.type === ElementType.IMAGE) {
                        return (
                            <>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 w-full text-left"
                                    onClick={() => {
                                        if (onToggleCropMode) onToggleCropMode();
                                        setContextMenu(null);
                                    }}
                                >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    {cropMode ? 'Exit Crop Mode' : 'Enter Crop Mode'}
                                </button>
                                <div className="h-px bg-gray-100 my-1"></div>
                            </>
                        );
                    }
                    return null;
                })()}

                {/* Layer Options */}
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 w-full text-left" onClick={() => handleLayer(contextMenu.id, 'front')}>
                    <IconLayerFront className="w-4 h-4 text-gray-500" /> Bring to Front
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 w-full text-left" onClick={() => handleLayer(contextMenu.id, 'forward')}>
                    <IconLayerForward className="w-4 h-4 text-gray-500" /> Bring Forward
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 w-full text-left" onClick={() => handleLayer(contextMenu.id, 'backward')}>
                    <IconLayerBackward className="w-4 h-4 text-gray-500" /> Send Backward
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 w-full text-left" onClick={() => handleLayer(contextMenu.id, 'back')}>
                    <IconLayerBack className="w-4 h-4 text-gray-500" /> Send to Back
                </button>

                <div className="h-px bg-gray-100 my-1"></div>

                <button
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 w-full text-left"
                    onClick={() => {
                        if (onDuplicate) onDuplicate(contextMenu.id);
                        setContextMenu(null);
                    }}
                >
                    <div className="w-4 h-4 border-2 border-gray-400 rounded-sm flex items-center justify-center"><div className="w-2 h-2 border border-gray-400"></div></div>
                    Duplicate
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                    className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-red-600 w-full text-left"
                    onClick={() => {
                        onDelete(contextMenu.id);
                        setContextMenu(null);
                    }}
                >
                    <IconTrash className="w-4 h-4" />
                    Delete
                </button>
            </div>
        )}
    </>
  );
};

export default Canvas;