import React, { useState } from 'react';
import Image from 'next/image';
import { ElementType, CanvasElement } from '../../lib/canvas-types';
import { IconType, IconImage } from './Icons';

interface SidebarProps {
   onAddElement: (type: ElementType, payload?: Partial<CanvasElement>) => void;
   onBackgroundImageUpload?: (imageSrc: string, width: number, height: number) => void;
   hasBackgroundImage?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddElement, onBackgroundImageUpload, hasBackgroundImage = false }) => {
  const [activeTab, setActiveTab] = useState('text');

  const tabs = [
    { id: 'text', label: 'Text', icon: IconType },
    { id: 'images', label: 'Images', icon: IconImage },
  ];

  const handleDragStart = (e: React.DragEvent, type: ElementType, payload?: Partial<CanvasElement>) => {
    e.dataTransfer.setData('type', type);
    if (payload) {
      e.dataTransfer.setData('payload', JSON.stringify(payload));
    }
  };

  const renderContent = () => {
    // If no background image, show upload prompt
    if (!hasBackgroundImage) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="font-bold text-gray-700 text-lg mb-2">Upload Background Image</h3>
            <p className="text-sm text-gray-500 mb-4">Start by uploading an image to edit</p>
          </div>

          <div className="p-6 border-2 border-dashed border-blue-300 rounded-lg text-center text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
            <svg className="w-12 h-12 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <label className="cursor-pointer block">
              <span className="font-medium">Choose an image</span>
              <span className="block text-sm text-blue-500 mt-1">PNG, JPG, GIF up to 10MB</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const img = new window.Image();
                      img.onload = () => {
                        onBackgroundImageUpload?.(ev.target?.result as string, img.width, img.height);
                      };
                      img.src = ev.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>

          <div className="text-center text-xs text-gray-400">
            Your uploaded image will become the canvas background at its original size
          </div>
        </div>
      );
    }

    // If background image exists, show regular content
    switch (activeTab) {
      case 'text':
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700">Add Text</h3>
            <div
              className="p-4 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 border border-gray-300"
              draggable
              onDragStart={(e) => handleDragStart(e, ElementType.TEXT, { fontSize: 32, fontWeight: 'bold', content: 'Heading' })}
              onClick={() => onAddElement(ElementType.TEXT, { fontSize: 32, fontWeight: 'bold', content: 'Heading' })}
            >
              <h1 className="text-2xl font-bold">Add a Heading</h1>
            </div>
            <div
              className="p-3 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 border border-gray-300"
              draggable
              onDragStart={(e) => handleDragStart(e, ElementType.TEXT, { fontSize: 24, fontWeight: 'normal', content: 'Subheading' })}
               onClick={() => onAddElement(ElementType.TEXT, { fontSize: 24, fontWeight: 'normal', content: 'Subheading' })}
            >
              <h2 className="text-xl">Add a Subheading</h2>
            </div>
            <div
              className="p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 border border-gray-300"
              draggable
              onDragStart={(e) => handleDragStart(e, ElementType.TEXT, { fontSize: 16, content: 'Little bit of body text' })}
               onClick={() => onAddElement(ElementType.TEXT, { fontSize: 16, content: 'Little bit of body text' })}
            >
              <p className="text-sm">Add a little bit of body text</p>
            </div>
          </div>
        );
      case 'images':
          return (
              <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded text-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                      <label className="cursor-pointer block">
                          Upload Image
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                      const img = new window.Image();
                                      img.onload = () => {
                                          // Calculate dimensions to fit within reasonable canvas bounds
                                          const maxWidth = 1200;
                                          const maxHeight = 800;
                                          const aspectRatio = img.width / img.height;

                                          let width = img.width;
                                          let height = img.height;

                                          // Scale down if too large
                                          if (width > maxWidth) {
                                              width = maxWidth;
                                              height = width / aspectRatio;
                                          }
                                          if (height > maxHeight) {
                                              height = maxHeight;
                                              width = height * aspectRatio;
                                          }

                                          onAddElement(ElementType.IMAGE, {
                                              src: ev.target?.result as string,
                                              width: Math.round(width),
                                              height: Math.round(height),
                                              originalWidth: img.width,
                                              originalHeight: img.height
                                          });
                                      };
                                      img.src = ev.target?.result as string;
                                  };
                                  reader.readAsDataURL(file);
                              }
                          }} />
                      </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="w-full h-24 rounded cursor-pointer hover:opacity-80 overflow-hidden"
                            onClick={() => onAddElement(ElementType.IMAGE, { src: `https://picsum.photos/400/400?random=${i}` })}
                          >
                            <Image
                              src={`https://picsum.photos/200/200?random=${i}`}
                              alt={`Sample image ${i}`}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                      ))}
                  </div>
              </div>
          )
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-white border-r shadow-xl z-20">
      <div className="w-20 flex flex-col items-center py-4 bg-slate-900 text-slate-400 gap-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded w-full transition-colors ${activeTab === tab.id ? 'text-white bg-slate-800' : 'hover:text-white'}`}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="w-72 bg-gray-50 flex flex-col h-full border-r">
          <div className="p-4 overflow-y-auto h-full scrollbar-thin">
            {renderContent()}
          </div>
      </div>
    </div>
  );
};

export default Sidebar;