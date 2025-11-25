import React, { useState } from 'react';
import { CanvasElement, ElementType } from '../../lib/canvas-types';

interface DetectedText {
  content: string;
  box_2d: [number, number, number, number];
  x: number;
  y: number;
  width: number;
  height: number;
  isEditing: boolean;
}
import {
  IconBold, IconItalic, IconUnderline,
  IconAlignLeft, IconAlignCenter, IconAlignRight,
  IconType, IconTextGrab, IconSparkles,
  IconLayerFront, IconLayerBack, IconLayerForward, IconLayerBackward,
  IconCrop
} from './Icons';
import { extractTextFromImage, removeTextFromImage } from '../../lib/canvas-services/geminiService';

interface ContextToolbarProps {
  selectedElement: CanvasElement | null;
  elements: CanvasElement[];
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onAddElement: (type: ElementType, payload?: Partial<CanvasElement>) => void;
  magicGrabMode?: boolean;
  detectedTexts?: DetectedText[];
  onTextAreaClick?: (textIndex: number) => void;
  onTextEdit?: (textIndex: number, newContent: string) => void;
  onApplyEditedText?: () => void;
  onCancelMagicGrab?: () => void;
  onStartInteractiveMagicGrab?: (textData: DetectedText[]) => void;
}

const ContextToolbar: React.FC<ContextToolbarProps> = ({
  selectedElement,
  elements,
  onUpdateElement,
  onAddElement,
  magicGrabMode = false,
  onApplyEditedText,
  onCancelMagicGrab,
  onStartInteractiveMagicGrab
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  // Remove unused local state variables that are now managed by parent

  // Magic Grab Logic - Extract text and create new elements
  const handleMagicGrab = async () => {
      if (!selectedElement || selectedElement.type !== ElementType.IMAGE || !selectedElement.src) {
          alert("Please select an image element first.");
          return;
      }

      setIsProcessing(true);
      try {
          console.log("Starting Magic Grab Text process...");

          // 1. Extract Text Data (Parallel)
          const textPromise = extractTextFromImage(selectedElement.src);
          // 2. Remove Text from Image (Parallel)
          const imagePromise = removeTextFromImage(selectedElement.src);

          const [textData, cleanImage] = await Promise.all([textPromise, imagePromise]);

          console.log("Magic Grab results:", { textData, cleanImage });

          // 3. Update Image to Clean Version (if different)
          if (cleanImage !== selectedElement.src) {
              onUpdateElement(selectedElement.id, { src: cleanImage });
          }

          // 4. Create new Text Elements
          if (textData && textData.length > 0) {
              textData.forEach(item => {
                  const [ymin, xmin, ymax, xmax] = item.box_2d;

                  // Convert 0-1000 scale to pixel coordinates relative to the image
                  const relX = (xmin / 1000) * selectedElement.width;
                  const relY = (ymin / 1000) * selectedElement.height;
                  const relW = ((xmax - xmin) / 1000) * selectedElement.width;
                  const relH = ((ymax - ymin) / 1000) * selectedElement.height;

                  // Absolute Canvas Position
                  const absX = selectedElement.x + relX;
                  const absY = selectedElement.y + relY;

                  // Estimate Font Size based on height (rough approximation)
                  const estimatedFontSize = Math.max(12, relH * 0.8);

                  onAddElement(ElementType.TEXT, {
                      content: item.content,
                      x: absX,
                      y: absY,
                      width: Math.max(relW, 50), // Min width
                      height: Math.max(relH, 20),
                      fontSize: estimatedFontSize,
                      zIndex: selectedElement.zIndex + 1, // Place on top
                      color: '#000000' // Default color, picking color from image is harder
                  });
              });

              alert(`Successfully extracted ${textData.length} text elements from the image!`);
          } else {
              alert("No text was found in the image. Try selecting a different image with visible text.");
          }

      } catch (e) {
          console.error("Magic Grab Failed", e);
          const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
          alert(`Could not grab text from image: ${errorMessage}\n\nMake sure REPLICATE_API_TOKEN is configured in your .env.local file.`);
      } finally {
          setIsProcessing(false);
      }
  };

  // Interactive Magic Grab - Select and edit text directly
  const handleInteractiveMagicGrab = async () => {
      if (!selectedElement || selectedElement.type !== ElementType.IMAGE || !selectedElement.src) {
          alert("Please select an image element first.");
          return;
      }

      setIsProcessing(true);
      try {
          console.log("Starting Interactive Magic Grab Text process...");

          // Extract text with bounding boxes
          const textData = await extractTextFromImage(selectedElement.src);

          if (textData && textData.length > 0) {
              // Prepare detected texts with canvas coordinates
              const processedTextData = textData.map(item => ({
                  ...item,
                  // Convert coordinates to canvas-relative positions
                  x: selectedElement.x + (item.box_2d[1] / 1000) * selectedElement.width,
                  y: selectedElement.y + (item.box_2d[0] / 1000) * selectedElement.height,
                  width: ((item.box_2d[3] - item.box_2d[1]) / 1000) * selectedElement.width,
                  height: ((item.box_2d[2] - item.box_2d[0]) / 1000) * selectedElement.height,
                  isEditing: false
              }));

              // Call parent callback to start interactive mode
              onStartInteractiveMagicGrab?.(processedTextData);
              alert(`Found ${textData.length} text areas! Click on the highlighted areas to edit them.`);
          } else {
              alert("No text was found in the image. Try selecting a different image with visible text.");
          }

      } catch (e) {
          console.error("Interactive Magic Grab Failed", e);
          const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
          alert(`Could not detect text in image: ${errorMessage}\n\nMake sure REPLICATE_API_TOKEN is configured in your .env.local file.`);
      } finally {
          setIsProcessing(false);
      }
  };


  const handleLayer = (action: 'front' | 'back' | 'forward' | 'backward') => {
      if (!selectedElement) return;
      const currentZ = selectedElement.zIndex;
      let newZ = currentZ;

      // Extract all z-indices to find bounds
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

      onUpdateElement(selectedElement.id, { zIndex: newZ });
  };

  // If no element selected, show quick insert
  if (!selectedElement) {
    return (
      <div className="h-12 bg-white border-b flex items-center px-4 gap-4 shadow-sm z-10">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Insert:</span>
        <div className="h-6 w-px bg-gray-300"></div>
        <button 
          onClick={() => onAddElement(ElementType.TEXT, { fontSize: 32, fontWeight: 'bold', content: 'Heading' })}
          className="flex items-center gap-2 hover:bg-purple-50 px-2 py-1 rounded text-sm text-gray-700 hover:text-purple-700 transition"
        >
          <IconType className="w-4 h-4" />
          <span>Heading</span>
        </button>
        <button 
          onClick={() => onAddElement(ElementType.TEXT, { fontSize: 16, content: 'Body Text' })}
          className="flex items-center gap-2 hover:bg-purple-50 px-2 py-1 rounded text-sm text-gray-700 hover:text-purple-700 transition"
        >
          <IconType className="w-4 h-4" />
          <span>Body</span>
        </button>
      </div>
    );
  }

  // Text Controls
  if (selectedElement.type === ElementType.TEXT) {
      const fontOptions = [
          { value: 'Arial, sans-serif', label: 'Arial' },
          { value: 'Helvetica, sans-serif', label: 'Helvetica' },
          { value: 'Times New Roman, serif', label: 'Times New Roman' },
          { value: 'Georgia, serif', label: 'Georgia' },
          { value: 'Verdana, sans-serif', label: 'Verdana' },
          { value: 'Courier New, monospace', label: 'Courier New' },
          { value: 'Impact, sans-serif', label: 'Impact' },
          { value: 'Comic Sans MS, cursive', label: 'Comic Sans' },
      ];

      return (
         <div className="h-12 bg-white border-b flex items-center px-4 gap-3 shadow-sm z-10 overflow-x-auto">
              {/* Font Family */}
              <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Font</span>
                  <select
                     value={selectedElement.fontFamily || 'Arial, sans-serif'}
                     onChange={(e) => onUpdateElement(selectedElement.id, { fontFamily: e.target.value })}
                     className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-w-[120px]"
                     title="Font Family"
                  >
                     {fontOptions.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                           {font.label}
                        </option>
                     ))}
                  </select>
              </div>

              <div className="h-6 w-px bg-gray-300"></div>

              {/* Font Size */}
              <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Size</span>
                  <input
                     type="number"
                     value={selectedElement.fontSize || 16}
                     onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                     className="w-16 border rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-purple-500 outline-none"
                  />
              </div>

              <div className="h-6 w-px bg-gray-300"></div>

              {/* Color */}
              <div className="flex items-center gap-2 group relative">
                  <div className="w-6 h-6 rounded border border-gray-300 overflow-hidden cursor-pointer shadow-sm">
                     <input
                         type="color"
                         value={selectedElement.color || '#000000'}
                         onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                         className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 p-0 border-0 cursor-pointer"
                         title="Text Color"
                     />
                  </div>
              </div>

             <div className="h-6 w-px bg-gray-300"></div>

             {/* Formatting */}
             <div className="flex bg-gray-100 rounded p-1 gap-1">
                 <button 
                    onClick={() => onUpdateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`p-1.5 rounded transition ${selectedElement.fontWeight === 'bold' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    title="Bold"
                 >
                     <IconBold className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => onUpdateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`p-1.5 rounded transition ${selectedElement.fontStyle === 'italic' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    title="Italic"
                 >
                     <IconItalic className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => onUpdateElement(selectedElement.id, { textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })}
                    className={`p-1.5 rounded transition ${selectedElement.textDecoration === 'underline' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    title="Underline"
                 >
                     <IconUnderline className="w-4 h-4" />
                 </button>
             </div>

             <div className="h-6 w-px bg-gray-300"></div>

             {/* Alignment */}
              <div className="flex bg-gray-100 rounded p-1 gap-1">
                 <button 
                    onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'left' })}
                    className={`p-1.5 rounded transition ${selectedElement.textAlign === 'left' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    title="Align Left"
                 >
                     <IconAlignLeft className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'center' })}
                    className={`p-1.5 rounded transition ${selectedElement.textAlign === 'center' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    title="Align Center"
                 >
                     <IconAlignCenter className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'right' })}
                    className={`p-1.5 rounded transition ${selectedElement.textAlign === 'right' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    title="Align Right"
                 >
                     <IconAlignRight className="w-4 h-4" />
                 </button>
             </div>
         </div>
      );
  }

  // Image Controls
   if (selectedElement.type === ElementType.IMAGE) {
       return (
           <div className="h-12 bg-white border-b flex items-center px-4 gap-4 shadow-sm z-10">
                <button
                  onClick={handleMagicGrab}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:shadow-md transition disabled:opacity-50"
                >
                    {isProcessing ? (
                        <IconSparkles className="w-4 h-4 animate-spin" />
                    ) : (
                        <IconTextGrab className="w-4 h-4" />
                    )}
                    <span>{isProcessing ? 'Processing...' : 'Magic Grab Text'}</span>
                </button>

                <div className="h-6 w-px bg-gray-300"></div>

                <button
                  onClick={handleInteractiveMagicGrab}
                  disabled={isProcessing || magicGrabMode}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded text-sm hover:shadow-md transition disabled:opacity-50"
                  title="Select and edit text directly in the image (like Canva)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>{isProcessing ? 'Processing...' : 'Edit Text'}</span>
                </button>

                <div className="h-6 w-px bg-gray-300"></div>

                {magicGrabMode && (
                  <>
                    <button
                      onClick={onApplyEditedText}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm transition"
                      title="Apply edited text to canvas"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Apply Changes</span>
                    </button>

                    <div className="h-6 w-px bg-gray-300"></div>

                    <button
                      onClick={onCancelMagicGrab}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm transition"
                      title="Cancel text editing"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel</span>
                    </button>

                    <div className="h-6 w-px bg-gray-300"></div>
                  </>
                )}

                <button
                  onClick={() => setIsCropping(!isCropping)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
                    isCropping
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                    <IconCrop className="w-4 h-4" />
                    <span>{isCropping ? 'Exit Crop' : 'Crop'}</span>
                </button>
               
               <div className="h-6 w-px bg-gray-300"></div>
               
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-600">Radius:</span>
                 <input 
                    type="range"
                    min="0"
                    max="100"
                    value={selectedElement.borderRadius || 0}
                    onChange={(e) => onUpdateElement(selectedElement.id, { borderRadius: Number(e.target.value) })}
                    className="w-24 accent-purple-600"
                 />
               </div>

               <div className="h-6 w-px bg-gray-300"></div>

               <div className="flex bg-gray-100 rounded p-1 gap-1">
                    <button onClick={() => handleLayer('back')} title="Send to Back" className="p-1.5 rounded hover:bg-gray-200 text-gray-600"> <IconLayerBack className="w-4 h-4"/> </button>
                    <button onClick={() => handleLayer('backward')} title="Send Backward" className="p-1.5 rounded hover:bg-gray-200 text-gray-600"> <IconLayerBackward className="w-4 h-4"/> </button>
                    <button onClick={() => handleLayer('forward')} title="Bring Forward" className="p-1.5 rounded hover:bg-gray-200 text-gray-600"> <IconLayerForward className="w-4 h-4"/> </button>
                    <button onClick={() => handleLayer('front')} title="Bring to Front" className="p-1.5 rounded hover:bg-gray-200 text-gray-600"> <IconLayerFront className="w-4 h-4"/> </button>
               </div>

               {isCropping && (
                 <>
                   <div className="h-6 w-px bg-gray-300"></div>
                   <div className="flex items-center gap-2">
                     <span className="text-sm text-gray-600">Crop:</span>
                     <input
                       type="number"
                       placeholder="X"
                       className="w-12 border rounded px-2 py-1 text-xs text-center focus:ring-2 focus:ring-purple-500 outline-none"
                       title="Crop X position"
                     />
                     <input
                       type="number"
                       placeholder="Y"
                       className="w-12 border rounded px-2 py-1 text-xs text-center focus:ring-2 focus:ring-purple-500 outline-none"
                       title="Crop Y position"
                     />
                     <input
                       type="number"
                       placeholder="W"
                       className="w-12 border rounded px-2 py-1 text-xs text-center focus:ring-2 focus:ring-purple-500 outline-none"
                       title="Crop width"
                     />
                     <input
                       type="number"
                       placeholder="H"
                       className="w-12 border rounded px-2 py-1 text-xs text-center focus:ring-2 focus:ring-purple-500 outline-none"
                       title="Crop height"
                     />
                     <button
                       className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition"
                       title="Apply crop"
                     >
                       Apply
                     </button>
                   </div>
                 </>
               )}
          </div>
      );
  }

  // Shape Controls (Keeping logic just in case existing shapes are selected, but removing creation buttons)
  if (selectedElement.type === ElementType.SHAPE) {
      return (
        <div className="h-12 bg-white border-b flex items-center px-4 gap-4 shadow-sm z-10">
             <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Fill:</span>
                 <div className="w-6 h-6 rounded border border-gray-300 overflow-hidden cursor-pointer shadow-sm">
                    <input 
                        type="color" 
                        value={selectedElement.backgroundColor || '#000000'}
                        onChange={(e) => onUpdateElement(selectedElement.id, { backgroundColor: e.target.value })}
                         className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 p-0 border-0 cursor-pointer"
                    />
                </div>
             </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-600">Opacity:</span>
                  <input 
                    type="range" 
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedElement.opacity ?? 1}
                    onChange={(e) => onUpdateElement(selectedElement.id, { opacity: parseFloat(e.target.value) })}
                    className="w-24 accent-purple-600"
                 />
              </div>
        </div>
      )
  }

  // Fallback for others
  return <div className="h-12 bg-white border-b shadow-sm z-10 flex items-center px-4 text-gray-400 text-sm">Select an element to edit</div>;
};

export default ContextToolbar;