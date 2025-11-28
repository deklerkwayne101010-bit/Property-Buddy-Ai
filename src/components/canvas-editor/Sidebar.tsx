import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ElementType, CanvasElement } from '../../lib/canvas-types';
import { IconType, IconImage } from './Icons';
import { supabase } from '../../lib/supabase';

interface Property {
  id: string;
  name: string;
  property_images: Array<{
    id: string;
    filename: string;
    original_filename: string;
    url: string;
  }>;
}

interface SidebarProps {
    onAddElement: (type: ElementType, payload?: Partial<CanvasElement>) => void;
    onBackgroundImageUpload?: (imageSrc: string, width: number, height: number) => void;
    hasBackgroundImage?: boolean;
    selectedPropertyId?: string;
    onPropertySelect?: (propertyId: string | null) => void;
    onImageSelect?: (imageUrl: string, width: number, height: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
   onAddElement,
   onBackgroundImageUpload,
   hasBackgroundImage = false,
   selectedPropertyId,
   onPropertySelect,
   onImageSelect
}) => {
   const [activeTab, setActiveTab] = useState('properties');
   const [properties, setProperties] = useState<Property[]>([]);
   const [loadingProperties, setLoadingProperties] = useState(false);

   // Fetch properties on component mount
   useEffect(() => {
     fetchProperties();
   }, []);

   const fetchProperties = async () => {
     setLoadingProperties(true);
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         console.error('No session found');
         setLoadingProperties(false);
         return;
       }

       const response = await fetch('/api/properties', {
         headers: {
           'Authorization': `Bearer ${session.access_token}`,
         },
       });
       if (response.ok) {
         const data = await response.json();
         setProperties(data.properties);
       }
     } catch (error) {
       console.error('Error fetching properties:', error);
     } finally {
       setLoadingProperties(false);
     }
   };

   const tabs = [
    { id: 'properties', label: 'Properties', icon: IconImage },
    { id: 'text', label: 'Text', icon: IconType },
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

          <div className="p-6 border-2 border-dashed border-blue-300 rounded-lg text-center text-blue-600 hover:bg-blue-50 transition-colors">
            <svg className="w-12 h-12 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <input
              type="file"
              id="background-image-upload"
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
            <label
              htmlFor="background-image-upload"
              className="cursor-pointer block"
            >
              <span className="font-medium">Choose an image</span>
              <span className="block text-sm text-blue-500 mt-1">PNG, JPG, GIF up to 10MB</span>
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
       case 'properties':
         return (
           <div className="space-y-4">
             <h3 className="font-bold text-gray-700">My Properties</h3>

             {loadingProperties ? (
               <div className="text-center py-4">
                 <div className="text-gray-500">Loading properties...</div>
               </div>
             ) : properties.length === 0 ? (
               <div className="text-center py-8">
                 <div className="text-4xl mb-4">🏠</div>
                 <p className="text-sm text-gray-500 mb-4">No properties yet</p>
                 <button
                   onClick={() => window.location.href = '/properties'}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
                 >
                   Create Property
                 </button>
               </div>
             ) : (
               <div className="space-y-3">
                 {/* Property Selector */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Select Property
                   </label>
                   <select
                     value={selectedPropertyId || ''}
                     onChange={(e) => onPropertySelect?.(e.target.value || null)}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                   >
                     <option value="">Choose a property...</option>
                     {properties.map((property) => (
                       <option key={property.id} value={property.id}>
                         {property.name} ({property.property_images.length} photos)
                       </option>
                     ))}
                   </select>
                 </div>

                 {/* Selected Property Images */}
                 {selectedPropertyId && (
                   <div>
                     <h4 className="font-medium text-gray-700 mb-2">Property Images</h4>
                     <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                       {properties
                         .find(p => p.id === selectedPropertyId)
                         ?.property_images.map((image) => (
                         <div
                           key={image.id}
                           className="relative cursor-pointer group"
                           onClick={() => {
                             // Load image dimensions first
                             const img = new window.Image();
                             img.onload = () => {
                               onImageSelect?.(image.url, img.width, img.height);
                             };
                             img.src = image.url;
                           }}
                         >
                           <img
                             src={image.url}
                             alt={image.original_filename}
                             className="w-full h-16 object-cover rounded border hover:border-blue-500 transition"
                           />
                           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center">
                             <span className="text-white text-xs opacity-0 group-hover:opacity-100">Edit</span>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Manage Properties Link */}
                 <div className="pt-4 border-t">
                   <button
                     onClick={() => window.location.href = '/properties'}
                     className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium transition"
                   >
                     Manage Properties
                   </button>
                 </div>
               </div>
             )}
           </div>
         );
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