'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fileName, setFileName] = useState('Untitled Design');
  const [zoom, setZoom] = useState(1);

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
  }, []);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  // Element Management
  const addElement = (type: ElementType, payload: any = {}) => {
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

  const deleteElement = (id?: string) => {
    const targetId = typeof id === 'string' ? id : selectedId;
    if (targetId) {
      const newElements = elements.filter(el => el.id !== targetId);
      setElements(newElements);
      addToHistory(newElements);
      if (targetId === selectedId) setSelectedId(null);
    }
  };

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
  }, [selectedId, historyIndex, history]);

  const handleDownload = async () => {
    alert(`Downloading "${fileName}.png"...\n(In a real app, this would use html2canvas to screenshot the .canvas-container div)`);
  };

  const selectedElement = elements.find(el => el.id === selectedId) || null;

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
          />

          <div className="flex flex-1 overflow-hidden relative">
            <Sidebar onAddElement={addElement} />

            {/* Canvas Area */}
            <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-8 relative">
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