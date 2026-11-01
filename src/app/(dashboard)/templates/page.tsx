'use client';

import React, { useEffect, useState } from 'react';
import {
  FileCode,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import { TemplatePhonePreview } from '@/components/templates/TemplatePhonePreview';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const fetchTemplates = () => {
    setLoading(true);
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        const list = data.templates || [];
        setTemplates(list);
        if (list.length > 0 && !selectedTemplate) {
          setSelectedTemplate(list[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully synced ${data.syncedCount} templates from Meta WhatsApp Business API!`);
        fetchTemplates();
      } else {
        alert(data.error || 'Failed to sync templates');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const parsedComponents = selectedTemplate
    ? JSON.parse(selectedTemplate.componentsJson || '[]')
    : [];

  const sampleValues = selectedTemplate
    ? JSON.parse(selectedTemplate.sampleValuesJson || '{}')
    : {};

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">WhatsApp Templates & Rich Media</h2>
          <p className="text-xs text-slate-500">
            Approved Meta message templates with PDF quotations, product catalogues, and interactive buttons
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing with Meta...' : 'Sync from Meta WABA'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Templates List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Approved WhatsApp Templates ({templates.length})
            </h3>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <FileCode className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No templates synced yet.</p>
                <button
                  onClick={handleSync}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  Click here to fetch templates from Meta API
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {templates.map((t) => {
                  const comps = JSON.parse(t.componentsJson || '[]');
                  const header = comps.find((c: any) => c.type === 'HEADER');
                  const body = comps.find((c: any) => c.type === 'BODY');
                  const isSelected = selectedTemplate?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 font-mono">
                              {t.name}
                            </h4>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" />
                              {t.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Category: {t.category} • Language: {t.language}
                          </p>
                        </div>

                        {header && (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                            {header.format === 'DOCUMENT' && <FileText className="w-3 h-3 text-red-500" />}
                            {header.format === 'IMAGE' && <ImageIcon className="w-3 h-3 text-blue-500" />}
                            <span>{header.format} Header</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {body?.text || 'No preview text'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Mobile Simulator Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Real-time WhatsApp Mobile Preview</span>
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Simulator
            </span>
          </div>

          {selectedTemplate ? (
            <TemplatePhonePreview
              components={parsedComponents}
              sampleVariables={sampleValues}
              mediaType={
                parsedComponents.find((c: any) => c.type === 'HEADER')?.format as any
              }
              mediaFilename="Acme_Official_Quotation.pdf"
            />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-xs text-slate-400">
              Select a template to view the live mobile preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
