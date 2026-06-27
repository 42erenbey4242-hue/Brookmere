import React, { useState, useRef } from 'react';
import { User } from '../types';

interface Props {
  user: User;
  onChangeName: (newName: string) => { success: boolean; error?: string };
  onUpdateProfile: (updates: { avatarUrl?: string | null; avatarIsGif?: boolean; bannerUrl?: string | null; bannerIsGif?: boolean; bio?: string }) => { success: boolean };
  onLogout: () => void;
  onClose: () => void;
}

export default function SettingsPanel({ user, onChangeName, onUpdateProfile, onLogout, onClose }: Props) {
  const [newName, setNewName] = useState(user.username);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(user.bannerUrl || null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const canChangeName = () => {
    if (user.role === 'admin') return true;
    if (!user.lastNameChangeAt) return true;
    return Date.now() - user.lastNameChangeAt >= 30 * 24 * 60 * 60 * 1000;
  };

  const daysUntilNameChange = () => {
    if (!user.lastNameChangeAt) return 0;
    return Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - user.lastNameChangeAt)) / (24 * 60 * 60 * 1000));
  };

  const handleNameChange = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(''); setNameSuccess('');
    const result = onChangeName(newName);
    if (result.success) setNameSuccess('İsim başarıyla değiştirildi!');
    else setNameError(result.error || 'Hata oluştu.');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) return;
    const b64 = await fileToBase64(file);
    setAvatarPreview(b64);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) return;
    const b64 = await fileToBase64(file);
    setBannerPreview(b64);
  };

  const handleSaveProfile = () => {
    setProfileSaving(true);
    const avatarIsGif = avatarPreview?.startsWith('data:image/gif') || false;
    const bannerIsGif = bannerPreview?.startsWith('data:image/gif') || false;
    onUpdateProfile({ avatarUrl: avatarPreview, avatarIsGif, bannerUrl: bannerPreview, bannerIsGif, bio });
    setProfileSaving(false);
    setProfileSuccess('Profil kaydedildi!');
    setTimeout(() => setProfileSuccess(''), 2000);
  };

  const avatarChar = user.username.charAt(0).toUpperCase();
  const avatarBg = user.role === 'admin' ? '#f5a623' : '#5865f2';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#2b2d31] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-48 bg-[#232428] p-4 flex flex-col shrink-0">
          <h2 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-2 px-2">Kullanıcı Ayarları</h2>
          {(['profile', 'account'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-left px-2 py-1.5 rounded text-sm font-medium transition-colors mb-0.5 ${activeTab === tab ? 'bg-[#393c41] text-white' : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'}`}
            >
              {tab === 'profile' ? 'Profil' : 'Hesap'}
            </button>
          ))}
          <div className="mt-auto border-t border-[#1e1f22] pt-3 mt-3">
            <button onClick={() => setShowLogoutConfirm(true)}
              className="w-full text-left px-2 py-1.5 rounded text-sm text-[#f23f43] hover:bg-[#f23f43]/10 font-medium transition-colors"
            >Hesaptan Çıkış Yap</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'profile' && (
            <div>
              <h3 className="text-white font-bold text-xl mb-6">Profil Ayarları</h3>

              {/* Preview */}
              <div className="mb-6 bg-[#232428] rounded-xl overflow-hidden w-72">
                <div className="h-20 relative" style={{ background: bannerPreview ? undefined : 'linear-gradient(135deg, #5865f2, #3b4acf)' }}>
                  {bannerPreview && <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />}
                </div>
                <div className="px-4 relative pb-4">
                  <div className="absolute -top-8 left-4 w-16 h-16 rounded-full border-4 border-[#232428] overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold" style={{ background: avatarBg }}>{avatarChar}</div>
                    )}
                  </div>
                  <div className="pt-10">
                    <p className="text-white font-bold text-sm">{user.username}</p>
                    {bio && <p className="text-[#949ba4] text-xs mt-1">{bio}</p>}
                  </div>
                </div>
              </div>

              {/* Avatar */}
              <div className="mb-4">
                <label className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wider mb-2 block">Profil Resmi</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold" style={{ background: avatarBg }}>{avatarChar}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm rounded-md transition-colors"
                    >Resim Değiştir</button>
                    {avatarPreview && (
                      <button onClick={() => setAvatarPreview(null)}
                        className="px-3 py-1.5 bg-[#f23f43]/20 hover:bg-[#f23f43]/30 text-[#f23f43] text-sm rounded-md transition-colors"
                      >Resmi Kaldır</button>
                    )}
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
                </div>
                <p className="text-[#949ba4] text-xs mt-2">PNG, JPG, WEBP, GIF desteklenir. GIF üzerine gelindiğinde oynar.</p>
              </div>

              {/* Banner */}
              <div className="mb-4">
                <label className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wider mb-2 block">Profil Başlığı (Banner)</label>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-14 rounded-md overflow-hidden" style={{ background: bannerPreview ? undefined : 'linear-gradient(135deg, #5865f2, #3b4acf)' }}>
                    {bannerPreview && <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm rounded-md transition-colors"
                    >Banner Değiştir</button>
                    {bannerPreview && (
                      <button onClick={() => setBannerPreview(null)}
                        className="px-3 py-1.5 bg-[#f23f43]/20 hover:bg-[#f23f43]/30 text-[#f23f43] text-sm rounded-md transition-colors"
                      >Banner Kaldır</button>
                    )}
                  </div>
                  <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={handleBannerChange} />
                </div>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <label className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wider mb-2 block">Hakkımda</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={190}
                  rows={3}
                  placeholder="Brookmere Polis Departmanı"
                  className="w-full bg-[#1e1f22] text-[#dbdee1] placeholder-[#6d6f78] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5865f2] resize-none"
                />
                <p className="text-[#949ba4] text-xs mt-1">{bio.length}/190</p>
              </div>

              {profileSuccess && <p className="text-[#23a55a] text-sm mb-3">{profileSuccess}</p>}
              <button onClick={handleSaveProfile} disabled={profileSaving}
                className="px-6 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
              >Değişiklikleri Kaydet</button>
            </div>
          )}

          {activeTab === 'account' && (
            <div>
              <h3 className="text-white font-bold text-xl mb-6">Hesap Ayarları</h3>
              <div className="mb-6 p-4 bg-[#1e1f22] rounded-lg">
                <p className="text-[#949ba4] text-xs font-semibold uppercase tracking-wider mb-1">Kullanıcı Adı</p>
                <p className="text-white font-semibold">{user.username}</p>
              </div>
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3">İsim Değiştir</h4>
                {!canChangeName() && (
                  <div className="mb-3 p-3 bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-lg">
                    <p className="text-[#f5a623] text-sm">⏳ İsim değiştirmek için {daysUntilNameChange()} gün beklemeniz gerekiyor.</p>
                  </div>
                )}
                <form onSubmit={handleNameChange} className="flex gap-3">
                  <input
                    type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    disabled={!canChangeName()}
                    className="flex-1 bg-[#1e1f22] text-white rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5865f2] disabled:opacity-50"
                  />
                  <button type="submit" disabled={!canChangeName()}
                    className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
                  >Kaydet</button>
                </form>
                {nameError && <p className="text-[#f23f43] text-sm mt-2">{nameError}</p>}
                {nameSuccess && <p className="text-[#23a55a] text-sm mt-2">{nameSuccess}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
          <div className="bg-[#2b2d31] rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-white font-bold text-lg mb-2">Emin misiniz?</h3>
            <p className="text-[#949ba4] text-sm mb-6">Bu hesaba tekrar giriş yapamayacaksınız.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 bg-[#393c41] hover:bg-[#4e5058] text-white text-sm font-semibold rounded-md transition-colors">Geri Dön</button>
              <button onClick={onLogout} className="px-4 py-2 bg-[#f23f43] hover:bg-[#d93025] text-white text-sm font-semibold rounded-md transition-colors">Eminim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
