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

interface MenuItem {
  href?: string;
  label: string;
  icon: string;
  children?: MenuItem[];
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const toggleMenu = (label: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedMenus(newExpanded);
  };

  const menuItems: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    {
      label: 'AI Editors',
      icon: '🤖',
      children: [
        { href: '/photo-editor', label: 'AI Photo Editor', icon: '🖼️' },
        { href: '/ai-playground', label: 'AI Playground', icon: '🎨' },
        { href: '/video-ai-maker', label: 'AI Video Maker', icon: '🎬' },
        { href: '/property-descriptions', label: 'AI Property Descriptions', icon: '📝' },
        { href: '/ai-chat', label: 'AI Chat Assistant', icon: '💬' },
      ]
    },
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
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Modern gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-95"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 via-transparent to-purple-600/20"></div>
        <div className="absolute inset-0 backdrop-blur-xl border-r border-white/10 shadow-2xl"></div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
            Stagefy
          </h2>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
          >
            <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex flex-col flex-1">
          {/* Menu items */}
          <ul className="space-y-2 px-6 py-6 flex-shrink-0">
            {menuItems.map((item, index) => (
              <li key={item.href || item.label} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                {item.children ? (
                  // Parent menu item with submenu
                  <div>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={`group relative flex items-center w-full px-4 py-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden ${
                        expandedMenus.has(item.label)
                          ? 'bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/25 backdrop-blur-sm border border-white/20'
                          : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 backdrop-blur-sm border border-transparent hover:border-white/10'
                      }`}
                    >
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                      <span className={`relative mr-4 text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                        expandedMenus.has(item.label) ? 'animate-pulse text-blue-300' : 'group-hover:text-blue-300'
                      }`}>
                        {item.icon}
                      </span>
                      <span className="relative font-medium">{item.label}</span>
                      <svg
                        className={`relative ml-auto w-5 h-5 transition-transform duration-300 ${
                          expandedMenus.has(item.label) ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Submenu */}
                    {expandedMenus.has(item.label) && (
                      <ul className="ml-6 mt-2 space-y-1 animate-fade-in">
                        {item.children.map((child, childIndex) => (
                          <li key={child.href} className="animate-fade-in" style={{ animationDelay: `${(index + childIndex + 1) * 0.1}s` }}>
                            <Link
                              href={child.href!}
                              className={`group relative flex items-center px-4 py-3 rounded-lg transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden ${
                                pathname === child.href
                                  ? 'bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white shadow-md shadow-blue-500/20 backdrop-blur-sm border border-white/15'
                                  : 'text-white/70 hover:text-white hover:bg-white/8 hover:shadow-md hover:shadow-white/3 backdrop-blur-sm border border-transparent hover:border-white/8'
                              }`}
                              onClick={() => {
                                if (window.innerWidth < 1024) onToggle(); // Close on mobile after click
                              }}
                              aria-current={pathname === child.href ? 'page' : undefined}
                            >
                              {/* Hover glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 to-purple-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>

                              <span className={`relative mr-3 text-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                                pathname === child.href ? 'animate-pulse text-blue-300' : 'group-hover:text-blue-300'
                              }`}>
                                {child.icon}
                              </span>
                              <span className="relative font-medium text-sm">{child.label}</span>
                              {pathname === child.href && (
                                <div className="relative ml-auto w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-scale-in shadow-lg shadow-blue-400/50"></div>
                              )}

                              {/* Active indicator line */}
                              {pathname === child.href && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full animate-pulse"></div>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  // Regular menu item
                  <Link
                    href={item.href!}
                    className={`group relative flex items-center px-4 py-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden ${
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

                    <span className={`relative mr-4 text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                      pathname === item.href ? 'animate-pulse text-blue-300' : 'group-hover:text-blue-300'
                    }`}>
                      {item.icon}
                    </span>
                    <span className="relative font-medium">{item.label}</span>
                    {pathname === item.href && (
                      <div className="relative ml-auto w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-scale-in shadow-lg shadow-blue-400/50"></div>
                    )}

                    {/* Active indicator line */}
                    {pathname === item.href && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full animate-pulse"></div>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Spacer to push bottom section down */}
          <div className="flex-1"></div>

          {/* Account and Logout buttons */}
          <div className="px-6 pb-6 space-y-3 flex-shrink-0">
            <Link
              href="/account"
              className={`group relative flex items-center w-full px-4 py-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden ${
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

              <span className={`relative mr-4 text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                pathname === '/account' ? 'animate-pulse text-blue-300' : 'group-hover:text-blue-300'
              }`}>
                👤
              </span>
              <span className="relative font-medium">Account</span>
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
              className="group relative flex items-center w-full px-4 py-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden text-white/80 hover:text-white hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10 backdrop-blur-sm border border-transparent hover:border-red-500/30"
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

              <span className="relative mr-4 text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:text-red-300">
                🚪
              </span>
              <span className="relative font-medium">Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}