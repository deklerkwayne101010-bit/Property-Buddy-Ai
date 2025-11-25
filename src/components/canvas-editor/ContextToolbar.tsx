import React from 'react';
import { CanvasElement, ElementType } from '../../lib/canvas-types';
import {
   IconBold, IconItalic, IconUnderline,
   IconAlignLeft, IconAlignCenter, IconAlignRight,
   IconType,
   IconLayerFront, IconLayerBack, IconLayerForward, IconLayerBackward
} from './Icons';

interface ContextToolbarProps {
   selectedElement: CanvasElement | null;
   elements: CanvasElement[];
   onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
   onAddElement: (type: ElementType, payload?: Partial<CanvasElement>) => void;
}

const ContextToolbar: React.FC<ContextToolbarProps> = ({
   selectedElement,
   elements,
   onUpdateElement,
   onAddElement
}) => {


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