import React, { useState } from 'react';

interface Tip {
  id: string;
  title: string;
  content: string;
  category: 'best-practice' | 'warning' | 'tip' | 'info';
  priority: 'high' | 'medium' | 'low';
}

interface HelpGuideProps {
  tips: Tip[];
  title?: string;
  className?: string;
}

const HelpGuide: React.FC<HelpGuideProps> = ({
  tips,
  title = "Help & Tips",
  className = ""
}) => {
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());

  const toggleTip = (tipId: string) => {
    const newExpanded = new Set(expandedTips);
    if (newExpanded.has(tipId)) {
      newExpanded.delete(tipId);
    } else {
      newExpanded.add(tipId);
    }
    setExpandedTips(newExpanded);
  };

  const getCategoryIcon = (category: Tip['category']) => {
    switch (category) {
      case 'best-practice':
        return '⭐';
      case 'warning':
        return '⚠️';
      case 'tip':
        return '💡';
      case 'info':
        return 'ℹ️';
      default:
        return '💡';
    }
  };

  const getCategoryColor = (category: Tip['category']) => {
    switch (category) {
      case 'best-practice':
        return 'border-blue-200 bg-blue-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'tip':
        return 'border-green-200 bg-green-50';
      case 'info':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const sortedTips = [...tips].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🆘</span>
          {title}
        </h3>
        <span className="text-sm text-gray-500">
          {tips.length} tip{tips.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {sortedTips.map((tip) => (
          <div
            key={tip.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${getCategoryColor(tip.category)}`}
            onClick={() => toggleTip(tip.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <span className="text-lg">{getCategoryIcon(tip.category)}</span>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{tip.title}</h4>
                  {expandedTips.has(tip.id) && (
                    <p className="text-sm text-gray-700 leading-relaxed">{tip.content}</p>
                  )}
                </div>
              </div>
              <div className="ml-3">
                <svg
                  className={`w-5 h-5 text-gray-400 transform transition-transform ${
                    expandedTips.has(tip.id) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tips.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-2xl mb-2 block">📚</span>
          <p>No tips available for this section.</p>
        </div>
      )}
    </div>
  );
};

export default HelpGuide;
export type { Tip };