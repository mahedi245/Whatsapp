'use client';

import React from 'react';
import { FileText, Download, ExternalLink, MessageSquare, CheckCheck } from 'lucide-react';

interface ComponentItem {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface TemplatePhonePreviewProps {
  components: ComponentItem[];
  sampleVariables?: Record<string, string>;
  mediaType?: 'NONE' | 'DOCUMENT' | 'IMAGE' | 'VIDEO' | null;
  mediaUrl?: string | null;
  mediaFilename?: string | null;
  businessName?: string;
}

export function TemplatePhonePreview({
  components,
  sampleVariables = {},
  mediaType,
  mediaUrl,
  mediaFilename = 'Quotation_Acme.pdf',
  businessName = 'Acme Solutions Official',
}: TemplatePhonePreviewProps) {
  const headerComp = components.find((c) => c.type === 'HEADER');
  const bodyComp = components.find((c) => c.type === 'BODY');
  const footerComp = components.find((c) => c.type === 'FOOTER');
  const buttonsComp = components.find((c) => c.type === 'BUTTONS');

  // Interpolate body text variables
  let renderedBody = bodyComp?.text || '';
  if (renderedBody) {
    renderedBody = renderedBody.replace(/\{\{(\d+)\}\}/g, (match, num) => {
      return sampleVariables[num] || sampleVariables[`body_${num}`] || `[Variable {{${num}}}]`;
    });
  }

  const effectiveMediaType =
    mediaType ||
    (headerComp?.format === 'DOCUMENT'
      ? 'DOCUMENT'
      : headerComp?.format === 'IMAGE'
      ? 'IMAGE'
      : 'NONE');

  return (
    <div className="w-[320px] sm:w-[360px] mx-auto bg-[#efeae2] rounded-[40px] border-[8px] border-slate-900 shadow-2xl overflow-hidden font-sans select-none flex flex-col h-[640px]">
      {/* Phone Notch & Status Bar */}
      <div className="bg-[#075e54] text-white pt-2 pb-2 px-4 flex items-center justify-between text-xs">
        <span className="font-semibold">9:41</span>
        <div className="w-20 h-4 bg-black rounded-full mx-auto" />
        <div className="flex items-center gap-1">
          <span className="text-[10px]">5G</span>
          <div className="w-4 h-2.5 border border-white rounded-sm p-0.5 flex">
            <div className="bg-white h-full w-full" />
          </div>
        </div>
      </div>

      {/* WhatsApp Chat Header */}
      <div className="bg-[#075e54] text-white px-3 py-2 flex items-center gap-3 shadow-md">
        <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-400">
          {businessName.substring(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h4 className="font-semibold text-sm truncate">{businessName}</h4>
            <span className="bg-emerald-500 text-[10px] px-1 rounded-sm text-white font-medium">
              Official
            </span>
          </div>
          <p className="text-[11px] text-emerald-100">WhatsApp Business Account</p>
        </div>
      </div>

      {/* WhatsApp Message Body Canvas */}
      <div
        className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col justify-end"
        style={{
          backgroundImage: `radial-gradient(#cfd8dc 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
      >
        {/* Date Pill */}
        <div className="text-center my-1">
          <span className="bg-[#e1f3fb] text-slate-600 text-[10px] px-2 py-0.5 rounded-md shadow-xs">
            TODAY
          </span>
        </div>

        {/* WhatsApp Message Bubble */}
        <div className="bg-white rounded-xl rounded-tl-none shadow-md overflow-hidden max-w-[92%] border border-slate-100 self-start">
          {/* Header Media Rendering */}
          {effectiveMediaType === 'DOCUMENT' && (
            <div className="bg-slate-50 p-2.5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {mediaFilename || 'Quotation_Document.pdf'}
                </p>
                <p className="text-[10px] text-slate-500">PDF Document • 420 KB</p>
              </div>
              <Download className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          )}

          {effectiveMediaType === 'IMAGE' && (
            <div className="relative aspect-video w-full bg-slate-200 overflow-hidden">
              <img
                src={
                  mediaUrl ||
                  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
                }
                alt="Product Catalogue Header"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                Product Catalogue
              </span>
            </div>
          )}

          {/* Body Text */}
          <div className="p-3 text-[13px] leading-relaxed text-slate-800 whitespace-pre-line">
            {renderedBody}

            {/* Footer */}
            {footerComp?.text && (
              <p className="mt-2 text-[11px] text-slate-400 italic">{footerComp.text}</p>
            )}

            {/* Timestamp & Double Tick */}
            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
              <span>9:42 AM</span>
              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>

          {/* Interactive CTA & Quick Reply Buttons */}
          {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
            <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
              {buttonsComp.buttons.map((btn, idx) => (
                <div
                  key={idx}
                  className="py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  {btn.type === 'URL' ? (
                    <ExternalLink className="w-3.5 h-3.5" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  <span>{btn.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Simulated Bottom Chat Input Bar */}
      <div className="bg-slate-100 p-2 flex items-center gap-2 border-t border-slate-200">
        <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-slate-400 shadow-inner">
          Message
        </div>
        <div className="w-7 h-7 rounded-full bg-[#128c7e] text-white flex items-center justify-center text-xs shadow-sm">
          🎙️
        </div>
      </div>
    </div>
  );
}
