'use client';

import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function BuyerPackMakerPage() {
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
                  Viewing Pack Maker
                </h1>
                <p className="text-xl text-slate-100 max-w-2xl mx-auto">
                  Professional property viewing packs for real estate agents
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
                  <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Coming Soon</h2>
                  <p className="text-xl text-slate-600 mb-8">
                    We&apos;re developing an intelligent viewing pack maker that will automatically scrape property listings
                    and create professional PDF documents for your client presentations.
                  </p>
                </div>

                {/* Features Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Auto Scraping</h3>
                    <p className="text-slate-600 text-sm">Automatically extract property data from listings</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">PDF Generation</h3>
                    <p className="text-slate-600 text-sm">Create professional PDF documents instantly</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Client Ready</h3>
                    <p className="text-slate-600 text-sm">Branded packs perfect for client presentations</p>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Want to be notified when we launch?</h3>
                  <p className="text-slate-600 mb-4">
                    Be the first to know when our viewing pack maker goes live with automated property scraping.
                  </p>
                  <button
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium"
                    onClick={() => alert("Thank you! We'll notify you when the viewing pack maker launches.")}
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
                      <span>Research Phase</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                      <span>Core Development</span>
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
