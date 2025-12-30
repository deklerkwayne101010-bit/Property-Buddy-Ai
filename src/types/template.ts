export interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'spacer';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  editable?: boolean;
  placeholder?: string;
  zIndex?: number;
}

export interface CanvaTemplate {
  id: string;
  name: string;
  description: string;
  category: 'brochure' | 'flyer' | 'social-media' | 'email' | 'presentation';
  canvaDesignId?: string; // Canva design ID if imported from Canva
  backgroundImage: string; // Base template image URL
  editableZones: EditableZone[]; // Areas that agents can edit
  canvasWidth: number;
  canvasHeight: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
}

export interface EditableZone {
  id: string;
  type: 'text' | 'image';
  label: string; // Human-readable name (e.g., "Property Address", "Main Photo")
  x: number; // Position on canvas
  y: number;
  width: number;
  height: number;
  defaultValue?: string; // Default text or placeholder
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  placeholder?: string;
  required?: boolean; // Whether agents must fill this
  maxLength?: number; // For text zones
  acceptedFormats?: string[]; // For image zones (e.g., ['image/jpeg', 'image/png'])
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'brochure' | 'flyer' | 'social-media' | 'email' | 'presentation';
  thumbnail: string;
  elements: TemplateElement[];
  canvasWidth: number;
  canvasHeight: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
}

export interface TemplateUsage {
  id: string;
  templateId: string;
  userId: string;
  customizedElements: TemplateElement[];
  createdAt: string;
  lastModified: string;
}

export const TEMPLATE_CATEGORIES = [
  { value: 'brochure', label: 'Property Brochures', icon: '📄' },
  { value: 'flyer', label: 'Marketing Flyers', icon: '📄' },
  { value: 'social-media', label: 'Social Media Posts', icon: '📱' },
  { value: 'email', label: 'Email Templates', icon: '📧' },
  { value: 'presentation', label: 'Presentations', icon: '📊' }
] as const;