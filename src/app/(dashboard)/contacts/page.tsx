'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Upload,
  Plus,
  Trash2,
  Tag as TagIcon,
  Phone,
  Building,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for manual add
  const [newPhone, setNewPhone] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedTag) params.set('tagId', selectedTag);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/contacts?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setContacts(data.contacts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchTags = () => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchContacts();
    fetchTags();
  }, [selectedTag, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts();
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: newPhone,
          firstName: newFirstName,
          lastName: newLastName,
          company: newCompany,
          email: newEmail,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewPhone('');
        setNewFirstName('');
        setNewLastName('');
        setNewCompany('');
        setNewEmail('');
        fetchContacts();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add contact');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
      fetchContacts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Contact Management</h2>
          <p className="text-xs text-slate-500">
            Manage your customer database, dynamic quotation variables, and opt-out statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/contacts/import"
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV / Excel</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone (+880...), or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active (Can Receive)</option>
            <option value="OPTED_OUT">Opted-Out (STOP)</option>
          </select>

          <button
            onClick={fetchContacts}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No contacts match the filter criteria.</p>
            <Link
              href="/contacts/import"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:underline"
            >
              Upload Excel Spreadsheet now →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">WhatsApp Number</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Custom Variables (Quotation/Due)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => {
                  let customAttrs: Record<string, string> = {};
                  try {
                    customAttrs = JSON.parse(c.customAttributes || '{}');
                  } catch (e) {}

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {c.firstName || ''} {c.lastName || ''}
                          {!c.firstName && !c.lastName && (
                            <span className="text-slate-400 italic">No name</span>
                          )}
                        </div>
                        {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {c.phoneNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{c.company || '-'}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.tags?.map((m: any) => (
                            <span
                              key={m.tag.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200"
                            >
                              {m.tag.name}
                            </span>
                          ))}
                          {(!c.tags || c.tags.length === 0) && (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Object.entries(customAttrs).slice(0, 3).map(([k, v]) => (
                            <span
                              key={k}
                              className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-mono"
                            >
                              {k}: <span className="font-bold text-slate-900">{v}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.isOptedOut ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Opted Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">Add New Contact</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter customer details for targeted WhatsApp broadcasts
            </p>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  WhatsApp Number (with Country Code)*
                </label>
                <input
                  type="text"
                  required
                  placeholder="+8801711000000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="Rahim"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Uddin"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  placeholder="Acme Traders Ltd"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                >
                  {submitting ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
