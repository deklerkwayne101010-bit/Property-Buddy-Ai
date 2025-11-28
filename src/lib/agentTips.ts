import { Tip } from '../components/HelpGuide';
import { TutorialStep as ModalTutorialStep } from '../components/TutorialModal';

// Photo Editor Tips
export const photoEditorTips: Tip[] = [
  {
    id: 'professional-lighting',
    title: 'Professional Lighting Matters',
    content: 'Ensure your property photos are taken during golden hour (early morning or late afternoon) when lighting is soft and warm. Avoid harsh midday sun that creates strong shadows and overexposed areas.',
    category: 'best-practice',
    priority: 'high'
  },
  {
    id: 'declutter-spaces',
    title: 'Declutter Before Editing',
    content: 'Remove personal items, excess furniture, and clutter from photos before editing. A clean, spacious look helps buyers visualize themselves in the property.',
    category: 'best-practice',
    priority: 'high'
  },
  {
    id: 'consistent-style',
    title: 'Maintain Consistent Style',
    content: 'Use similar lighting, angles, and editing styles across all photos of the same property. This creates a cohesive, professional presentation that builds trust with buyers.',
    category: 'best-practice',
    priority: 'high'
  },
  {
    id: 'enhance-not-change',
    title: 'Enhance, Don\'t Change Reality',
    content: 'Use AI tools to enhance natural beauty and lighting, but avoid dramatically altering the property\'s appearance. Buyers expect to see the real home, not a fantasy version.',
    category: 'warning',
    priority: 'high'
  },
  {
    id: 'focus-on-details',
    title: 'Highlight Key Features',
    content: 'Draw attention to important features like fireplaces, hardwood floors, or updated kitchens. Use subtle adjustments to make these elements stand out without being obvious.',
    category: 'tip',
    priority: 'medium'
  },
  {
    id: 'color-accuracy',
    title: 'Color Accuracy',
    content: 'Maintain accurate colors in your photos. Walls, flooring, and finishes should look true-to-life. Inaccurate colors can mislead buyers about the property\'s condition.',
    category: 'best-practice',
    priority: 'medium'
  },
  {
    id: 'mobile-optimization',
    title: 'Mobile-First Editing',
    content: 'Most buyers view property photos on mobile devices. Ensure your edits look great on small screens and that important details remain visible when zoomed.',
    category: 'tip',
    priority: 'medium'
  },
  {
    id: 'seasonal-considerations',
    title: 'Seasonal Awareness',
    content: 'Consider the season when editing. Winter photos might need warmth added, while summer photos might benefit from cooling filters to show the property year-round.',
    category: 'info',
    priority: 'low'
  }
];

// Property Organization Tips
export const propertyOrganizationTips: Tip[] = [
  {
    id: 'descriptive-names',
    title: 'Use Descriptive Property Names',
    content: 'Name your property folders with clear, descriptive titles like "8 Mews Downtown Penthouse" instead of generic names. This helps you quickly identify properties when working.',
    category: 'best-practice',
    priority: 'high'
  },
  {
    id: 'logical-grouping',
    title: 'Logical Photo Grouping',
    content: 'Organize photos within each property folder logically: exterior shots first, then living areas, bedrooms, bathrooms, and finally specialty features.',
    category: 'tip',
    priority: 'medium'
  },
  {
    id: 'backup-regularly',
    title: 'Regular Backups',
    content: 'Regularly backup your property folders. Consider keeping both original and edited versions of photos in case you need to make changes later.',
    category: 'warning',
    priority: 'medium'
  }
];

// AI Tool Usage Tips
export const aiToolTips: Tip[] = [
  {
    id: 'start-subtle',
    title: 'Start with Subtle Adjustments',
    content: 'Begin with gentle AI enhancements. You can always increase intensity, but it\'s harder to undo over-editing. Preview changes before applying them.',
    category: 'best-practice',
    priority: 'high'
  },
  {
    id: 'understand-limits',
    title: 'Understand AI Limitations',
    content: 'AI tools are powerful but not perfect. They work best with well-lit, clear photos. Poor quality source images will produce poor results regardless of AI power.',
    category: 'info',
    priority: 'medium'
  },
  {
    id: 'combine-tools',
    title: 'Combine Tools Strategically',
    content: 'Use different AI tools together for better results. For example, enhance lighting first, then adjust colors, then apply final touches.',
    category: 'tip',
    priority: 'medium'
  },
  {
    id: 'cost-awareness',
    title: 'Be Cost Aware',
    content: 'AI processing costs credits. Preview changes and consider if the enhancement is worth the credit cost. Some subtle manual adjustments might achieve similar results.',
    category: 'warning',
    priority: 'medium'
  }
];

