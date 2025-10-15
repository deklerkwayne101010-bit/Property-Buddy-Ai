'use client';

interface QuickExamplesProps {
  onSelectExample: (example: any) => void;
}

export default function QuickExamples({ onSelectExample }: QuickExamplesProps) {
  const examples = [
    {
      title: 'Luxury Apartment',
      description: 'Modern 2-bedroom apartment in Sandton',
      data: {
        title: 'Stunning Modern Apartment in Sandton CBD',
        shortSummary: 'Luxurious 2-bedroom apartment with panoramic city views',
        address: '123 Rivonia Road',
        suburb: 'Sandton',
        city: 'Johannesburg',
        price: '3500000',
        beds: '2',
        baths: '2',
        garages: '1',
        keyFeatures: ['Panoramic City Views', 'Modern Kitchen', 'Secure Parking', 'Gym Access'],
        language: 'English'
      }
    },
    {
      title: 'Family Home',
      description: '4-bedroom house with garden in Pretoria',
      data: {
        title: 'Spacious Family Home in Pretoria East',
        shortSummary: 'Beautiful 4-bedroom house perfect for growing families',
        address: '456 Oak Avenue',
        suburb: 'Pretoria East',
        city: 'Pretoria',
        price: '2800000',
        beds: '4',
        baths: '3',
        garages: '2',
        keyFeatures: ['Large Garden', 'Study Room', 'Double Garage', 'Solar Panels'],
        language: 'English'
      }
    },
    {
      title: 'Bachelor Pad',
      description: 'Stylish 1-bedroom unit in Cape Town',
      data: {
        title: 'Trendy Bachelor Apartment in Waterfront',
        shortSummary: 'Stylish 1-bedroom apartment with harbor views',
        address: '789 Beach Road',
        suburb: 'Waterfront',
        city: 'Cape Town',
        price: '2200000',
        beds: '1',
        baths: '1',
        garages: '0',
        keyFeatures: ['Harbor Views', 'Open Plan Living', 'Modern Appliances', 'Walking Distance to Beach'],
        language: 'English'
      }
    },
    {
      title: 'Investment Property',
      description: 'Commercial space in Durban CBD',
      data: {
        title: 'Prime Commercial Space in Durban CBD',
        shortSummary: 'Excellent investment opportunity in high-traffic area',
        address: '321 Smith Street',
        suburb: 'Durban CBD',
        city: 'Durban',
        price: '4500000',
        beds: '0',
        baths: '2',
        garages: '0',
        keyFeatures: ['High Foot Traffic', 'Modern Fit-out', 'Parking Available', 'Close to Transport'],
        language: 'English'
      }
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Examples</h3>
      <p className="text-sm text-gray-600 mb-4">
        Click on any example below to quickly populate the form with sample data.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examples.map((example, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => onSelectExample(example.data)}
          >
            <h4 className="font-medium text-gray-900 mb-1">{example.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{example.description}</p>
            <div className="text-xs text-gray-500">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                {example.data.beds} bed{example.data.beds !== '1' ? 's' : ''}
              </span>
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
                R {parseInt(example.data.price).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h4>
        <p className="text-sm text-blue-800">
          Use these examples as starting points and customize them with your specific property details.
          The AI will generate unique descriptions based on the information you provide.
        </p>
      </div>
    </div>
  );
}