'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  User,
  Building,
  Phone,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Smile,
  ShieldAlert,
} from 'lucide-react';

export default function LiveInboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  // Media attachment state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState<'text' | 'document' | 'image'>('text');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = () => {
    fetch('/api/inbox/conversations')
      .then((res) => res.json())
      .then((data) => {
        const list = data.conversations || [];
        setConversations(list);
        if (list.length > 0 && !selectedConvId) {
          setSelectedConvId(list[0].id);
        }
        setLoadingConv(false);
      })
      .catch(() => setLoadingConv(false));
  };

  const fetchMessages = (convId: string) => {
    fetch(`/api/inbox/messages?conversationId=${convId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        setLoadingMsg(false);
      })
      .catch(() => setLoadingMsg(false));
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      setLoadingMsg(true);
      fetchMessages(selectedConvId);
      const msgInterval = setInterval(() => fetchMessages(selectedConvId), 3000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() && !attachUrl) return;
    if (!selectedConvId) return;

    setSending(true);
    try {
      const res = await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          text: replyText,
          mediaUrl: attachUrl || undefined,
          mediaType: attachType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReplyText('');
        setAttachUrl('');
        setAttachType('text');
        setShowAttachMenu(false);
        fetchMessages(selectedConvId);
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true;
    const name = `${c.contact?.firstName || ''} ${c.contact?.lastName || ''}`.toLowerCase();
    const phone = (c.contact?.phoneNumber || '').toLowerCase();
    const company = (c.contact?.company || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || phone.includes(q) || company.includes(q);
  });

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Two-Way Customer Live Inbox</h2>
          <p className="text-xs text-slate-500">
            Real-time chat with customers within the Meta 24-hour customer service window
          </p>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex overflow-hidden">
        {/* Left: Conversations List (w-80 or 320px) */}
        <div className="w-80 border-r border-slate-200/80 flex flex-col shrink-0">
          {/* Search Contacts */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conversations Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConv && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No conversations yet.</p>
                <p className="text-[11px] text-slate-400">
                  Replies from contacts will appear here automatically.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const contact = c.contact;
                const lastMsg = c.messages?.[0];
                const displayName =
                  contact?.firstName || contact?.lastName
                    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                    : contact?.phoneNumber;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                      {contact?.firstName ? contact.firstName[0].toUpperCase() : 'W'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-slate-900 truncate">
                          {displayName}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {c.lastMessageAt
                            ? new Date(c.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      {contact?.company && (
                        <span className="text-[10px] text-slate-400 truncate block">
                          {contact.company}
                        </span>
                      )}

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {lastMsg?.body || 'No messages'}
                      </p>
                    </div>

                    {c.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Area */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col bg-[#efeae2]/40 relative">
            {/* Chat Header */}
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  {selectedConv.contact?.firstName
                    ? selectedConv.contact.firstName[0].toUpperCase()
                    : 'W'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    {selectedConv.contact?.firstName || selectedConv.contact?.lastName
                      ? `${selectedConv.contact.firstName || ''} ${
                          selectedConv.contact.lastName || ''
                        }`.trim()
                      : selectedConv.contact?.phoneNumber}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>{selectedConv.contact?.phoneNumber}</span>
                    {selectedConv.contact?.company && (
                      <span>• {selectedConv.contact.company}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {selectedConv.contact?.isOptedOut ? (
                  <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Opted Out (STOP)
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    24-hr Window Active
                  </span>
                )}
              </div>
            </div>

            {/* Opted out banner */}
            {selectedConv.contact?.isOptedOut && (
              <div className="bg-amber-50 border-b border-amber-200 p-2.5 text-xs text-amber-800 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  This contact has sent `STOP` and unsubscribed. Outbound messages are blocked to prevent Meta spam penalties.
                </span>
              </div>
            )}

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsg && messages.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-12">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-12">
                  No message history with this contact yet.
                </div>
              ) : (
                messages.map((m) => {
                  const isOutbound = m.direction === 'OUTBOUND';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md rounded-2xl px-3.5 py-2 shadow-xs text-xs ${
                          isOutbound
                            ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs'
                            : 'bg-white text-slate-900 rounded-tl-xs'
                        }`}
                      >
                        {/* Media preview if attached */}
                        {m.mediaUrl && (
                          <div className="mb-2">
                            {m.messageType === 'DOCUMENT' ? (
                              <a
                                href={m.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors font-mono text-[11px]"
                              >
                                <FileText className="w-4 h-4 text-red-500" />
                                <span className="font-semibold truncate">Download Attached Document</span>
                              </a>
                            ) : (
                              <img
                                src={m.mediaUrl}
                                alt="Attachment"
                                className="rounded-lg max-h-48 object-cover w-full"
                              />
                            )}
                          </div>
                        )}

                        {/* Text Body */}
                        <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>

                        {/* Timestamp & Double Ticks */}
                        <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 font-mono mt-1">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOutbound && (
                            <span>
                              {m.status === 'READ' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                              ) : m.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Canned Responses */}
            <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Quick:</span>
              {[
                'Hello! How can I assist you with your quotation today?',
                'Thank you for reaching out! We are processing your request.',
                'Please find our latest catalogue attached.',
              ].map((canned, idx) => (
                <button
                  key={idx}
                  onClick={() => setReplyText(canned)}
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                >
                  {canned}
                </button>
              ))}
            </div>

            {/* Media Attachment Drawer */}
            {showAttachMenu && (
              <div className="p-3 bg-white border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Attach Media (PDF Quotation or Catalogue Image)</span>
                  <button
                    onClick={() => setShowAttachMenu(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Close
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={attachType}
                    onChange={(e: any) => setAttachType(e.target.value)}
                    className="px-2 py-1 text-xs border rounded-lg bg-white"
                  >
                    <option value="text">No Attachment</option>
                    <option value="document">PDF Document</option>
                    <option value="image">Image</option>
                  </select>
                  <input
                    type="url"
                    placeholder="https://example.com/quotation.pdf"
                    value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                    className="flex-1 px-3 py-1 text-xs border rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Message Reply Input Composer */}
            <form
              onSubmit={handleSendReply}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={`p-2 rounded-xl transition-colors ${
                  showAttachMenu || attachUrl
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
                title="Attach PDF or Image"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                disabled={selectedConv.contact?.isOptedOut}
                placeholder={
                  selectedConv.contact?.isOptedOut
                    ? 'Customer has opted out'
                    : 'Type a message to reply on WhatsApp...'
                }
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  sending ||
                  selectedConv.contact?.isOptedOut ||
                  (!replyText.trim() && !attachUrl)
                }
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold p-2.5 rounded-xl disabled:opacity-50 transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
            <MessageSquare className="w-12 h-12 text-slate-300" />
            <h3 className="font-bold text-sm text-slate-700">No Conversation Selected</h3>
            <p className="text-xs">Pick a conversation from the left to start live chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
