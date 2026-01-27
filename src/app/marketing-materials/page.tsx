'use client';

import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MarketingMaterialsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <motion.div
          className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <section className="relative overflow-hidden bg-gradient-to-r from-slate-600 to-blue-600 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl sm:text-6xl font-bold mb-6">
                  Marketing Materials
                </h1>
                <p className="text-xl text-slate-100 max-w-2xl mx-auto">
                  Professional marketing materials to elevate your real estate business
                </p>
              </motion.div>
            </div>
          </section>

          {/* Coming Soon Content */}
          <section className="py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-xl p-12 border border-slate-100"
              >
                {/* Icon */}
                <div className="mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Coming Soon</h2>
                  <p className="text-xl text-slate-600 mb-8">
                    We&apos;re working hard to bring you an amazing collection of professional marketing materials
                    tailored specifically for real estate agents.
                  </p>
                </div>

                {/* Features Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Business Cards</h3>
                    <p className="text-slate-600 text-sm">Professional business cards with your branding</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Brochures</h3>
                    <p className="text-slate-600 text-sm">Property brochures and flyers</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Signage</h3>
                    <p className="text-slate-600 text-sm">Open house and property signage</p>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Want to be notified when we launch?</h3>
                  <p className="text-slate-600 mb-4">
                    Be the first to know when our marketing materials shop goes live with exclusive early access.
                  </p>
                  <button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                    onClick={() => alert("Thank you! We'll notify you when the marketing materials shop launches.")}
                  >
                    Notify Me When It Launches
                  </button>
                </div>

                {/* Timeline */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Development Timeline</h3>
                  <div className="flex items-center justify-center space-x-8 text-sm text-slate-600">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span>Design Phase</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                      <span>Development</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-slate-300 rounded-full mr-2"></div>
                      <span>Testing</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-slate-300 rounded-full mr-2"></div>
                      <span>Launch</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </motion.div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
