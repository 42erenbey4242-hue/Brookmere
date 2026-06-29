import React from 'react';
import { User } from '../types';
import AdminNameEffect from './AdminNameEffect';

interface Props {
  user: User;
  onClose: () => void;
  onSendDM?: (userId: string) => void;
  anchorEl?: { x: number; y: number } | null;
}

export default function ProfileCard({ user, onClose, onSendDM, anchorEl }: Props) {
  const avatarBg = user.role === 'admin' ? '#cc0000' : '#5865f2';

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      <div
        style={anchorEl
          ? { position: 'fixed', left: Math.min(anchorEl.x + 10, window.innerWidth - 320), top: Math.min(anchorEl.y, window.innerHeight - 400), zIndex: 9999 }
          : { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }
        }
        className="w-72 bg-[#232428] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-20 relative" style={{ background: user.bannerUrl ? undefined : 'linear-gradient(135deg, #5865f2, #3b4acf)' }}>
          {user.bannerUrl && <img src={user.bannerUrl} alt="banner" className="w-full h-full object-cover" />}
        </div>

        {/* Avatar */}
        <div className="px-4 relative">
          <div className="absolute -top-10 left-4 w-20 h-20 rounded-full border-4 border-[#232428] overflow-hidden">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: avatarBg }}>{user.username.charAt(0).toUpperCase()}</div>
            }
          </div>
        </div>

        {/* Info */}
        <div className="pt-12 px-4 pb-4">
          <div className="flex items-start gap-2 flex-wrap">
            {user.role === 'admin'
              ? <AdminNameEffect name={user.username} className="text-lg" />
              : <h3 className="text-white font-bold text-lg">{user.username}</h3>
            }
          </div>
          {user.role === 'admin' && (
            <div className="mt-1 mb-1">
              <span className="text-xs bg-[#cc0000]/20 text-[#ff4444] border border-[#cc0000]/40 px-2 py-0.5 rounded-full font-semibold">
                Holder - Kaymakam
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
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
