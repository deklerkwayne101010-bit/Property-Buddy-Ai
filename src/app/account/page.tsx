'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import BillingTab from '../../components/BillingTab';
import SecurityTab from '../../components/SecurityTab';

export default function AccountPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [userCredits, setUserCredits] = useState(1250);
    const [usageStats, setUsageStats] = useState({
      photoEdits: { used: 450, total: 1000 },
      videoGeneration: { used: 200, total: 500 },
      propertyDescriptions: { used: 100, total: 200 }
    });
   const [profileData, setProfileData] = useState({
     firstName: '',
     lastName: '',
     email: '',
     phone: '',
     company: '',
     website: '',
     bio: ''
   });
   const [apiKeys, setApiKeys] = useState([
     { id: '1', name: 'Primary API Key', key: 'sk-••••••••••••••••••••••••••••••••', created: '2024-01-15', lastUsed: '2024-10-14', status: 'active' },
     { id: '2', name: 'Development Key', key: 'sk-••••••••••••••••••••••••••••••••', created: '2024-03-20', lastUsed: '2024-10-10', status: 'active' }
   ]);
   const [preferences, setPreferences] = useState({
     emailNotifications: {
       creditAlerts: true,
       monthlyReports: true,
       marketingUpdates: false,
       weeklyDigest: true
     },
     theme: 'light',
     language: 'en',
     timezone: 'UTC+2',
     autoSave: true,
     dataRetention: '1year'
   });
  useEffect(() => {
     // Load user profile data on component mount
     const loadUserProfile = async () => {
       try {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           setProfileData({
             firstName: user.user_metadata?.first_name || 'John',
             lastName: user.user_metadata?.last_name || 'Doe',
             email: user.email || 'john.doe@example.com',
             phone: user.user_metadata?.phone || '+1 (555) 123-4567',
             company: user.user_metadata?.company || 'Real Estate Pro',
             website: user.user_metadata?.website || 'https://realestatepro.com',
             bio: user.user_metadata?.bio || 'Experienced real estate agent specializing in luxury properties.'
           });
         }
       } catch (error) {
         console.error('Error loading user profile:', error);
       }
     };

     // Load user credits and usage stats
     const loadCreditsAndUsage = async () => {
       try {
         const response = await fetch('/api/usage');
         const usageData = await response.json();

         setUserCredits(usageData.credits || 0);
         setUsageStats(usageData.usageStats);
       } catch (error) {
         console.error('Error loading credits and usage:', error);
       }
     };

     loadUserProfile();
     loadCreditsAndUsage();
   }, []);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'subscription', label: 'Subscription', icon: '💎' },
    { id: 'credits', label: 'Credits', icon: '💰' },
    { id: 'api', label: 'API Keys', icon: '🔑' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'billing', label: 'Billing', icon: '📄' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];

  const subscriptionTiers = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$9',
      period: '/month',
      description: 'Perfect for individual agents',
      icon: '🚀',
      gradient: 'from-green-400 to-blue-500',
      features: [
        '50 photo edits/month',
        'Basic AI enhancement',
        'Property descriptions',
        'Email support',
        'Basic analytics'
      ],
      limits: {
        photos: '50/month',
        videos: '5/month',
        properties: '25/month'
      },
      popular: false,
      current: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'Perfect for growing real estate businesses',
      icon: '💎',
      gradient: 'from-blue-500 to-purple-600',
      features: [
        'Unlimited photo edits',
        'AI video generation',
        'CRM integration',
        'Priority support',
        'Advanced analytics',
        'Custom branding'
      ],
      limits: {
        photos: 'Unlimited',
        videos: '50/month',
        properties: 'Unlimited'
      },
      popular: true,
      current: true
    },
    {
      id: 'elite',
      name: 'Elite',
      price: '$99',
      period: '/month',
      description: 'For enterprise real estate teams',
      icon: '🏆',
      gradient: 'from-purple-600 to-pink-600',
      features: [
        'Everything in Pro',
        'White-label solution',
        'API access',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced AI models'
      ],
      limits: {
        photos: 'Unlimited',
        videos: 'Unlimited',
        properties: 'Unlimited'
      },
      popular: false,
      current: false
    }
  ];

  const handlePurchase = async (packageId: string) => {
    setIsPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to purchase credits');
        return;
      }

      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
         alert(`Successfully purchased credits! You now have ${result.credits} credits.`);
         setUserCredits(result.credits);
         // Update usage stats if needed
         setUsageStats(prev => ({
           ...prev,
           // Reset usage counters for new billing cycle if applicable
         }));
       } else {
         alert('Purchase failed: ' + result.error);
       }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('An error occurred during purchase. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateApiKey = async (keyId: string) => {
    try {
      const newKey = `sk-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      setApiKeys(prev => prev.map(key =>
        key.id === keyId
          ? { ...key, key: `sk-••••••••••••••••••••••••••••••••`, lastUsed: new Date().toISOString().split('T')[0] }
          : key
      ));
      alert('API key regenerated successfully!');
    } catch (error) {
      alert('Failed to regenerate API key. Please try again.');
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      alert('API key deleted successfully!');
    }
  };

  const handleCreateApiKey = async () => {
    const name = prompt('Enter a name for the new API key:');
    if (name) {
      const newKey = {
        id: Date.now().toString(),
        name,
        key: `sk-••••••••••••••••••••••••••••••••`,
        created: new Date().toISOString().split('T')[0],
        lastUsed: 'Never',
        status: 'active' as const
      };
      setApiKeys(prev => [...prev, newKey]);
      alert('API key created successfully!');
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Preferences updated successfully!');
    } catch (error) {
      alert('Failed to update preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <h3 className="text-xl font-semibold text-slate-900 mb-6">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={profileData.company}
                    onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={profileData.website}
                    onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'subscription':
        return (
          <div className="space-y-8">
            {/* Current Plan Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Current Plan</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Pro Plan</h4>
                    <p className="text-slate-600 text-sm">$29/month • Next billing: Nov 15, 2024</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                    Change Plan
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Cancel Plan
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Choose Your Plan</h3>
              <p className="text-slate-600">Select the perfect plan for your real estate business needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {subscriptionTiers.map((tier) => (
                <motion.div
                  key={tier.id}
                  className={`relative bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    tier.current
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : tier.popular
                      ? 'border-purple-300'
                      : 'border-slate-200'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: subscriptionTiers.indexOf(tier) * 0.1 }}
                >
                  {tier.current && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Current Plan
                    </div>
                  )}
                  {tier.popular && !tier.current && (
                    <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </div>
                  )}

                  <div className={`bg-gradient-to-r ${tier.gradient} p-6 text-white`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <h4 className="text-xl font-bold">{tier.name}</h4>
                        <p className="text-white/80 text-sm">{tier.description}</p>
                      </div>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      <span className="text-white/80 ml-1">{tier.period}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      <h5 className="font-semibold text-slate-900">Features</h5>
                      <ul className="space-y-3">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-3">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-slate-700 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3 mb-6">
                      <h5 className="font-semibold text-slate-900">Limits</h5>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Photo edits:</span>
                          <span className="font-medium text-slate-900">{tier.limits.photos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Video generation:</span>
                          <span className="font-medium text-slate-900">{tier.limits.videos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Properties:</span>
                          <span className="font-medium text-slate-900">{tier.limits.properties}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {tier.current ? (
                        <button className="w-full bg-slate-100 text-slate-500 py-3 px-4 rounded-lg font-semibold cursor-not-allowed">
                          Current Plan
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <button className={`w-full bg-gradient-to-r ${tier.gradient} text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity`}>
                            {subscriptionTiers.findIndex(t => t.current) > subscriptionTiers.indexOf(tier) ? 'Downgrade' : 'Upgrade'} to {tier.name}
                          </button>
                          <button className="w-full border border-slate-300 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">
                            Compare Plans
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">Need a custom plan?</h4>
                  <p className="text-slate-600 text-sm">Contact our sales team for enterprise solutions</p>
                </div>
                <button className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        );
      case 'credits':
        return (
          <div className="space-y-8">
            {/* Credit Balance */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Credit Balance</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">{userCredits.toLocaleString()}</p>
                  <p className="text-slate-600">Available credits</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Credits reset monthly</p>
                  <p className="text-sm text-slate-500">Used this month: {(usageStats.photoEdits.used + usageStats.videoGeneration.used + usageStats.propertyDescriptions.used).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Credit Usage Statistics */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Credit Usage</h3>
              <div className="space-y-4">
                {[
                  { service: 'Photo Enhancement', used: usageStats.photoEdits.used, total: usageStats.photoEdits.total },
                  { service: 'Video Generation', used: usageStats.videoGeneration.used, total: usageStats.videoGeneration.total },
                  { service: 'Property Descriptions', used: usageStats.propertyDescriptions.used, total: usageStats.propertyDescriptions.total },
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">{item.service}</span>
                      <span className="text-slate-500">{item.used}/{item.total}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(item.used / item.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Packages */}
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Purchase Credits</h3>
                <p className="text-slate-600">Buy additional credits to continue using our AI services</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    id: '100',
                    name: '100 Credits',
                    price: '$9.99',
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
                    price: '$39.99',
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
                    price: '$69.99',
                    credits: 1000,
                    description: 'Best value for power users',
                    icon: '🏆',
                    gradient: 'from-purple-600 to-pink-600',
                    popular: false,
                    savings: 'Save 30%'
                  }
                ].map((pkg) => (
                  <motion.div
                    key={pkg.id}
                    className={`relative bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all duration-300 hover:shadow-xl ${
                      pkg.popular
                        ? 'border-purple-300 ring-2 ring-purple-200'
                        : 'border-slate-200'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: ['100', '500', '1000'].indexOf(pkg.id) * 0.1 }}
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
                    </div>

                    <div className="p-6">
                      <div className="space-y-4 mb-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900">{pkg.credits}</p>
                          <p className="text-slate-600 text-sm">Credits</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-700 text-sm">
                            ${(parseFloat(pkg.price.replace('$', '')) / pkg.credits * 100).toFixed(2)} per 100 credits
                          </p>
                        </div>
                      </div>

                      <button
                        className={`w-full bg-gradient-to-r ${pkg.gradient} text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                        disabled={isPurchasing}
                        onClick={() => handlePurchase(pkg.id)}
                      >
                        {isPurchasing ? 'Processing...' : 'Purchase Now'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">Need more credits?</h4>
                    <p className="text-slate-600 text-sm">Contact our sales team for bulk pricing</p>
                  </div>
                  <button className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                    Contact Sales
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'api':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">API Keys</h3>
                <button
                  onClick={handleCreateApiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Key
                </button>
              </div>

              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-slate-900">{apiKey.name}</h4>
                        <p className="text-sm text-slate-500">Created: {apiKey.created} • Last used: {apiKey.lastUsed}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          apiKey.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {apiKey.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <input
                          type="password"
                          value={apiKey.key}
                          readOnly
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRegenerateApiKey(apiKey.id)}
                          className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(apiKey.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">API Documentation</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Learn how to integrate our AI services into your applications.
                </p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View API Docs →
                </button>
              </div>
            </div>
          </div>
        );
      case 'preferences':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <h3 className="text-xl font-semibold text-slate-900 mb-6">Account Preferences</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Email Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.creditAlerts}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          emailNotifications: { ...prev.emailNotifications, creditAlerts: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-slate-700">Credit usage alerts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.monthlyReports}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          emailNotifications: { ...prev.emailNotifications, monthlyReports: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-slate-700">Monthly usage reports</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.weeklyDigest}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          emailNotifications: { ...prev.emailNotifications, weeklyDigest: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-slate-700">Weekly digest</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.marketingUpdates}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          emailNotifications: { ...prev.emailNotifications, marketingUpdates: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-slate-700">Marketing updates and promotions</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="UTC-8">Pacific Time (UTC-8)</option>
                      <option value="UTC-5">Eastern Time (UTC-5)</option>
                      <option value="UTC+0">GMT (UTC+0)</option>
                      <option value="UTC+1">Central European Time (UTC+1)</option>
                      <option value="UTC+2">South African Time (UTC+2)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Data Retention</label>
                    <select
                      value={preferences.dataRetention}
                      onChange={(e) => setPreferences(prev => ({ ...prev, dataRetention: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="3months">3 months</option>
                      <option value="6months">6 months</option>
                      <option value="1year">1 year</option>
                      <option value="2years">2 years</option>
                      <option value="forever">Forever</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.autoSave}
                      onChange={(e) => setPreferences(prev => ({ ...prev, autoSave: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-slate-700">Auto-save drafts</span>
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSavePreferences}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'billing':
        return (
          <BillingTab />
        );
      case 'security':
        return (
          <SecurityTab />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Card */}
        <motion.div
          className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-lg p-8 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
              <p className="text-blue-100 text-lg">
                Manage your subscription, credits, and account preferences
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}