'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Plus,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const fetchCampaigns = () => {
    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async (campaignId: string) => {
    if (!confirm('Start broadcasting to all contacts in this campaign?')) return;
    setDispatchingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Broadcast has started in background!');
        fetchCampaigns();
      } else {
        alert(data.error || 'Failed to dispatch');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Bulk Campaigns & Broadcasts</h2>
          <p className="text-xs text-slate-500">
            Automated broadcast engine with rate-limiting, variable personalization, and anti-ban safeguards
          </p>
        </div>

        <Link
          href="/campaigns/new"
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Campaign (500+)</span>
        </Link>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Send className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-700">No campaigns created yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Broadcast PDF quotations, product catalogues, or custom alerts to 500+ contacts at once.
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1.5 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition-colors"
            >
              Start 4-Step Broadcast Wizard
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Template & Media</th>
                  <th className="py-3 px-4">Target Audience</th>
                  <th className="py-3 px-4">Progress / Sent</th>
                  <th className="py-3 px-4">Delivery & Read %</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => {
                  const sent = c.sentCount || 0;
                  const total = c.totalRecipients || 1;
                  const progressPct = Math.round((sent / total) * 100);
                  const deliveredPct = sent > 0 ? Math.round((c.deliveredCount / sent) * 100) : 0;
                  const readPct =
                    c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 100) : 0;

                  const statusBadges: Record<string, string> = {
                    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
                    PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
                    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="hover:text-emerald-600 transition-colors"
                        >
                          {c.name}
                        </Link>
                        {c.description && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-slate-700 font-medium">
                          {c.template?.name}
                        </span>
                        {c.mediaType !== 'NONE' && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                            {c.mediaType === 'DOCUMENT' && (
                              <FileText className="w-3 h-3 text-red-500" />
                            )}
                            {c.mediaType === 'IMAGE' && (
                              <ImageIcon className="w-3 h-3 text-blue-500" />
                            )}
                            <span>{c.mediaType} ({c.mediaFilename || 'Attachment'})</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        {total.toLocaleString()} recipients
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>{sent.toLocaleString()} sent</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-[11px] font-semibold text-slate-700">
                          <span className="text-emerald-600">{deliveredPct}%</span> Deliv •{' '}
                          <span className="text-indigo-600">{readPct}%</span> Read
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            statusBadges[c.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(c.status === 'DRAFT' || c.status === 'PAUSED') && (
                            <button
                              onClick={() => handleDispatch(c.id)}
                              disabled={dispatchingId === c.id}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{dispatchingId === c.id ? 'Starting...' : 'Dispatch'}</span>
                            </button>
                          )}
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] flex items-center gap-1"
                          >
                            <span>Report</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
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
