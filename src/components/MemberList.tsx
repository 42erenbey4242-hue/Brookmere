import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import ProfileCard from './ProfileCard';

interface Props {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  onBan: (userId: string) => void;
  onTimeout: (userId: string, minutes: number) => void;
  onRemoveTimeout: (userId: string) => void;
  onOpenDM: (userId: string) => void;
  onRenameUser: (userId: string, newName: string) => { success: boolean; error?: string };
}

interface ContextMenu { x: number; y: number; user: User; }

export default function MemberList({ users, currentUserId, isAdmin, onBan, onTimeout, onRemoveTimeout, onOpenDM, onRenameUser }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [showTimeoutInput, setShowTimeoutInput] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState('5');
  const [profileCard, setProfileCard] = useState<{ user: User; x: number; y: number } | null>(null);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setContextMenu(null);
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  const handleRightClick = (e: React.MouseEvent, user: User) => {
    if (!isAdmin || user.id === currentUserId) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, user });
    setShowTimeoutInput(false);
    setShowRenameInput(false);
    setRenameError('');
    setTimeoutMinutes('5');
  };

  const handleClick = (e: React.MouseEvent, user: User) => {
    setProfileCard({ user, x: e.clientX, y: e.clientY });
  };

  const adminUser = users.find(u => u.role === 'admin');
  const citizens = users.filter(u => u.role !== 'admin');
  const onlineCitizens = citizens.filter(u => u.online);
  const offlineCitizens = citizens.filter(u => !u.online);

  const renderAvatar = (user: User, size = 'w-8 h-8') => (
    <div className={`relative shrink-0 ${size} rounded-full overflow-hidden`}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-white text-sm font-bold ${!user.online ? 'opacity-50' : ''}`}
          style={{ background: user.role === 'admin' ? '#f5a623' : '#5865f2' }}
        >
          {user.username.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${user.online ? 'bg-[#23a55a]' : 'bg-[#80848e]'}`} />
    </div>
  );

  const renderUser = (user: User) => {
    const isTimedOut = !!(user.timeoutUntil && Date.now() < user.timeoutUntil);
    return (
      <div
        key={user.id}
        onClick={e => handleClick(e, user)}
        onContextMenu={e => handleRightClick(e, user)}
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[#393c41] transition-colors ${user.id === currentUserId ? 'bg-[#35373c]' : ''}`}
      >
        {renderAvatar(user)}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${user.online ? (user.role === 'admin' ? 'text-[#f5a623]' : 'text-[#dbdee1]') : 'text-[#80848e]'}`}>
            {user.username}
            {user.role === 'admin' && ' 👑'}
            {isTimedOut && ' 🔇'}
          </div>
          {user.id === currentUserId && <div className="text-[#949ba4] text-xs">Sen</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 overflow-y-auto py-4 px-2">
      {adminUser && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-1 px-2">👑 Admin — 1</h3>
          {renderUser(adminUser)}
        </div>
      )}
      {onlineCitizens.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-1 px-2">👥 Vatandaşlar — {onlineCitizens.length}</h3>
          {onlineCitizens.map(renderUser)}
        </div>
      )}
      {offlineCitizens.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-1 px-2">Çevrimdışı — {offlineCitizens.length}</h3>
          {offlineCitizens.map(renderUser)}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-[#111214] border border-[#2e3035] rounded-lg shadow-2xl py-1.5 z-50 min-w-[190px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-[#2e3035] mb-1">
            <p className="text-white text-sm font-semibold">{contextMenu.user.username}</p>
            <p className="text-[#949ba4] text-xs">{contextMenu.user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</p>
          </div>

          {/* DM */}
          <button
            onClick={() => { onOpenDM(contextMenu.user.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-[#dbdee1] hover:bg-[#5865f2]/20 text-sm transition-colors"
          >
            💬 Mesaj Gönder
          </button>

          {/* Rename */}
          <button
            onClick={() => {
              setShowRenameInput(v => !v);
              setRenameValue(contextMenu.user.username);
              setRenameError('');
              setShowTimeoutInput(false);
            }}
            className="w-full text-left px-3 py-1.5 text-[#00b0f4] hover:bg-[#00b0f4]/10 text-sm transition-colors"
          >
            ✏️ İsim Değiştir
          </button>
          {showRenameInput && (
            <div className="px-3 py-2 space-y-2">
              <input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const r = onRenameUser(contextMenu.user.id, renameValue);
                    if (r.success) { setContextMenu(null); setShowRenameInput(false); }
                    else setRenameError(r.error || 'Hata.');
                  }
                }}
                className="w-full bg-[#2b2d31] text-white px-2 py-1 rounded text-xs border border-[#4e5058] outline-none focus:border-[#5865f2]"
                placeholder="Yeni isim..."
                autoFocus
              />
              {renameError && <p className="text-[#f23f43] text-xs">{renameError}</p>}
              <button
                onClick={() => {
                  const r = onRenameUser(contextMenu.user.id, renameValue);
                  if (r.success) { setContextMenu(null); setShowRenameInput(false); }
                  else setRenameError(r.error || 'Hata.');
                }}
                className="w-full bg-[#5865f2] text-white text-xs font-bold py-1 rounded hover:bg-[#4752c4] transition-colors"
              >
                Kaydet
              </button>
            </div>
          )}

          {/* Ban */}
          <button
            onClick={() => {
              if (confirm(`${contextMenu.user.username} banlanacak ve hesabı silinecek. Emin misiniz?`)) {
                onBan(contextMenu.user.id);
                setContextMenu(null);
              }
            }}
            className="w-full text-left px-3 py-1.5 text-[#f23f43] hover:bg-[#f23f43]/10 text-sm transition-colors"
          >
            🔨 Banla (Hesabı Sil)
          </button>

          {/* Timeout */}
          {contextMenu.user.timeoutUntil && Date.now() < contextMenu.user.timeoutUntil ? (
            <button
              onClick={() => { onRemoveTimeout(contextMenu.user.id); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[#23a55a] hover:bg-[#23a55a]/10 text-sm transition-colors"
            >
              🔊 Susturmayı Kaldır
            </button>
          ) : (
            <>
              <button
                onClick={() => { setShowTimeoutInput(v => !v); setShowRenameInput(false); }}
                className="w-full text-left px-3 py-1.5 text-[#f5a623] hover:bg-[#f5a623]/10 text-sm transition-colors"
              >
                🔇 Sustur (Timeout)
              </button>
              {showTimeoutInput && (
                <div className="px-3 py-2 space-y-2">
                  <div className="flex gap-1.5">
                    {[5, 10, 30, 60].map(m => (
                      <button
                        key={m}
                        onClick={() => { onTimeout(contextMenu.user.id, m); setContextMenu(null); }}
                        className="flex-1 bg-[#f5a623] text-black text-xs font-bold py-1 rounded hover:bg-[#e09519] transition-colors"
                      >
                        {m}d
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={timeoutMinutes}
                      onChange={e => setTimeoutMinutes(e.target.value)}
                      className="flex-1 bg-[#2b2d31] text-white px-2 py-1 rounded text-xs border border-[#4e5058] outline-none focus:border-[#5865f2]"
                      placeholder="Dakika"
                      min="1"
                      max="10080"
                    />
                    <button
                      onClick={() => {
                        const m = parseInt(timeoutMinutes);
                        if (m > 0) { onTimeout(contextMenu.user.id, m); setContextMenu(null); }
                      }}
                      className="bg-[#f5a623] text-black text-xs font-bold px-2 py-1 rounded hover:bg-[#e09519] transition-colors"
                    >
                      Uygula
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Profile Card */}
      {profileCard && (
        <ProfileCard
          user={profileCard.user}
          onClose={() => setProfileCard(null)}
          onSendDM={profileCard.user.id !== currentUserId ? (uid) => { onOpenDM(uid); setProfileCard(null); } : undefined}
          anchorEl={{ x: profileCard.x, y: profileCard.y }}
        />
      )}
    </div>
  );
}
