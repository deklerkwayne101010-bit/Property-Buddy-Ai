'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/photo-editor', label: 'AI Photo Editor', icon: '🖼️' },
    { href: '/video-ai-maker', label: 'AI Video Maker', icon: '🎬' },
    { href: '/property-descriptions', label: 'AI Property Descriptions', icon: '📝' },
    { href: '/ai-chat', label: 'AI Chat Assistant', icon: '💬' },
    { href: '/templates', label: 'Templates', icon: '📋' },
    { href: '/marketing-materials', label: 'Marketing Materials', icon: '📢' },
    { href: '/crm', label: 'CRM', icon: '👥' },
    { href: '/payment', label: 'Pricing & Payments', icon: '💳' },
  ];

  // Check if video generator page exists
  const videoGeneratorExists = true; // We'll assume it exists for now

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 xl:w-80 flex flex-col transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Modern gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-95"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 via-transparent to-purple-600/20"></div>
        <div className="absolute inset-0 backdrop-blur-xl border-r border-white/10 shadow-2xl"></div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
            Stagefy
          </h2>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
          >
            <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex flex-col flex-1 overflow-y-auto">
          {/* Menu items */}
          <ul className="space-y-1 sm:space-y-2 px-3 sm:px-6 py-3 sm:py-6">
            {menuItems.map((item, index) => (
              <li key={item.href} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <Link
                  href={item.href}
                  className={`group relative flex items-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 backdrop-blur-sm border border-transparent hover:border-white/10'
                  }`}
                  onClick={() => {
                    if (window.innerWidth < 1024) onToggle(); // Close on mobile after click
                  }}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                  <span className={`relative mr-3 sm:mr-4 text-lg sm:text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                    pathname === item.href ? 'animate-pulse text-blue-300' : 'group-hover:text-blue-300'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="relative font-medium text-sm sm:text-base">{item.label}</span>
                  {pathname === item.href && (
                    <div className="relative ml-auto w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-scale-in shadow-lg shadow-blue-400/50"></div>
                  )}

                  {/* Active indicator line */}
                  {pathname === item.href && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full animate-pulse"></div>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Spacer to push bottom section down */}
          <div className="flex-1"></div>

          {/* Account and Logout buttons */}
          <div className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-2 sm:space-y-3">
            <Link
              href="/account"
              className={`group relative flex items-center w-full px-3 sm:px-4 py-3 sm:py-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden ${
                pathname === '/account'
                  ? 'bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-white/20'
                  : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 backdrop-blur-sm border border-transparent hover:border-white/10'
              }`}
              onClick={() => {
                if (window.innerWidth < 1024) onToggle(); // Close on mobile after click
              }}
              aria-current={pathname === '/account' ? 'page' : undefined}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

              <span className={`relative mr-3 sm:mr-4 text-lg sm:text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                pathname === '/account' ? 'animate-pulse text-blue-300' : 'group-hover:text-blue-300'
              }`}>
                👤
              </span>
              <span className="relative font-medium text-sm sm:text-base">Account</span>
              {pathname === '/account' && (
                <div className="relative ml-auto w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-scale-in shadow-lg shadow-blue-400/50"></div>
              )}

              {/* Active indicator line */}
              {pathname === '/account' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full animate-pulse"></div>
              )}
            </Link>

            <button
              onClick={handleSignOut}
              className="group relative flex items-center w-full px-3 sm:px-4 py-3 sm:py-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden text-white/80 hover:text-white hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10 backdrop-blur-sm border border-transparent hover:border-red-500/30"
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

              <span className="relative mr-3 sm:mr-4 text-lg sm:text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:text-red-300">
                🚪
              </span>
              <span className="relative font-medium text-sm sm:text-base">Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}