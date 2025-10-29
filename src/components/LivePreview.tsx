'use client';

interface PropertyFormData {
  title: string;
  shortSummary: string;
  address: string;
  suburb: string;
  city: string;
  price: string;
  beds: string;
  baths: string;
  garages: string;
  keyFeatures: string[];
  photos: File[];
  language: string;
}

interface LivePreviewProps {
  formData: PropertyFormData;
  generationSettings: {
    platforms: string[];
    tone: string;
    length: string;
    variations: number;
    seoKeywords: string;
  };
}

export default function LivePreview({ formData, generationSettings }: LivePreviewProps) {
  const formatPrice = (price: string) => {
    const numPrice = parseInt(price);
    if (isNaN(numPrice)) return price;
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const generatePreviewDescription = () => {
    if (!formData.title || !formData.shortSummary) {
      return "Complete the form to see a live preview of your property description.";
    }

    const features = formData.keyFeatures.length > 0
      ? `Key features include ${formData.keyFeatures.join(', ')}. `
      : '';

    const location = [formData.address, formData.suburb, formData.city]
      .filter(Boolean)
      .join(', ');

    const specs = [
      formData.beds && `${formData.beds} bedroom${formData.beds !== '1' ? 's' : ''}`,
      formData.baths && `${formData.baths} bathroom${formData.baths !== '1' ? 's' : ''}`,
      formData.garages && `${formData.garages} garage${formData.garages !== '1' ? 's' : ''}`
    ].filter(Boolean).join(', ');

    return `${formData.title}

${formData.shortSummary}

${location ? `Located in ${location}. ` : ''}${specs ? `This property features ${specs}. ` : ''}${features}

${formData.price ? `Priced at ${formatPrice(formData.price)}. ` : ''}

Contact us today to arrange a viewing!`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>

      {/* Property Details Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Property Summary</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[80px]">Title:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{formData.title || 'Not specified'}</p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[80px]">Price:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{formData.price ? formatPrice(formData.price) : 'Not specified'}</p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[80px]">Location:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">
              {[formData.suburb, formData.city].filter(Boolean).join(', ') || 'Not specified'}
            </p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[80px]">Bedrooms:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{formData.beds || 'Not specified'}</p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[80px]">Bathrooms:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{formData.baths || 'Not specified'}</p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[80px]">Garages:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{formData.garages || 'Not specified'}</p>
          </div>
          {formData.address && (
            <div className="flex justify-between items-start">
              <span className="text-gray-600 font-medium min-w-[80px]">Address:</span>
              <p className="font-medium text-gray-900 flex-1 text-right">{formData.address}</p>
            </div>
          )}
          {formData.keyFeatures.length > 0 && (
            <div className="flex justify-between items-start">
              <span className="text-gray-600 font-medium min-w-[80px]">Features:</span>
              <p className="font-medium text-gray-900 flex-1 text-right">{formData.keyFeatures.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Generation Settings */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Generation Settings</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[100px]">Platforms:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">
              {generationSettings.platforms.length > 0
                ? generationSettings.platforms.join(', ')
                : 'None selected'}
            </p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[100px]">Tone:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{generationSettings.tone}</p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[100px]">Length:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{generationSettings.length}</p>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium min-w-[100px]">Variations:</span>
            <p className="font-medium text-gray-900 flex-1 text-right">{generationSettings.variations}</p>
          </div>
          {generationSettings.seoKeywords && (
            <div className="flex justify-between items-start">
              <span className="text-gray-600 font-medium min-w-[100px]">SEO Keywords:</span>
              <p className="font-medium text-gray-900 flex-1 text-right">{generationSettings.seoKeywords}</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Description */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Preview Description</h4>
        <div className="p-4 bg-gray-50 rounded-lg min-h-[200px]">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
            {generatePreviewDescription()}
          </pre>
        </div>
      </div>

      {/* Photo Preview */}
      {formData.photos.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Photos ({formData.photos.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {formData.photos.map((photo, index) => (
              <div key={index} className="aspect-square">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Property photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}