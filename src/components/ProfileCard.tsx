import React from 'react';
import { User } from '../types';

interface Props {
  user: User;
  onClose: () => void;
  onSendDM?: (userId: string) => void;
  anchorEl?: { x: number; y: number } | null;
}

export default function ProfileCard({ user, onClose, onSendDM, anchorEl }: Props) {
  const style = anchorEl
    ? { position: 'fixed' as const, left: Math.min(anchorEl.x, window.innerWidth - 320), top: Math.min(anchorEl.y, window.innerHeight - 400), zIndex: 9999 }
    : { position: 'fixed' as const, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };

  const avatarChar = user.username.charAt(0).toUpperCase();
  const avatarBg = user.role === 'admin' ? '#f5a623' : '#5865f2';

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      <div
        style={anchorEl ? { position: 'fixed', left: Math.min(anchorEl.x + 10, window.innerWidth - 320), top: Math.min(anchorEl.y, window.innerHeight - 380), zIndex: 9999 } : style}
        className="w-72 bg-[#232428] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-20 relative" style={{ background: user.bannerUrl ? undefined : 'linear-gradient(135deg, #5865f2, #3b4acf)' }}>
          {user.bannerUrl && (
            <img src={user.bannerUrl} alt="banner" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Avatar */}
        <div className="px-4 relative">
          <div className="absolute -top-10 left-4 w-20 h-20 rounded-full border-4 border-[#232428] overflow-hidden bg-[#232428]">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: avatarBg }}>
                {avatarChar}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pt-12 px-4 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-lg">{user.username}</h3>
            {user.role === 'admin' && <span className="text-[#f5a623] text-sm">👑</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-2.5 h-2.5 rounded-full ${user.online ? 'bg-[#23a55a]' : 'bg-[#80848e]'}`} />
            <span className="text-[#949ba4] text-xs">{user.online ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
          </div>

          {user.bio && (
            <div className="mt-3 pt-3 border-t border-[#3b3d43]">
              <p className="text-[#949ba4] text-xs font-semibold uppercase tracking-wider mb-1">Hakkımda</p>
              <p className="text-[#dbdee1] text-sm">{user.bio}</p>
            </div>
          )}

          {onSendDM && (
            <button
              onClick={() => { onSendDM(user.id); onClose(); }}
              className="mt-3 w-full bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold py-2 rounded-md transition-colors"
            >
              💬 Mesaj Gönder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
