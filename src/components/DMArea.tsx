import React, { useState, useEffect, useRef } from 'react';
import { User, DirectMessage } from '../types';

interface Props {
  currentUser: User;
  otherUser: User;
  messages: DirectMessage[];
  onSend: (content: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

interface CtxMenu { x: number; y: number; msgId: string; isOwn: boolean; }

export default function DMArea({ currentUser, otherUser, messages, onSend, onDelete, onClose }: Props) {
  const [text, setText] = useState('');
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const fn = () => setCtxMenu(null);
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleRightClick = (e: React.MouseEvent, msg: DirectMessage) => {
    e.preventDefault();
    const isOwn = msg.senderId === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    if (!isOwn && !isAdmin) return;
    setCtxMenu({ x: e.clientX, y: e.clientY, msgId: msg.id, isOwn });
  };

  const avatarBg = (u: User) => u.role === 'admin' ? '#f5a623' : '#5865f2';
  const avatar = (u: User, size = 'w-10 h-10') => (
    <div className={`${size} rounded-full overflow-hidden shrink-0`}>
      {u.avatarUrl ? (
        <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold" style={{ background: avatarBg(u) }}>
          {u.username.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 bg-[#313338]">
      {ctxMenu && (
        <div
          className="fixed bg-[#111214] border border-[#2e3035] rounded-lg shadow-2xl py-1.5 z-[9999] min-w-[160px]"
          style={{ left: Math.min(ctxMenu.x, window.innerWidth - 180), top: Math.min(ctxMenu.y, window.innerHeight - 100) }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { onDelete(ctxMenu.msgId); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 text-[#f23f43] hover:bg-[#f23f43]/10 text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Mesajı Sil
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1f22]">
        {avatar(otherUser, 'w-8 h-8')}
        <div>
          <span className="text-white font-semibold text-sm">{otherUser.username}</span>
          <div className="text-[#949ba4] text-xs">Direkt Mesaj</div>
        </div>
        <button onClick={onClose} className="ml-auto text-[#949ba4] hover:text-white p-1 rounded transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {avatar(otherUser, 'w-16 h-16')}
            <h3 className="text-white font-bold text-xl mt-4 mb-1">{otherUser.username}</h3>
            <p className="text-[#949ba4] text-sm">Bu kişiyle olan DM konuşmanızın başlangıcı.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = isMe ? currentUser : otherUser;
          const showHeader = i === 0 || messages[i - 1].senderId !== msg.senderId;
          return (
            <div
              key={msg.id}
              onContextMenu={e => handleRightClick(e, msg)}
              className={`flex items-start gap-3 px-2 py-0.5 rounded hover:bg-[#2e3035] group ${showHeader ? 'mt-4' : ''}`}
            >
              {showHeader ? avatar(sender) : <div className="w-10 shrink-0" />}
              <div className="flex-1 min-w-0">
                {showHeader && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-white font-semibold text-sm">{sender.username}</span>
                    <span className="text-[#949ba4] text-xs">{new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <p className="text-[#dbdee1] text-sm leading-relaxed break-words">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2">
        <div className="flex items-center gap-2 bg-[#383a40] rounded-xl px-4 py-2.5">
          <input
            type="text" value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`@${otherUser.username} kişisine mesaj gönder`}
            className="flex-1 bg-transparent text-[#dbdee1] placeholder-[#6d6f78] outline-none text-sm"
          />
          <button onClick={handleSend} disabled={!text.trim()} className="text-[#949ba4] hover:text-white disabled:opacity-40 transition-colors p-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
