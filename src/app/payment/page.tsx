'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import LoadingSpinner from '../../components/LoadingSpinner';
import BillingTab from '../../components/BillingTab';
import { supabase } from '../../lib/supabase';

interface PaymentPlan {
   id: string;
   name: string;
   price: number;
   currency: string;
   interval: 'month' | 'year';
   features: string[];
   popular?: boolean;
   savings?: string;
   monthlyEquivalent?: string;
   metadata?: Record<string, unknown>;
}

const paymentPlans: PaymentPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0, // Free
    currency: 'ZAR',
    interval: 'month',
    features: [
      '5 credits included monthly',
      'Access to AI Photo Editor only',
      'Basic photo editing features',
      'Community support'
    ]
  },
  {
    id: 'starter-monthly',
    name: 'Starter',
    price: 15000, // R150 in cents
    currency: 'ZAR',
    interval: 'month',
    features: [
      '100 credits included',
      'Up to 50 photo edits per month',
      'Generate 2 AI property videos (30 seconds each)',
      'Access to basic property templates',
      'Email support'
    ]
  },
  {
    id: 'starter-yearly',
    name: 'Starter Annual',
    price: 144000, // R1,440 in cents (20% discount)
    currency: 'ZAR',
    interval: 'year',
    features: [
      '100 credits included monthly',
      'Up to 50 photo edits per month',
      'Generate 2 AI property videos (30 seconds each)',
      'Access to basic property templates',
      'Email support',
      'Save R360/year (20% off)'
    ],
    savings: 'Save 20%',
    monthlyEquivalent: 'R120/month'
  },
  {
    id: 'pro-monthly',
    name: 'Pro',
    price: 29900, // R299 in cents
    currency: 'ZAR',
    interval: 'month',
    popular: true,
    features: [
      '200 credits included',
      'Designed for about 6 listings per month',
      'Allows 120+ photo edits',
      'Generate 6–8 AI property videos',
      'Access to premium templates',
      'Priority email & chat support'
    ]
  },
  {
    id: 'pro-yearly',
    name: 'Pro Annual',
    price: 287040, // R2,870.40 in cents (20% discount)
    currency: 'ZAR',
    interval: 'year',
    features: [
      '200 credits included monthly',
      'Designed for about 6 listings per month',
      'Allows 120+ photo edits',
      'Generate 6–8 AI property videos',
      'Access to premium templates',
      'Priority email & chat support',
      'Save R718/year (20% off)'
    ],
    savings: 'Save 20%',
    monthlyEquivalent: 'R239/month'
  },
  {
    id: 'elite-monthly',
    name: 'Elite',
    price: 59900, // R599 in cents (scaling from Pro)
    currency: 'ZAR',
    interval: 'month',
    features: [
      '400 credits included',
      'Designed for about 12 listings per month',
      'Allows 240+ photo edits',
      'Generate 12–16 AI property videos',
      'Unlimited access to premium templates',
      'Team collaboration tools',
      'Priority support'
    ]
  },
  {
    id: 'elite-yearly',
    name: 'Elite Annual',
    price: 575040, // R5,750.40 in cents (20% discount)
    currency: 'ZAR',
    interval: 'year',
    features: [
      '400 credits included monthly',
      'Designed for about 12 listings per month',
      'Allows 240+ photo edits',
      'Generate 12–16 AI property videos',
      'Unlimited access to premium templates',
      'Team collaboration tools',
      'Priority support',
      'Save R1,438/year (20% off)'
    ],
    savings: 'Save 20%',
    monthlyEquivalent: 'R480/month'
  },
];

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'pricing'>('pricing');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentCanceled, setPaymentCanceled] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState('free');
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  useEffect(() => {
    // Load current subscription
    const loadCurrentSubscription = async () => {
      setIsLoadingSubscription(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // First try to get from credits API which includes subscription tier
          const creditsResponse = await fetch(`/api/credits?userId=${user.id}`);
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            console.log('Credits API response:', creditsData); // Debug log
            console.log('Setting subscription to:', creditsData.subscriptionTier); // Debug log
            setCurrentSubscription(creditsData.subscriptionTier || 'free');
          } else {
            console.log('Credits API failed, trying direct query'); // Debug log
            // Fallback to direct database query
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_tier')
              .eq('id', user.id)
              .single();

            if (profile) {
              console.log('Direct query result:', profile); // Debug log
              console.log('Setting subscription to:', profile.subscription_tier); // Debug log
              setCurrentSubscription(profile.subscription_tier || 'free');
            }
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    loadCurrentSubscription();

    // Set up a refresh interval to check for credit updates after payment
    const refreshInterval = setInterval(() => {
      loadCurrentSubscription();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    // Check for success/cancel parameters in URL
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setPaymentSuccess(true);
      // Clear URL parameters
      router.replace('/payment', undefined);
    } else if (canceled === 'true') {
      setPaymentCanceled(true);
      // Clear URL parameters
      router.replace('/payment', undefined);
    }
  }, [searchParams, router]);

  const handlePayment = async (plan: PaymentPlan) => {
    setSelectedPlan(plan.id);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/payfast/checkout', {
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

      if (data.success && data.formData && data.payfastUrl) {
        // Create and submit Payfast form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.payfastUrl;
        form.style.display = 'none';

        // Add all form fields
        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        // Add form to body and submit
        document.body.appendChild(form);
        form.submit();
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

  console.log('Rendering with currentSubscription:', currentSubscription); // Debug log

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Current Plan Indicator */}
          {isLoadingSubscription ? (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                <div>
                  <h3 className="text-blue-800 font-semibold">Loading subscription...</h3>
                  <p className="text-blue-700 text-sm">Please wait while we load your plan details</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-blue-800 font-semibold">Current Plan: {currentSubscription === 'free' ? 'Free Plan' : currentSubscription === 'pro' ? 'Pro Plan' : currentSubscription.charAt(0).toUpperCase() + currentSubscription.slice(1) + ' Plan'}</h3>
                  <p className="text-blue-700 text-sm">
                    {currentSubscription === 'free' ? '5 credits included - AI Photo Editor only' :
                      currentSubscription === 'starter' ? '100 credits included - Basic features' :
                      currentSubscription === 'pro' ? '200 credits included - Full features' :
                      currentSubscription === 'elite' ? '200 credits included - Premium features' :
                      currentSubscription === 'agency' ? '400 credits included - Enterprise features' : 'Unknown plan'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success/Cancel Messages */}
          {paymentSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="text-green-800 font-semibold">Payment Successful!</h3>
                  <p className="text-green-700 text-sm">Your credits have been added to your account.</p>
                </div>
                <button
                  onClick={() => setPaymentSuccess(false)}
                  className="ml-auto text-green-500 hover:text-green-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {paymentCanceled && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-yellow-800 font-semibold">Payment Canceled</h3>
                  <p className="text-yellow-700 text-sm">Your payment was canceled. No charges were made.</p>
                </div>
                <button
                  onClick={() => setPaymentCanceled(false)}
                  className="ml-auto text-yellow-500 hover:text-yellow-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Tab Navigation - Removed Billing & Credits tab */}
          <div className="mb-8">
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pricing'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Pricing Plans
                </button>
              </nav>
            </div>
          </div>

          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Unlock the full potential of AI-powered real estate tools with our flexible pricing plans.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                  billingInterval === 'month'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                  billingInterval === 'year'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual
                <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {paymentPlans.filter(plan => plan.interval === billingInterval || plan.id === 'free').map((plan) => (
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

                <div className="p-6">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">
                      {plan.name}
                    </h3>
                    {plan.price === 0 ? (
                      <div className="text-5xl font-bold text-slate-900 mb-2">
                        Free
                      </div>
                    ) : (
                      <div className="text-5xl font-bold text-slate-900 mb-2">
                        {formatPrice(plan.price, plan.currency)}
                      </div>
                    )}
                    <div className="text-slate-600 text-lg mb-4">
                      {plan.price === 0 ? 'forever' : `per ${plan.interval}`}
                    </div>
                    {plan.savings && (
                      <div className="mb-2">
                        <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-semibold">
                          {plan.savings}
                        </span>
                      </div>
                    )}
                    {plan.monthlyEquivalent && (
                      <div className="text-slate-500 text-base">
                        {plan.monthlyEquivalent} equivalent
                      </div>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-slate-700">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-base leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => plan.price === 0 ? null : handlePayment(plan)}
                    disabled={isProcessing || plan.price === 0}
                    className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 text-lg ${
                      plan.price === 0
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                  >
                    {plan.price === 0 ? (
                      'Current Plan'
                    ) : isProcessing && selectedPlan === plan.id ? (
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
              Credit Top-Ups (Pay-As-You-Go)
            </h2>
            <p className="text-slate-600 text-center mb-8">
              Buy credits on-demand to use our AI services. Perfect for occasional users or testing our features.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  id: '50',
                  name: '50 Credits',
                  price: 'R100',
                  usdPrice: '$5.00',
                  credits: 50,
                  description: 'Perfect for trying out our services',
                  icon: '💰',
                  gradient: 'from-green-400 to-blue-500',
                  popular: false,
                  savings: null,
                  costPerCredit: 'R2.00'
                },
                {
                  id: '100',
                  name: '100 Credits',
                  price: 'R200',
                  usdPrice: '$10.00',
                  credits: 100,
                  description: 'Great for occasional use',
                  icon: '💎',
                  gradient: 'from-blue-500 to-purple-600',
                  popular: false,
                  savings: null,
                  costPerCredit: 'R2.00'
                },
                {
                  id: '200',
                  name: '200 Credits',
                  price: 'R400',
                  usdPrice: '$20.00',
                  credits: 200,
                  description: 'Best value for regular users',
                  icon: '⭐',
                  gradient: 'from-purple-600 to-pink-600',
                  popular: true,
                  savings: null,
                  costPerCredit: 'R2.00'
                },
                {
                  id: '300',
                  name: '300 Credits',
                  price: 'R600',
                  usdPrice: '$30.00',
                  credits: 300,
                  description: 'Ideal for agencies and power users',
                  icon: '🏆',
                  gradient: 'from-pink-600 to-red-600',
                  popular: false,
                  savings: null,
                  costPerCredit: 'R2.00'
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
                          {pkg.costPerCredit} per credit
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
                        features: [`${pkg.credits} AI Credits`],
                        metadata: {
                          type: 'credits',
                          credits: pkg.credits
                        }
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

          {/* Notes & Details */}
          <div className="bg-white rounded-xl p-8 mb-8 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Notes & Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-slate-700 font-medium">Credit Usage</p>
                    <p className="text-slate-600 text-sm">1 credit = 1 AI image edit</p>
                    <p className="text-slate-600 text-sm">4 credits = 1 AI video (30 seconds)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-slate-700 font-medium">VAT Included</p>
                    <p className="text-slate-600 text-sm">All prices include VAT</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-slate-700 font-medium">Billing Cycle</p>
                    <p className="text-slate-600 text-sm">Monthly subscriptions auto-renew</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-slate-700 font-medium">Cancel Anytime</p>
                    <p className="text-slate-600 text-sm">No long-term contracts</p>
                  </div>
                </div>
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
              All payments are processed securely through Payfast with PCI DSS compliance.
              Your payment information is never stored on our servers.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}
