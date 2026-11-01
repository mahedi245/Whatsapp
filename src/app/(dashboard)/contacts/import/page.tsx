'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
} from 'lucide-react';

export default function ContactImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  // Column mappings
  const [phoneCol, setPhoneCol] = useState('');
  const [firstNameCol, setFirstNameCol] = useState('');
  const [lastNameCol, setLastNameCol] = useState('');
  const [companyCol, setCompanyCol] = useState('');
  const [emailCol, setEmailCol] = useState('');

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {});
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setLoading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selected);
    formData.append('previewOnly', 'true');

    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewData(data);

        // Auto-detect columns intelligently
        const headers = data.headers || [];
        const phoneMatch = headers.find((h: string) =>
          /phone|mobile|whatsapp|contact|tel|number/i.test(h)
        );
        const firstMatch = headers.find((h: string) => /first|name|fname|customer/i.test(h));
        const lastMatch = headers.find((h: string) => /last|lname|surname/i.test(h));
        const companyMatch = headers.find((h: string) => /company|org|business/i.test(h));
        const emailMatch = headers.find((h: string) => /email|mail/i.test(h));

        setPhoneCol(phoneMatch || headers[0] || '');
        setFirstNameCol(firstMatch || '');
        setLastNameCol(lastMatch || '');
        setCompanyCol(companyMatch || '');
        setEmailCol(emailMatch || '');
      } else {
        alert(data.error || 'Failed to parse file');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!file || !phoneCol) {
      alert('Please select a phone number column');
      return;
    }

    setImporting(true);

    const mapping = {
      phoneColumn: phoneCol,
      firstNameColumn: firstNameCol || undefined,
      lastNameColumn: lastNameCol || undefined,
      companyColumn: companyCol || undefined,
      emailColumn: emailCol || undefined,
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    if (selectedTag) formData.append('tagId', selectedTag);

    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'Phone,First Name,Last Name,Company,Email,Due Amount,Quotation Ref,Product\n' +
      '+8801711000001,Rahim,Uddin,Rahim Traders Ltd,rahim@example.com,15000 BDT,QT-2026-001,Industrial Machinery\n' +
      '+8801811000002,Fatema,Begum,Bengal Fashion,fatema@example.com,32000 BDT,QT-2026-002,Autumn Clothing Catalog\n' +
      '+8801911000003,Kamal,Hasan,Apex Builders,kamal@example.com,8500 BDT,QT-2026-003,Construction Materials\n' +
      '+8801611000004,Nusrat,Jahan,Dhaka Soft,nusrat@example.com,45000 BDT,QT-2026-004,Enterprise Server Hardware\n' +
      '+8801511000005,Saiful,Islam,Padma Electric,saiful@example.com,12800 BDT,QT-2026-005,Solar Inverters Brochure\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_whatsapp_contacts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Bulk Contact Importer</h2>
          <p className="text-xs text-slate-500">
            Import hundreds or thousands of contacts from Excel (.xlsx) or CSV with variable mapping
          </p>
        </div>
        <button
          onClick={downloadSampleCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Success Banner if Completed */}
      {importResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-950 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-base text-emerald-900">Import Successful!</h3>
              <p className="text-xs text-emerald-700">
                Successfully imported{' '}
                <span className="font-bold">{importResult.importedCount}</span> contacts into your
                database. {importResult.skippedCount > 0 && `(${importResult.skippedCount} invalid rows skipped)`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Link
              href="/contacts"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              View Contacts List
            </Link>
            <Link
              href="/campaigns/new"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Broadcast 500+ Campaign Now
            </Link>
          </div>
        </div>
      )}

      {/* Step 1: Upload Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-2">Step 1: Choose File</h3>
        <p className="text-xs text-slate-500 mb-4">
          Supported file formats: <span className="font-mono font-semibold">.csv</span>,{' '}
          <span className="font-mono font-semibold">.xlsx</span>,{' '}
          <span className="font-mono font-semibold">.xls</span> (up to 10,000 rows).
        </p>

        <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all text-center">
          <FileSpreadsheet className="w-12 h-12 text-slate-400 mb-2" />
          <span className="text-xs font-bold text-slate-800">
            {file ? file.name : 'Click to browse or drag & drop Excel / CSV spreadsheet'}
          </span>
          <span className="text-[11px] text-slate-400 mt-1">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Ensure phone numbers include country code (+880, +1, etc.)'}
          </span>
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Step 2 & 3: Column Mapping & Preview */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Step 2: Map Columns to Contact Attributes
            </h3>
            <p className="text-xs text-slate-500">
              Found <span className="font-bold text-slate-800">{previewData.totalRows}</span> total
              rows in the file. Connect each column to the proper database field.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Phone Column (Required) */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3">
              <label className="block text-xs font-bold text-emerald-900 mb-1">
                WhatsApp Phone Number *
              </label>
              <select
                value={phoneCol}
                onChange={(e) => setPhoneCol(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white font-medium"
              >
                <option value="">Select Phone Column</option>
                {previewData.headers?.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* First Name */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
              <select
                value={firstNameCol}
                onChange={(e) => setFirstNameCol(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="">None / Unmapped</option>
                {previewData.headers?.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Last Name */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
              <select
                value={lastNameCol}
                onChange={(e) => setLastNameCol(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="">None / Unmapped</option>
                {previewData.headers?.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Org</label>
              <select
                value={companyCol}
                onChange={(e) => setCompanyCol(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="">None / Unmapped</option>
                {previewData.headers?.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <select
                value={emailCol}
                onChange={(e) => setEmailCol(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="">None / Unmapped</option>
                {previewData.headers?.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Selection */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign Tag</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="">No Tag</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            ℹ️ <span className="font-semibold">Auto Custom Variables:</span> Any additional unmapped columns (e.g. Due Amount, Quotation Ref, Product) will automatically be preserved as dynamic variables inside each contact record for template personalization!
          </p>

          {/* Table Preview of Top 5 Rows */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2">First 5 Rows Preview:</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    {previewData.headers?.map((h: string) => (
                      <th key={h} className="py-2 px-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {previewData.previewRows?.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {previewData.headers?.map((h: string) => (
                        <td key={h} className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {row[h] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={handleExecuteImport}
              disabled={importing || !phoneCol}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Importing Contacts in Batches...</span>
                </>
              ) : (
                <>
                  <span>Execute Bulk Import</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
