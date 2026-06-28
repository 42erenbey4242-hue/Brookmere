import React, { useState, useEffect, useRef } from 'react';
import { Channel, Message, User } from '../types';
import ProfileCard from './ProfileCard';

interface Props {
  channel: Channel | null;
  messages: Message[];
  currentUser: User;
  users: Record<string, User>;
  onSend: (content: string) => { success: boolean; error?: string };
  onDelete: (messageId: string) => { success: boolean; error?: string };
  onOpenDM: (userId: string) => void;
}

interface ContextMenu { x: number; y: number; msg: Message; }

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const t = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Bugün ${t}`;
  if (isYesterday) return `Dün ${t}`;
  return d.toLocaleDateString('tr-TR') + ' ' + t;
}

function formatFullTime(ts: number): string {
  return new Date(ts).toLocaleString('tr-TR');
}

interface MessageGroup { userId: string; username: string; messages: Message[]; }

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  messages.forEach(msg => {
    const last = groups[groups.length - 1];
    if (last && last.userId === msg.userId && msg.createdAt - last.messages[last.messages.length - 1].createdAt < 5 * 60 * 1000) {
      last.messages.push(msg);
    } else {
      groups.push({ userId: msg.userId, username: msg.username, messages: [msg] });
    }
  });
  return groups;
}

export default function ChatArea({ channel, messages, currentUser, users, onSend, onDelete, onOpenDM }: Props) {
  const [profileCard, setProfileCard] = useState<{ user: User; x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const fn = () => { setContextMenu(null); };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  if (!channel) return (
    <div className="flex-1 flex items-center justify-center bg-[#313338]">
      <p className="text-[#949ba4]">Bir kanal seçin.</p>
    </div>
  );

  const canSend = channel.permission === 'everyone' || currentUser.role === 'admin';
  const isTimedOut = currentUser.timeoutUntil && Date.now() < currentUser.timeoutUntil;
  const timeoutMins = isTimedOut ? Math.ceil(((currentUser.timeoutUntil as number) - Date.now()) / 60000) : 0;

  const handleSend = () => {
    if (!input.trim()) return;
    setError('');
    const result = onSend(input.trim());
    if (result.success) { setInput(''); if (inputRef.current) { inputRef.current.style.height = 'auto'; } }
    else setError(result.error || 'Hata.');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleRightClick = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    const canDelete = currentUser.role === 'admin' || msg.userId === currentUser.id;
    if (!canDelete) return;
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const grouped = groupMessages(messages);

  return (
    <div className="flex-1 bg-[#313338] flex flex-col min-w-0">
      {profileCard && (
        <ProfileCard
          user={profileCard.user}
          onClose={() => setProfileCard(null)}
          onSendDM={profileCard.user.id !== currentUser.id ? (uid) => { onOpenDM(uid); setProfileCard(null); } : undefined}
          anchorEl={{ x: profileCard.x, y: profileCard.y }}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#111214] border border-[#2e3035] rounded-lg shadow-2xl py-1.5 z-[9999] min-w-[160px]"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 100) }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { onDelete(contextMenu.msg.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-[#f23f43] hover:bg-[#f23f43]/10 text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Mesajı Sil
          </button>
        </div>
      )}

      {/* Channel header */}
      <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1e1f22] shrink-0 shadow-sm">
        <svg className="w-5 h-5 text-[#80848e] shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.18 17.44a.75.75 0 0 1-1.06 1.12l-.6-.56A2.75 2.75 0 0 1 7.75 16V9.75a.75.75 0 0 1 1.5 0V16c0 .32.12.63.34.86l.59.58Zm3.64 0 .59-.58c.22-.23.34-.54.34-.86V9.75a.75.75 0 0 1 1.5 0V16a2.75 2.75 0 0 1-.77 1.9l-.6.56a.75.75 0 0 1-1.06-1.12v.1Zm-4.68-9.19a.75.75 0 1 1 0-1.5h5.72a.75.75 0 0 1 0 1.5H9.14ZM5.5 8a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h.25a.75.75 0 0 1 0 1.5H5.5A2 2 0 0 1 3.5 15.5v-7A2 2 0 0 1 5.5 6.5h.25a.75.75 0 0 1 0 1.5H5.5Zm13 0h-.25a.75.75 0 0 1 0-1.5h.25a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-.25a.75.75 0 0 1 0-1.5h.25a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5Z"/>
        </svg>
        <span className="text-white font-semibold">{channel.name}</span>
        {channel.permission === 'admin_only' && (
          <span className="text-xs bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded-full">🔒 Sadece Admin Yazabilir</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-start mb-4">
            <div className="w-16 h-16 rounded-full bg-[#5865f2] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.18 17.44a.75.75 0 0 1-1.06 1.12l-.6-.56A2.75 2.75 0 0 1 7.75 16V9.75a.75.75 0 0 1 1.5 0V16c0 .32.12.63.34.86l.59.58Zm3.64 0 .59-.58c.22-.23.34-.54.34-.86V9.75a.75.75 0 0 1 1.5 0V16a2.75 2.75 0 0 1-.77 1.9l-.6.56a.75.75 0 0 1-1.06-1.12v.1Zm-4.68-9.19a.75.75 0 1 1 0-1.5h5.72a.75.75 0 0 1 0 1.5H9.14Z"/>
              </svg>
            </div>
            <h3 className="text-white text-2xl font-bold">#{channel.name}'e hoş geldiniz!</h3>
            <p className="text-[#949ba4] text-sm mt-1">Bu kanalın başlangıcı. Konuşmaya başlayın!</p>
          </div>
        )}

        {grouped.map((group, gi) => {
          const sender = users[group.userId];
          const isAdmin = sender?.role === 'admin';
          const displayName = sender?.username || group.username;
          const avatarBg = isAdmin ? '#f5a623' : '#5865f2';
          return (
            <div key={gi} className="group hover:bg-[#2e3035] px-2 py-0.5 rounded -mx-2">
              <div className="flex gap-4">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-0.5 cursor-pointer"
                  onClick={e => sender && setProfileCard({ user: sender, x: e.clientX, y: e.clientY })}
                >
                  {sender?.avatarUrl ? (
                    <img src={sender.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold" style={{ background: avatarBg }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span
                      className="font-semibold text-sm cursor-pointer hover:underline"
                      style={{ color: isAdmin ? '#f5a623' : 'white' }}
                      onClick={e => sender && setProfileCard({ user: sender, x: e.clientX, y: e.clientY })}
                    >
                      {displayName}{isAdmin && ' 👑'}
                    </span>
                    <span className="text-[#949ba4] text-xs">{formatTime(group.messages[0].createdAt)}</span>
                  </div>
                  {group.messages.map(msg => (
                    <p
                      key={msg.id}
                      onContextMenu={e => handleRightClick(e, msg)}
                      className="text-[#dbdee1] text-sm leading-relaxed break-words cursor-default"
                      title={formatFullTime(msg.createdAt)}
                    >
                      {msg.content}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        {currentUser.isBanned ? (
          <div className="bg-[#f23f43]/20 border border-[#f23f43]/40 rounded-lg px-4 py-3 text-[#f23f43] text-sm text-center">
            🔨 Banlandınız.
          </div>
        ) : timeoutMins ? (
          <div className="bg-[#f5a623]/20 border border-[#f5a623]/40 rounded-lg px-4 py-3 text-[#f5a623] text-sm text-center">
            🔇 Susturuldunuz. {timeoutMins} dakika kaldı.
          </div>
        ) : !canSend ? (
          <div className="bg-[#4e5058] rounded-lg px-4 py-3 text-[#949ba4] text-sm text-center">
            🔒 Bu kanalda mesaj gönderme izniniz yok.
          </div>
        ) : (
          <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`#${channel.name} kanalına mesaj gönder`}
              className="flex-1 bg-transparent text-[#dbdee1] resize-none outline-none text-sm leading-relaxed max-h-40 min-h-[24px] placeholder-[#6d6f78]"
              rows={1}
              onInput={e => {
                const ta = e.target as HTMLTextAreaElement;
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
              }}
            />
            <button onClick={handleSend} disabled={!input.trim()} className="p-1.5 text-[#949ba4] hover:text-[#dbdee1] disabled:opacity-30 transition-colors shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        )}
        {error && <p className="text-[#f23f43] text-xs mt-1 px-1">{error}</p>}
      </div>
    </div>
  );
}
