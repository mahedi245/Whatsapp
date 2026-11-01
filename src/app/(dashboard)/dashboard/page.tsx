'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  CheckCheck,
  Eye,
  AlertCircle,
  Users,
  Upload,
  ArrowUpRight,
  TrendingUp,
  FileCode,
  MessageSquare,
  Play,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    fetch('/api/analytics/dashboard')
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const counts = data?.counts || {};
  const rates = data?.rates || {};
  const tenant = data?.tenant || {};
  const recentCampaigns = data?.recentCampaigns || [];

  const usagePercent = Math.min(
    100,
    Math.round(((tenant.messagesSentThisMonth || 0) / (tenant.maxMessagesPerMonth || 1)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">
              Welcome back, {tenant.name || 'Acme Enterprise'}! 👋
            </h2>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {tenant.planType || 'PRO'} Plan
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            WhatsApp Business API Bulk Broadcaster. Send PDF quotations, product catalogues, and rich media to 500+ customers at scale with real-time delivery tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/campaigns/new"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>New Bulk Campaign</span>
          </Link>
          <Link
            href="/contacts/import"
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Contacts</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Messages Broadcasted */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Sent</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {counts.sent?.toLocaleString() || 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">100%</span> target dispatch
            </p>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Delivery Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {rates.deliveryRate || 0}%
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {counts.delivered || 0} confirmed delivered
            </p>
          </div>
        </div>

        {/* Read Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Read / Open Rate</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {rates.readRate || 0}%
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {counts.read || 0} blue double-ticks
            </p>
          </div>
        </div>

        {/* Active Contact Audience */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Contacts</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {counts.activeContacts || 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Total database: {counts.totalContacts || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Quota Meter & Quick Launchers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Usage Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">Monthly Broadcast Quota</h4>
              <span className="text-xs font-bold text-emerald-600">{usagePercent}% used</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Included in your {tenant.planType || 'PRO'} SaaS Tier
            </p>

            <div className="mt-4">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, usagePercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>{tenant.messagesSentThisMonth?.toLocaleString() || 0} sent</span>
                <span>{tenant.maxMessagesPerMonth?.toLocaleString() || 25000} monthly limit</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Anti-Ban Throttling:</span>
            <span className="font-semibold text-emerald-600">Enabled (25 msg/sec)</span>
          </div>
        </div>

        {/* Feature Fast Shortcuts */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Quick Navigation</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/campaigns/new"
              className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/60 hover:bg-emerald-50/30 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 block">500+ Campaign</span>
              <span className="text-[10px] text-slate-400">Broadcast wizard</span>
            </Link>

            <Link
              href="/contacts/import"
              className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500/60 hover:bg-blue-50/30 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 block">Excel / CSV Import</span>
              <span className="text-[10px] text-slate-400">Bulk upload</span>
            </Link>

            <Link
              href="/templates"
              className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-500/60 hover:bg-purple-50/30 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <FileCode className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 block">Templates & PDF</span>
              <span className="text-[10px] text-slate-400">Sync with Meta</span>
            </Link>

            <Link
              href="/inbox"
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500/60 hover:bg-indigo-50/30 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 block">Live Chat Inbox</span>
              <span className="text-[10px] text-slate-400">2-way replies</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Recent Bulk Campaigns</h4>
            <p className="text-xs text-slate-500">Live execution statuses & delivery statistics</p>
          </div>
          <Link
            href="/campaigns"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500 mb-3">No campaigns created yet.</p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1.5 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition-colors"
            >
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Delivery Rate</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCampaigns.map((c: any) => {
                  const statusColors: Record<string, string> = {
                    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
                    PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
                    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  const deliveryPct =
                    c.sentCount > 0 ? Math.round((c.deliveredCount / c.sentCount) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {c.name}
                        {c.mediaType !== 'NONE' && (
                          <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-normal">
                            {c.mediaType}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {c.template?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.totalRecipients?.toLocaleString()} contacts
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            statusColors[c.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${deliveryPct}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700">{deliveryPct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
