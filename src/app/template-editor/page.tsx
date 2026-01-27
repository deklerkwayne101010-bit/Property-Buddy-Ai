'use client';

import { motion } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function TemplateEditorPage() {
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
                  Template Editor
                </h1>
                <p className="text-xl text-slate-100 max-w-2xl mx-auto">
                  Professional template editing tools for your real estate business
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Coming Soon</h2>
                  <p className="text-xl text-slate-600 mb-8">
                    We're building an advanced template editor that will allow you to create and customize
                    professional marketing materials with ease.
                  </p>
                </div>

                {/* Features Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Image Editing</h3>
                    <p className="text-slate-600 text-sm">Advanced image manipulation and enhancement tools</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0V1m10 3V1m0 3l1 1v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5l1-1z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Template Library</h3>
                    <p className="text-slate-600 text-sm">Pre-designed templates for various marketing needs</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Brand Customization</h3>
                    <p className="text-slate-600 text-sm">Apply your branding consistently across all materials</p>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Want to be notified when we launch?</h3>
                  <p className="text-slate-600 mb-4">
                    Be the first to know when our template editor goes live with powerful design tools.
                  </p>
                  <button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                    onClick={() => alert("Thank you! We'll notify you when the template editor launches.")}
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
                      <span>Planning Phase</span>
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