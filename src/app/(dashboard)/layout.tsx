'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Send,
  Users,
  FileCode,
  MessageSquare,
  Settings,
  ChevronRight,
  ShieldCheck,
  Zap,
  Menu,
  X,
  Building2,
  ExternalLink,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<any>({
    qualityRating: 'GREEN',
    messagingTier: 'TIER_1K',
    displayPhoneNumber: '+1 555-0199',
    tenantName: 'Acme Enterprise',
  });

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data?.tenant) {
          setHealth({
            qualityRating: data.tenant.qualityRating,
            messagingTier: data.tenant.messagingTier,
            displayPhoneNumber: data.tenant.displayPhoneNumber,
            tenantName: data.tenant.name,
          });
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Campaigns', href: '/campaigns', icon: Send },
    { label: 'Contacts', href: '/contacts', icon: Users },
    { label: 'Templates', href: '/templates', icon: FileCode },
    { label: 'Live Inbox', href: '/inbox', icon: MessageSquare },
    { label: 'WhatsApp API', href: '/settings/whatsapp', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20">
              W
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-white leading-tight">
                WhatsApp Bulk
              </h2>
              <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">
                Enterprise SaaS
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant Organization Switcher */}
        <div className="px-3 pt-3">
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {health.tenantName}
              </p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {health.displayPhoneNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm shadow-emerald-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-950" />}
              </Link>
            );
          })}
        </nav>

        {/* Meta Health Status Pill Widget */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">WABA Health:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {health.qualityRating}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Daily Limit:</span>
              <span className="text-white font-mono text-[10px] font-semibold bg-slate-800 px-1.5 py-0.5 rounded">
                {health.messagingTier} (1,000/day)
              </span>
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
            TH
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Tanvir Hossain</p>
            <p className="text-[10px] text-slate-400">Tenant Administrator</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-slate-800 text-base sm:text-lg">
              {navItems.find((n) => pathname.startsWith(n.href))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/campaigns/new"
              className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-3.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </Link>

            <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Meta Cloud API v20.0</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
