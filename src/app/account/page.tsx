'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import BillingTab from '../../components/BillingTab';
import SecurityTab from '../../components/SecurityTab';


export default function AccountPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
   const [profileData, setProfileData] = useState({
     firstName: '',
     lastName: '',
     email: '',
     phone: '',
     company: '',
     website: '',
     bio: ''
   });
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
       } catch {
         console.error('Error loading user profile');
       }
     };

     loadUserProfile();
   }, []);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'billing', label: 'Billing', icon: '📄' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];


  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Update user metadata in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            phone: profileData.phone,
            company: profileData.company,
            website: profileData.website,
            bio: profileData.bio
          }
        });

        if (error) {
          throw error;
        }

        alert('Profile updated successfully!');
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Preferences updated successfully!');
    } catch {
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
      case 'credits':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-slate-900 mb-2">Credits Management Moved</h4>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Credit purchases and management are now handled through our dedicated payment page for better user experience.
                </p>
                <a
                  href="/payment"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Go to Payment Page
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
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
                <div className="text-sm text-slate-500">
                  API access is currently disabled
                </div>
              </div>

              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-slate-900 mb-2">API Access Disabled</h4>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  API keys are currently not available. This feature will be enabled in a future update.
                </p>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600">
                    <strong>Coming Soon:</strong> Programmatic access to our AI services for developers and enterprise customers.
                  </p>
                </div>
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
                Manage your credits, preferences, billing, and security settings
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