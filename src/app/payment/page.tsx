'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

const paymentPlans: PaymentPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 9900, // R99 in cents
    currency: 'ZAR',
    interval: 'month',
    features: [
      '50 AI Photo Edits',
      '25 Property Descriptions',
      '5 Video Generations',
      'Basic Templates',
      'Email Support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 19900, // R199 in cents
    currency: 'ZAR',
    interval: 'month',
    popular: true,
    features: [
      '200 AI Photo Edits',
      '100 Property Descriptions',
      '20 Video Generations',
      'Premium Templates',
      'CRM Integration',
      'Priority Support',
      'Custom Branding'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 39900, // R399 in cents
    currency: 'ZAR',
    interval: 'month',
    features: [
      'Unlimited AI Photo Edits',
      'Unlimited Property Descriptions',
      'Unlimited Video Generations',
      'All Templates',
      'Advanced CRM',
      'White-label Solution',
      'Dedicated Support',
      'API Access'
    ]
  }
];

export default function PaymentPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async (plan: PaymentPlan) => {
    setSelectedPlan(plan.id);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/yoco/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: plan.price,
          currency: plan.currency,
          description: `${plan.name} Plan - ${plan.interval}ly subscription`,
          metadata: {
            type: 'subscription',
            planId: plan.id,
            planName: plan.name,
            interval: plan.interval
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        // Redirect to YOCO checkout page
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to process payment. Please try again.');
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price / 100); // Convert from cents
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Unlock the full potential of AI-powered real estate tools with our flexible pricing plans.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {paymentPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-lg border transition-all duration-300 ${
                  plan.popular
                    ? 'border-blue-500 shadow-blue-100 scale-105'
                    : 'border-slate-200 hover:shadow-xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="text-4xl font-bold text-slate-900 mb-1">
                      {formatPrice(plan.price, plan.currency)}
                    </div>
                    <div className="text-slate-600">
                      per {plan.interval}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-slate-700">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePayment(plan)}
                    disabled={isProcessing}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                  >
                    {isProcessing && selectedPlan === plan.id ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Processing...</span>
                      </>
                    ) : (
                      `Subscribe to ${plan.name}`
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pay-as-you-go Credits Section */}
          <div className="bg-slate-50 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">
              Pay-as-you-go Credits
            </h2>
            <p className="text-slate-600 text-center mb-8">
              Buy credits on-demand to use our AI services. Perfect for occasional users or testing our features.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  id: '100',
                  name: '100 Credits',
                  price: 'R199',
                  usdPrice: '$9.99',
                  credits: 100,
                  description: 'Perfect for occasional use',
                  icon: '💰',
                  gradient: 'from-green-400 to-blue-500',
                  popular: false,
                  savings: null
                },
                {
                  id: '500',
                  name: '500 Credits',
                  price: 'R799',
                  usdPrice: '$39.99',
                  credits: 500,
                  description: 'Great value for regular users',
                  icon: '💎',
                  gradient: 'from-blue-500 to-purple-600',
                  popular: true,
                  savings: 'Save 20%'
                },
                {
                  id: '1000',
                  name: '1000 Credits',
                  price: 'R1,399',
                  usdPrice: '$69.99',
                  credits: 1000,
                  description: 'Best value for power users',
                  icon: '🏆',
                  gradient: 'from-purple-600 to-pink-600',
                  popular: false,
                  savings: 'Save 30%'
                }
              ].map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    pkg.popular
                      ? 'border-purple-300 ring-2 ring-purple-200'
                      : 'border-slate-200'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </div>
                  )}
                  {pkg.savings && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {pkg.savings}
                    </div>
                  )}

                  <div className={`bg-gradient-to-r ${pkg.gradient} p-6 text-white`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">{pkg.icon}</span>
                      <div>
                        <h4 className="text-xl font-bold">{pkg.name}</h4>
                        <p className="text-white/80 text-sm">{pkg.description}</p>
                      </div>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold">{pkg.price}</span>
                      <span className="text-white/80 ml-1">one-time</span>
                    </div>
                    <div className="mt-2 text-white/90 text-sm">
                      {pkg.credits} credits included
                    </div>
                    <div className="mt-1 text-white/70 text-xs">
                      ≈ {pkg.usdPrice} USD
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{pkg.credits}</p>
                        <p className="text-slate-600 text-sm">Credits</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-700 text-sm">
                          R{(parseFloat(pkg.price.replace('R', '').replace(',', '')) / pkg.credits * 100).toFixed(0)} per 100 credits
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePayment({
                        id: pkg.id,
                        name: pkg.name,
                        price: parseFloat(pkg.price.replace('R', '').replace(',', '')) * 100, // Convert to cents
                        currency: 'ZAR',
                        interval: 'month',
                        features: [`${pkg.credits} AI Credits`]
                      })}
                      disabled={isProcessing}
                      className={`w-full bg-gradient-to-r ${pkg.gradient} text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isProcessing && selectedPlan === pkg.id ? 'Processing...' : 'Purchase Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">Need more credits?</h4>
                  <p className="text-slate-600 text-sm">Contact our sales team for bulk pricing and enterprise solutions</p>
                </div>
                <button className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="text-center text-slate-600">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-semibold">Secure Payments</span>
            </div>
            <p className="text-sm">
              All payments are processed securely through YOCO with PCI DSS compliance.
              Your payment information is never stored on our servers.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}