import React, { useState, useEffect } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  image?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: TutorialStep[];
  onComplete?: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  title,
  steps,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const nextStep = () => {
    if (isLastStep) {
      onComplete?.();
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-gray-50">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col space-y-6">
            {/* Step Title */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {currentStepData.content}
              </p>
            </div>

            {/* Step Image */}
            {currentStepData.image && (
              <div className="flex justify-center">
                <img
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            )}

            {/* Step Action */}
            {currentStepData.action && (
              <div className="flex justify-center">
                <button
                  onClick={currentStepData.action.onClick}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {currentStepData.action.label}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-6 pb-4">
          <div className="flex justify-center space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={isFirstStep}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isFirstStep
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            Previous
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Skip Tutorial
            </button>
            <button
              onClick={nextStep}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {isLastStep ? 'Complete Tutorial' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
export type { TutorialStep };