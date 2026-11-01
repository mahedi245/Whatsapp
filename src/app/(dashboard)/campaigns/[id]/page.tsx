'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Users,
  Search,
  Filter,
} from 'lucide-react';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchCampaignData = () => {
    if (!campaignId) return;
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaign(data.campaign);
        setMessages(data.messages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaignData();
    const interval = setInterval(fetchCampaignData, 3000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const handleStartDispatch = async () => {
    setDispatching(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dispatch`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchCampaignData();
      } else {
        alert(data.error || 'Failed to dispatch');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDispatching(false);
    }
  };

  if (loading && !campaign) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading campaign details...</div>;
  }

  if (!campaign) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="font-bold text-sm text-slate-800">Campaign Not Found</h3>
        <Link href="/campaigns" className="text-xs text-emerald-600 font-bold hover:underline">
          ← Back to Campaigns
        </Link>
      </div>
    );
  }

  const total = campaign.totalRecipients || 1;
  const sent = campaign.sentCount || 0;
  const delivered = campaign.deliveredCount || 0;
  const read = campaign.readCount || 0;
  const failed = campaign.failedCount || 0;

  const progressPct = Math.round((sent / total) * 100);
  const deliveredPct = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const readPct = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
  const failedPct = sent > 0 ? Math.round((failed / sent) * 100) : 0;

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (search && !m.recipientNumber.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{campaign.name}</h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  campaign.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : campaign.status === 'PROCESSING'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Template: <span className="font-mono font-semibold text-slate-700">{campaign.template?.name}</span>
              {campaign.mediaType !== 'NONE' && ` • Header ${campaign.mediaType}`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaignData}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && (
            <button
              onClick={handleStartDispatch}
              disabled={dispatching}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{dispatching ? 'Broadcasting...' : 'Broadcast to Recipients'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Funnel Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sent */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Sent to Meta</span>
            <Send className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {sent.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">/ {total.toLocaleString()}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-semibold">
            <span>{progressPct}% completed</span>
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Delivered to Recipient</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            {delivered.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold">
            {deliveredPct}% delivery rate
          </div>
        </div>

        {/* Read Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Read (Blue Ticks)</span>
            <Eye className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 font-mono">
            {read.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-indigo-700 font-semibold">
            {readPct}% of delivered messages read
          </div>
        </div>

        {/* Failed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Delivery Failures</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 font-mono">
            {failed.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-red-700 font-semibold">
            {failedPct}% failed (invalid/opted-out)
          </div>
        </div>
      </div>

      {/* Recipient Message Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="SENT">SENT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="READ">READ</option>
              <option value="FAILED">FAILED</option>
            </select>
            <span className="text-xs text-slate-400 font-mono">
              {filteredMessages.length} recipients
            </span>
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Recipient Phone</th>
                <th className="py-3 px-4">Meta Message ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Personalized Variables</th>
                <th className="py-3 px-4">Timestamps</th>
                <th className="py-3 px-4 text-right">Error / Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No recipients found in this campaign yet.
                  </td>
                </tr>
              ) : (
                filteredMessages.slice(0, 100).map((m) => {
                  let dynamicVars: Record<string, string> = {};
                  try {
                    dynamicVars = JSON.parse(m.dynamicValuesJson || '{}');
                  } catch (e) {}

                  const statusColors: Record<string, string> = {
                    SENT: 'bg-blue-50 text-blue-700 border-blue-200',
                    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    READ: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    FAILED: 'bg-red-50 text-red-700 border-red-200',
                  };

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {m.recipientNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {m.metaMessageId ? `${m.metaMessageId.slice(0, 16)}...` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            statusColors[m.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Object.entries(dynamicVars).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
                            >
                              {k}: <span className="font-semibold">{v}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-slate-500 font-mono">
                        {m.readAt
                          ? `Read: ${new Date(m.readAt).toLocaleTimeString()}`
                          : m.deliveredAt
                          ? `Delivered: ${new Date(m.deliveredAt).toLocaleTimeString()}`
                          : m.sentAt
                          ? `Sent: ${new Date(m.sentAt).toLocaleTimeString()}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-[10px]">
                        {m.errorMessage ? (
                          <span className="text-red-600 font-semibold">
                            [{m.errorCode}] {m.errorMessage}
                          </span>
                        ) : (
                          <span className="text-emerald-600">Delivered</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