// Photo Editor Tutorial
export const photoEditorTutorial: ModalTutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Photo Editor',
    content: 'This tutorial will guide you through professional photo editing techniques for real estate. Learn how to enhance your property photos to attract more buyers and sell faster.',
    action: {
      label: 'Start Tutorial',
      onClick: () => {}
    }
  },
  {
    id: 'upload-basics',
    title: 'Upload Your Photos',
    content: 'Start by uploading high-quality photos of your property. For best results, use photos taken in good lighting with your smartphone or professional camera. Avoid blurry or poorly lit images.',
    action: {
      label: 'Upload a Photo',
      onClick: () => {}
    }
  },
  {
    id: 'basic-edits',
    title: 'Basic Editing Tools',
    content: 'Use the basic tools to adjust brightness, contrast, and saturation. Start with small adjustments - you can always increase intensity but it\'s hard to undo over-editing.',
    action: {
      label: 'Try Basic Tools',
      onClick: () => {}
    }
  },
  {
    id: 'ai-enhancement',
    title: 'AI Enhancement Tools',
    content: 'Our AI tools can automatically enhance lighting, remove unwanted objects, and improve overall image quality. Use these tools thoughtfully to maintain the property\'s authentic appearance.',
    action: {
      label: 'Explore AI Tools',
      onClick: () => {}
    }
  },
  {
    id: 'property-organization',
    title: 'Organize by Property',
    content: 'Create property folders to keep your photos organized. This makes it easy to find and edit photos for specific listings, and helps maintain consistency across all photos of the same property.',
    action: {
      label: 'Create Property Folder',
      onClick: () => {}
    }
  },
  {
    id: 'best-practices',
    title: 'Professional Best Practices',
    content: 'Remember: enhance, don\'t change. Maintain accurate colors, highlight key features, and ensure your edits look professional on mobile devices. Your goal is to help buyers see the property\'s true potential.',
    action: {
      label: 'View Best Practices',
      onClick: () => {}
    }
  },
  {
    id: 'complete',
    title: 'Tutorial Complete!',
    content: 'You\'re now ready to create stunning property photos that will help sell homes faster. Remember to use these tools thoughtfully and maintain the property\'s authentic appeal. Happy editing!',
    action: {
      label: 'Start Editing',
      onClick: () => {}
    }
  }
];

// Marketing Materials Tutorial
export const marketingTutorial: ModalTutorialStep[] = [
  {
    id: 'marketing-intro',
    title: 'Marketing Materials Overview',
    content: 'Create professional marketing materials to showcase your properties. From brochures to social media posts, our tools help you create compelling content that attracts buyers.',
    action: {
      label: 'Explore Marketing Tools',
      onClick: () => {}
    }
  },
  {
    id: 'property-descriptions',
    title: 'Write Compelling Descriptions',
    content: 'Use our AI-powered description generator to create engaging property descriptions. Focus on lifestyle benefits, key features, and what makes this property special.',
    action: {
      label: 'Try Description Generator',
      onClick: () => {}
    }
  },
  {
    id: 'brochure-creation',
    title: 'Create Professional Brochures',
    content: 'Design beautiful property brochures with our templates. Include high-quality photos, detailed information, and your contact details to make a strong impression.',
    action: {
      label: 'Design a Brochure',
      onClick: () => {}
    }
  },
  {
    id: 'social-media',
    title: 'Social Media Content',
    content: 'Create eye-catching social media posts to promote your listings. Use our tools to generate captions, hashtags, and optimized images for different platforms.',
    action: {
      label: 'Create Social Post',
      onClick: () => {}
    }
  }
];