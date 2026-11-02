'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Users,
  FileCode,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Sparkles,
  PhoneCall,
  Check,
} from 'lucide-react';
import { TemplatePhonePreview } from '@/components/templates/TemplatePhonePreview';

export default function NewCampaignWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Data sources
  const [templates, setTemplates] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [contactCounts, setContactCounts] = useState({ total: 0 });

  // Step 1: Details & Audience
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audienceType, setAudienceType] = useState<'ALL' | 'TAG' | 'GROUP'>('ALL');
  const [targetId, setTargetId] = useState('');

  // Step 2: Template & Media
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [mediaType, setMediaType] = useState<'NONE' | 'DOCUMENT' | 'IMAGE'>('NONE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFilename, setMediaFilename] = useState('');

  // Step 3: Variable Mapping
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});

  // Step 4: Dispatch Settings & Test Send
  const [batchDelayMs, setBatchDelayMs] = useState(100); // 100ms = 10 msg/sec
  const [testPhoneNumber, setTestPhoneNumber] = useState('+8801711000000');
  const [testSending, setTestSending] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState('');
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    // Fetch Templates
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        const list = data.templates || [];
        setTemplates(list);
        if (list.length > 0) {
          handleSelectTemplate(list[0]);
        }
      })
      .catch(() => {});

    // Fetch Tags
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {});

    // Fetch Groups
    fetch('/api/groups')
      .then((res) => res.json())
      .then((data) => setGroups(data.groups || []))
      .catch(() => {});

    // Fetch Contacts count
    fetch('/api/contacts?limit=1')
      .then((res) => res.json())
      .then((data) => setContactCounts({ total: data?.pagination?.total || 0 }))
      .catch(() => {});
  }, []);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplateId(template.id);
    const comps = JSON.parse(template.componentsJson || '[]');
    const header = comps.find((c: any) => c.type === 'HEADER');

    if (header?.format === 'DOCUMENT') {
      setMediaType('DOCUMENT');
      setMediaUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
      setMediaFilename('Quotation_Invoice_2026.pdf');
    } else if (header?.format === 'IMAGE') {
      setMediaType('IMAGE');
      setMediaUrl('https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80');
      setMediaFilename('Catalogue_Banner.jpg');
    } else {
      setMediaType('NONE');
    }

    // Initialize default variable mappings
    const bodyComp = comps.find((c: any) => c.type === 'BODY');
    const matches = (bodyComp?.text || '').match(/\{\{(\d+)\}\}/g) || [];
    const initialMap: Record<string, string> = {};

    matches.forEach((_: any, idx: number) => {
      const num = String(idx + 1);
      if (num === '1') initialMap[`body_${num}`] = 'firstName';
      else if (num === '2') initialMap[`body_${num}`] = 'quotation_no';
      else if (num === '3') initialMap[`body_${num}`] = 'product_item';
      else if (num === '4') initialMap[`body_${num}`] = 'discount';
      else initialMap[`body_${num}`] = 'company';
    });

    setVariableMapping(initialMap);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const parsedComponents = selectedTemplate
    ? JSON.parse(selectedTemplate.componentsJson || '[]')
    : [];

  const handleTestSend = async () => {
    if (!testPhoneNumber) {
      alert('Please enter a test phone number');
      return;
    }
    setTestSending(true);
    setTestSuccessMessage('');

    try {
      const res = await fetch('/api/campaigns/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPhoneNumber,
          templateId: selectedTemplateId,
          mediaType,
          mediaUrl,
          mediaFilename,
          sampleVariables: variableMapping,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestSuccessMessage(`✅ Verified! Test message delivered to ${testPhoneNumber}`);
      } else {
        alert(data.error || 'Test send failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTestSending(false);
    }
  };

  const handleCreateAndLaunch = async (autoDispatch: boolean = true) => {
    if (!name.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    setLaunching(true);

    try {
      // 1. Create Campaign
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          templateId: selectedTemplateId,
          mediaType,
          mediaUrl,
          mediaFilename,
          variableMapping,
          audienceType,
          targetId: targetId || undefined,
          batchDelayMs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create campaign');
        setLaunching(false);
        return;
      }

      const campaignId = data.campaign.id;

      // 2. Automatically trigger dispatch if requested
      if (autoDispatch) {
        await fetch(`/api/campaigns/${campaignId}/dispatch`, {
          method: 'POST',
        });
      }

      router.push(`/campaigns/${campaignId}`);
    } catch (err: any) {
      alert(err.message);
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Progress Steps */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { step: 1, label: 'Audience & Details', icon: Users },
            { step: 2, label: 'Template & Media', icon: FileCode },
            { step: 3, label: 'Personalization', icon: Sliders },
            { step: 4, label: 'Review & Broadcast', icon: Send },
          ].map((item) => {
            const Icon = item.icon;
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <div
                key={item.step}
                onClick={() => isCompleted && setCurrentStep(item.step)}
                className={`flex items-center gap-2 cursor-pointer ${
                  isCurrent
                    ? 'text-emerald-600 font-bold'
                    : isCompleted
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-100'
                      : isCompleted
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.step}
                </div>
                <span className="text-xs hidden sm:inline">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form (7 cols) + Live Phone Simulator (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Viewport */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          {/* STEP 1: AUDIENCE & DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 1: Campaign Details & Audience</h3>
                <p className="text-xs text-slate-500">
                  Target up to 500+ or all active WhatsApp customers in your database
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Machinery Quotation & Product Catalog Dispatch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Targeting Wholesale buyers with custom quotation PDF and discount catalogue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Recipient Audience
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'ALL', title: 'All Active Contacts', desc: `${contactCounts.total} verified contacts` },
                    { id: 'TAG', title: 'Filter by Tag', desc: 'VIPs, Buyers, Leads' },
                    { id: 'GROUP', title: 'Contact Group', desc: 'Pre-built segments' },
                  ].map((aud) => (
                    <div
                      key={aud.id}
                      onClick={() => setAudienceType(aud.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        audienceType === aud.id
                          ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold block">{aud.title}</span>
                      <span className="text-[10px] text-slate-500">{aud.desc}</span>
                    </div>
                  ))}
                </div>

                {audienceType === 'TAG' && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Choose Tag:
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                    >
                      <option value="">Select a tag...</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {audienceType === 'GROUP' && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Choose Group:
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                    >
                      <option value="">Select a contact group...</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) return alert('Please enter a campaign title');
                    setCurrentStep(2);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>Continue to Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: TEMPLATE & MEDIA */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 2: Choose Template & Media Attachment</h3>
                <p className="text-xs text-slate-500">
                  Select Meta approved template and attach your PDF Quotation or Product Catalogue
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approved Meta Template *
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplateId === t.id
                          ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {JSON.parse(t.componentsJson || '[]').find((c: any) => c.type === 'BODY')?.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Media Configuration */}
              {mediaType !== 'NONE' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {mediaType === 'DOCUMENT' && <FileText className="w-4 h-4 text-red-500" />}
                    {mediaType === 'IMAGE' && <ImageIcon className="w-4 h-4 text-blue-500" />}
                    <h4 className="text-xs font-bold text-slate-800">
                      Header {mediaType === 'DOCUMENT' ? 'PDF Quotation / Document' : 'Product Catalogue Image'}
                    </h4>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Direct Media URL (PDF / Image link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/quotations/quote_001.pdf"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white font-mono"
                    />
                  </div>

                  {mediaType === 'DOCUMENT' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Attached PDF Filename (shown in recipient WhatsApp chat)
                      </label>
                      <input
                        type="text"
                        placeholder="Official_Quotation_Acme.pdf"
                        value={mediaFilename}
                        onChange={(e) => setMediaFilename(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>Continue to Personalization</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PERSONALIZATION MAPPING */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 3: Dynamic Variable Personalization</h3>
                <p className="text-xs text-slate-500">
                  Map template variables `&#123;&#123;1&#125;&#125;`, `&#123;&#123;2&#125;&#125;` to each customer's specific attributes
                </p>
              </div>

              <div className="space-y-3">
                {Object.keys(variableMapping).map((varKey, idx) => {
                  const paramNum = varKey.replace('body_', '');
                  return (
                    <div
                      key={varKey}
                      className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="w-28 shrink-0">
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          &#123;&#123;{paramNum}&#125;&#125; Variable
                        </span>
                      </div>

                      <div className="flex-1">
                        <select
                          value={variableMapping[varKey]}
                          onChange={(e) =>
                            setVariableMapping({ ...variableMapping, [varKey]: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-xs rounded-lg border bg-white font-medium"
                        >
                          <option value="firstName">Customer First Name</option>
                          <option value="fullName">Full Name</option>
                          <option value="company">Company / Business Name</option>
                          <option value="phone">WhatsApp Phone Number</option>
                          <option value="quotation_no">Quotation Ref (custom field)</option>
                          <option value="due_amount">Due Amount (custom field)</option>
                          <option value="discount">Discount % (custom field)</option>
                          <option value="product_item">Product / Catalogue Item</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>Review & Send</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW, TEST SEND & LAUNCH */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 4: Review & Broadcast</h3>
                <p className="text-xs text-slate-500">
                  Verify message on a real phone before broadcasting to all recipients
                </p>
              </div>

              {/* Physical Phone Test Send Box */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  <span>Send a Live Test to Your WhatsApp Number</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Deliver this exact personalized template with attached PDF / image to your phone right now.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="+8801711000000"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-300 bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={testSending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                  >
                    {testSending ? 'Sending...' : 'Send Test'}
                  </button>
                </div>

                {testSuccessMessage && (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-100 p-2 rounded-lg">
                    {testSuccessMessage}
                  </p>
                )}
              </div>

              {/* Speed & Anti-Ban Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Dispatch Speed & Anti-Ban Protection:</span>
                  <span className="font-mono text-emerald-600">
                    Safe Human Pace (3.5s - 7.5s randomized)
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-800 font-medium space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>🛡️ Smart Anti-Ban Safeguards Active</span>
                  </p>
                  <p>
                    • প্রতিটি মেসেজের মাঝে ৩.৫ থেকে ৭.৫ সেকেন্ডের র‍্যান্ডম হিউম্যান ডিলে যুক্ত করা হয়।
                  </p>
                  <p>
                    • প্রতি ২৫টি মেসেজ পাঠানোর পর ক্যারিয়ার/অ্যালগরিদম ব্যান এড়াতে ৪৫ সেকেন্ডের রেস্টিং পজ নেওয়া হয়।
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateAndLaunch(false)}
                    disabled={launching}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateAndLaunch(true)}
                    disabled={launching}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>{launching ? 'Broadcasting...' : 'Launch 500+ Campaign Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Mobile WhatsApp Simulator Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-800">Live Recipient Preview</h4>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
              Interactive
            </span>
          </div>

          <TemplatePhonePreview
            components={parsedComponents}
            sampleVariables={variableMapping}
            mediaType={mediaType}
            mediaUrl={mediaUrl}
            mediaFilename={mediaFilename}
          />
        </div>
      </div>
    </div>
  );
}
