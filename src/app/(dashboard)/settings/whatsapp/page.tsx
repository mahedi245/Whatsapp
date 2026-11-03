'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
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
  QrCode,
  Smartphone,
  LogOut,
  Send,
  Zap,
  Info,
  Lock,
} from 'lucide-react';

export default function WhatsAppSettingsPage() {
  const [activeTab, setActiveTab] = useState<'qr' | 'meta'>('qr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Meta Form states
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [appSecret, setAppSecret] = useState('');

  // QR Gateway states
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pairingStatus, setPairingStatus] = useState<'DISCONNECTED' | 'SCANNING' | 'CONNECTED'>('DISCONNECTED');
  const [pairedPhone, setPairedPhone] = useState<string | null>(null);
  const [pairedPushName, setPairedPushName] = useState<string | null>(null);

  // Test Message states
  const [testNumber, setTestNumber] = useState('+8801608700420');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Status indicators
  const [config, setConfig] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
          if (data.config.gatewayProvider) {
            setActiveTab(data.config.gatewayProvider.toLowerCase() === 'meta' ? 'meta' : 'qr');
          }
          if (data.config.qrCodeDataUrl) {
            setQrDataUrl(data.config.qrCodeDataUrl);
          }
          if (data.config.pairingStatus) {
            setPairingStatus(data.config.pairingStatus);
          }
          if (data.config.pairedPhoneNumber) {
            setPairedPhone(data.config.pairedPhoneNumber);
          }
          if (data.config.pairedPushName) {
            setPairedPushName(data.config.pairedPushName);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchQrStatus = async () => {
    try {
      const res = await fetch('/api/gateway/qr');
      const data = await res.json();
      if (data.success) {
        setPairingStatus(data.pairingStatus);
        setQrDataUrl(data.qrCode);
        setPairedPhone(data.pairedPhoneNumber);
        setPairedPushName(data.pairedPushName);
      }
    } catch (err) {
      console.warn('QR status poll error:', err);
    }
  };

  const handleRefreshQr = async () => {
    setQrLoading(true);
    try {
      const res = await fetch('/api/gateway/connect', { method: 'POST' });
      const data = await res.json();
      if (data?.status?.qrCodeDataUrl) {
        setPairingStatus(data.status.pairingStatus);
        setQrDataUrl(data.status.qrCodeDataUrl);
      } else {
        await fetchQrStatus();
      }
    } catch (err) {
      console.error('Error refreshing QR:', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to unlink and disconnect your WhatsApp account?')) return;
    try {
      await fetch('/api/gateway/disconnect', { method: 'POST' });
      setPairingStatus('DISCONNECTED');
      setQrDataUrl(null);
      setPairedPhone(null);
      setPairedPushName(null);
      handleRefreshQr();
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber) return;
    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/gateway/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testNumber,
          mediaType: 'DOCUMENT',
          mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          filename: 'Official-Quotation-QT-2026.pdf',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `✅ Message sent successfully to ${testNumber}! Message ID: ${data.messageId}`,
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ Failed: ${data.error || 'Check that your WhatsApp account is connected'}`,
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `❌ Error: ${err.message}` });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchQrStatus();

    // Start polling QR status every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchQrStatus();
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
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
          gatewayProvider: 'META',
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
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">WhatsApp Gateway Connection</h2>
          <p className="text-xs text-slate-500">
            Connect your WhatsApp phone or configure Meta Cloud API for bulk messaging
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'qr'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>QR Scanner (Direct Phone)</span>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full">
              Recommended
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'meta'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-indigo-600" />
            <span>Meta Cloud API</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QR CODE SCANNER GATEWAY (DIRECT PHONE SCAN)                        */}
      {/* ========================================================================= */}
      {activeTab === 'qr' && (
        <div className="space-y-6">
          {/* Main Pairing Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm overflow-hidden relative">
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              {/* Left Column: QR Code Display / Connected State */}
              <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl w-full md:w-80 shrink-0">
                {pairingStatus === 'CONNECTED' ? (
                  <div className="py-8 space-y-4 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                        WhatsApp Linked & Active
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-800 font-mono mt-0.5">
                        {pairedPhone || '+880 1608-700420'}
                      </h4>
                      {pairedPushName && (
                        <p className="text-xs text-slate-500 font-medium">({pairedPushName})</p>
                      )}
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1.5 transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect Device</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center">
                    {/* Live QR Image or Spinner */}
                    <div className="w-60 h-60 bg-white p-2.5 rounded-2xl border-2 border-dashed border-emerald-400 flex items-center justify-center relative shadow-sm">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="WhatsApp Web Pairing QR Code"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400 text-center p-3">
                          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                          <span className="text-xs font-semibold text-slate-700">QR কোড তৈরি হচ্ছে...</span>
                          <span className="text-[11px] text-slate-400">কয়েক সেকেন্ড অপেক্ষা করুন</span>
                          <button
                            type="button"
                            onClick={handleRefreshQr}
                            className="mt-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold underline"
                          >
                            দেরি হলে এখানে চাপুন
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        qrDataUrl
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          qrDataUrl ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                        }`} />
                        {qrDataUrl ? 'Ready to Scan' : 'Generating QR...'}
                      </span>
                      <button
                        type="button"
                        disabled={qrLoading}
                        onClick={handleRefreshQr}
                        className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="Reload QR Code"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Step-by-Step Instructions & Features */}
              <div className="space-y-5 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      ফোনের WhatsApp দিয়ে স্ক্যান করুন (Scan to Pair)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    কোনো প্রকার মেটা ভেরিফিকেশন বা ফি ছাড়াই আপনার ব্যক্তিগত বা বিজনেস সিম থেকে মেসেজ পাঠানোর জন্য লিঙ্ক করুন।
                  </p>
                </div>

                {/* Steps in Bengali */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    সহজ ৪টি ধাপে কানেক্ট করুন:
                  </h4>
                  <ul className="text-xs text-slate-700 space-y-2 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        ১
                      </span>
                      <span>আপনার স্মার্টফোনে <strong>WhatsApp</strong> অ্যাপটি ওপেন করুন।</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        ২
                      </span>
                      <span>
                        ডানপাশের ৩-ডট মেনু (Android) অথবা Settings (iPhone) এ গিয়ে{' '}
                        <strong className="text-emerald-700 font-bold">Linked Devices</strong> সিলেক্ট করুন।
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        ৩
                      </span>
                      <span>
                        <strong className="text-emerald-700">Link a Device</strong> বাটনে ট্যাপ করুন।
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        ৪
                      </span>
                      <span>
                        ক্যামেরা দিয়ে বামপাশের <strong>QR Code</strong> টি স্ক্যান করলেই সফটওয়্যার কানেক্ট হয়ে যাবে!
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Anti-Ban Safeguard Highlights */}
                <div className="grid grid-cols-2 gap-2.5 text-slate-700">
                  <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-semibold">Anti-Ban Human Delay (৩.৫-৭.৫s)</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-semibold">২৫ মেসেজ পর অটোমেটিক পজ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Sender Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">
                টেস্ট মেসেজ পাঠান (Send Physical Test Message with Quotation PDF)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              আপনার কানেকশন চেক করার জন্য যেকোনো ফোন নম্বরে অফিসিয়াল পিডিএফ কোটেশন সহ টেস্ট মেসেজ পাঠান।
            </p>

            <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                required
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="+8801608700420"
                className="w-full sm:flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="submit"
                disabled={sendingTest || pairingStatus !== 'CONNECTED'}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'Sending Quotation PDF...' : 'Send Test WhatsApp Message'}</span>
              </button>
            </form>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: META CLOUD API (OFFICIAL ENTERPRISE SANDBOX)                       */}
      {/* ========================================================================= */}
      {activeTab === 'meta' && (
        <div className="space-y-6">
          {/* Quick Sandbox Banner */}
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-indigo-900">Official Meta Cloud API Mode</h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                Requires approved Meta Business Portfolio, WABA ID, and Phone Number ID.
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickSandboxSetup}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Load Demo Sandbox</span>
            </button>
          </div>

          {/* Meta API Live Health Status Card */}
          {config && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {config.verifiedName || 'WhatsApp Business Account'}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
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
              Enter your permanent token from Meta Graph API Explorer or System Users.
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
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
              <Globe className="w-4 h-4 text-indigo-600" />
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
      )}
    </div>
  );
}
