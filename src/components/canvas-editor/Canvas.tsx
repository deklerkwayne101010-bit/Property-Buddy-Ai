import React, { useRef, useState, useEffect } from 'react';
import { CanvasElement, ElementType, ShapeType, DragState, ResizeState } from '../../lib/canvas-types';
import {
    IconTrash,
    IconLayerFront,
    IconLayerBack,
    IconLayerForward,
    IconLayerBackward
} from './Icons';


interface CanvasProps {
   elements: CanvasElement[];
   selectedId: string | null;
   onSelect: (id: string | null) => void;
   onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
   onDelete: (id: string) => void;
   onDuplicate?: (id: string) => void;
   zoom: number;
   cropMode?: boolean;
   onToggleCropMode?: () => void;
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
   onToggleCropMode
}) => {
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


  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
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


  return (
    <>
        <div
            ref={canvasRef}
            className="canvas-container relative bg-white shadow-lg overflow-hidden transition-transform transform origin-center"
            style={{
                width: 1200,
                height: 896,
                transform: `scale(${zoom})`,
                backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}
            onMouseDown={(e) => {
                if (cropMode) {
                    handleCanvasMouseDown(e);
                } else {
                    onSelect(null);
                    setEditingId(null);
                }
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
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
                                    className="w-full h-full object-cover pointer-events-none"
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