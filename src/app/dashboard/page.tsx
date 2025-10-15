'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function DashboardPage() {
  const [stats] = useState({
    totalLeads: 0,
    totalProperties: 0,
    photosEdited: 0,
    videosGenerated: 0
  });

  const quickActions = [
    {
      title: 'AI Photo Editor',
      description: 'Enhance property photos with AI',
      href: '/photo-editor',
      icon: '🖼️',
      color: 'from-slate-500 to-blue-600'
    },
    {
      title: 'AI Property Descriptions',
      description: 'Generate compelling descriptions',
      href: '/property-descriptions',
      icon: '📝',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'CRM Dashboard',
      description: 'Manage leads and properties',
      href: '/crm',
      icon: '👥',
      color: 'from-violet-500 to-purple-600'
    },
    {
      title: 'AI Video Generator',
      description: 'Create stunning property videos',
      href: '/video-generator',
      icon: '🎥',
      color: 'from-orange-500 to-red-600'
    }
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Welcome to Your AI Real Estate Dashboard
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Access all your AI-powered tools to enhance your real estate business workflow.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {[
            { label: 'Total Leads', value: stats.totalLeads, icon: '👥', color: 'from-blue-500 to-blue-600' },
            { label: 'Properties', value: stats.totalProperties, icon: '🏠', color: 'from-green-500 to-green-600' },
            { label: 'Photos Edited', value: stats.photosEdited, icon: '🖼️', color: 'from-purple-500 to-purple-600' },
            { label: 'Videos Generated', value: stats.videosGenerated, icon: '🎥', color: 'from-orange-500 to-orange-600' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="bg-white rounded-xl shadow-lg p-6 border border-slate-100"
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="bg-white rounded-xl shadow-lg p-8 border border-slate-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href={action.href}
                  className="block bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-xl p-6 border border-slate-200 hover:border-slate-300 transition-all duration-300 group"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                      <span className="text-2xl">{action.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-slate-700">
                        {action.title}
                      </h3>
                      <p className="text-slate-600 group-hover:text-slate-500">
                        {action.description}
                      </p>
                    </div>
                    <div className="text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity Placeholder */}
        <motion.div
          className="bg-white rounded-xl shadow-lg p-8 border border-slate-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Recent Activity</h2>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-600">Your recent activity will appear here</p>
          </div>
        </motion.div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}