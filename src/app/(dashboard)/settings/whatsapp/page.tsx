'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  PhoneCall,
  Key,
  Globe,
  Radio,
  Sparkles,
} from 'lucide-react';

export default function WhatsAppSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [appSecret, setAppSecret] = useState('');

  // Status indicators
  const [config, setConfig] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSettings = () => {
    setLoading(true);
    fetch('/api/settings/whatsapp')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config);
          setWabaId(data.config.wabaId || '');
          setPhoneNumberId(data.config.phoneNumberId || '');
          setWebhookVerifyToken(
            data.config.webhookVerifyToken || 'whatsapp_bulk_webhook_verify_token_2026'
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleQuickSandboxSetup = () => {
    setWabaId('109876543210987');
    setPhoneNumberId('101234567890123');
    setAccessToken('EAAXxXx_SamplePermanentMetaToken_xXxX');
    setWebhookVerifyToken('whatsapp_bulk_webhook_verify_token_2026');
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wabaId,
          phoneNumberId,
          accessToken: accessToken || undefined,
          webhookVerifyToken,
          appSecret: appSecret || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage('✅ Successfully verified with Meta WhatsApp Cloud API (Sandbox / Live Mode)!');
        fetchSettings();
      } else {
        alert(data.error || 'Connection verification failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const webhookUrl = `${currentHost}/api/webhooks/whatsapp`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title & Quick Sandbox Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">WhatsApp Business API Settings</h2>
          <p className="text-xs text-slate-500">
            Configure Meta WhatsApp Cloud API credentials, webhook endpoints, and anti-ban tier limits
          </p>
        </div>

        <button
          type="button"
          onClick={handleQuickSandboxSetup}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>⚡ Load Instant Demo Sandbox</span>
        </button>
      </div>

      {/* Meta API Live Health Status Card */}
      {config && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {config.verifiedName || 'WhatsApp Business Account'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Connected
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Display Phone: <span className="font-bold text-slate-700">{config.displayPhoneNumber}</span> • WABA ID: {config.wabaId}
                </p>
              </div>
            </div>

            {/* Health & Tier Badges */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Quality Rating</span>
                <span className="text-xs font-bold text-emerald-600">
                  {config.qualityRating || 'GREEN (High)'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Daily Broadcast Tier</span>
                <span className="text-xs font-bold text-indigo-600">
                  {config.messagingTier || 'TIER_10K (10,000/day)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Meta Cloud API Credentials</h3>
        <p className="text-xs text-slate-500 mb-5">
          Click <strong>"⚡ Load Instant Demo Sandbox"</strong> above to test everything immediately without needing a Meta account.
        </p>

        <form onSubmit={handleSaveAndTest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Business Account ID (WABA ID) *
              </label>
              <input
                type="text"
                required
                placeholder="109876543210987"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number ID *
              </label>
              <input
                type="text"
                required
                placeholder="101234567890123"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Permanent System User Access Token (Meta Graph API)
            </label>
            <input
              type="password"
              placeholder={config?.hasAccessToken ? '•••••••••••••••••••••••••••••• (Saved)' : 'EAAXxXx...'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                App Secret (for HMAC-SHA256 signature verification)
              </label>
              <input
                type="password"
                placeholder="Meta App Secret..."
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Webhook Verify Token
              </label>
              <input
                type="text"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{saving ? 'Testing & Verifying Connection...' : 'Save & Verify Meta Connection'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Webhook Configuration Guide Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Meta Webhook Configuration Setup
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          To receive delivery receipts (Sent, Delivered, Read blue ticks) and customer replies in the Live Inbox, configure this endpoint in your Meta App Dashboard under <strong>WhatsApp &gt; Configuration &gt; Webhook</strong>:
        </p>

        <div className="space-y-3">
          {/* Callback URL */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Callback URL</span>
              <span className="font-mono text-xs text-slate-800 break-all select-all font-semibold">
                {webhookUrl}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(webhookUrl)}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Verify Token */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Verify Token</span>
              <span className="font-mono text-xs text-slate-800 font-semibold">
                {webhookVerifyToken || 'whatsapp_bulk_webhook_verify_token_2026'}
              </span>
            </div>
            <button
              onClick={() =>
                copyToClipboard(webhookVerifyToken || 'whatsapp_bulk_webhook_verify_token_2026')
              }
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
