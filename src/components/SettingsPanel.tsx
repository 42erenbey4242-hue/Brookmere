import React, { useState, useRef } from 'react';
import { User } from '../types';
import ImageCropper from './ImageCropper';
import AdminNameEffect from './AdminNameEffect';

interface Props {
  user: User;
  onChangeName: (newName: string) => { success: boolean; error?: string };
  onUpdateProfile: (updates: { avatarUrl?: string | null; avatarIsGif?: boolean; bannerUrl?: string | null; bannerIsGif?: boolean; bio?: string }) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onClose: () => void;
}

type CropTarget = { src: string; field: 'avatar' | 'banner' } | null;

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const ALLOWED_EXT = 'PNG, JPG, WEBP';

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
  const [profileMsg, setProfileMsg] = useState('');
  const [profileMsgOk, setProfileMsgOk] = useState(true);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
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

  const handleFileSelect = (file: File, field: 'avatar' | 'banner') => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setProfileMsg(`❌ GIF desteklenmiyor. Lütfen ${ALLOWED_EXT} yükleyin.`);
      setProfileMsgOk(false);
      return;
    }
    setProfileMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setCropTarget({ src: reader.result as string, field });
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    handleFileSelect(file, 'avatar');
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    handleFileSelect(file, 'banner');
  };

  const handleCropConfirm = (croppedUrl: string) => {
    if (!cropTarget) return;
    if (cropTarget.field === 'avatar') setAvatarPreview(croppedUrl);
    else setBannerPreview(croppedUrl);
    setCropTarget(null);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg('');
    const result = await onUpdateProfile({
      avatarUrl: avatarPreview,
      avatarIsGif: false,
      bannerUrl: bannerPreview,
      bannerIsGif: false,
      bio,
    });
    setProfileSaving(false);
    if (result.success) {
      setProfileMsgOk(true);
      setProfileMsg('✅ Profil kaydedildi!');
      setTimeout(() => setProfileMsg(''), 3000);
    } else {
      setProfileMsgOk(false);
      setProfileMsg(`❌ ${result.error || 'Hata oluştu.'}`);
    }
  };

  const avatarChar = user.username.charAt(0).toUpperCase();
  const isAdmin = user.role === 'admin';

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
          <div className="border-t border-[#1e1f22] pt-3 mt-auto">
            <button onClick={() => setShowLogoutConfirm(true)}
              className="w-full text-left px-2 py-1.5 rounded text-sm text-[#f23f43] hover:bg-[#f23f43]/10 font-medium transition-colors"
            >Hesaptan Çıkış Yap</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">

          {/* ── Profil Sekmesi ── */}
          {activeTab === 'profile' && (
            <div>
              <h3 className="text-white font-bold text-xl mb-6">Profil Ayarları</h3>

              {/* Önizleme kartı */}
              <div className="mb-6 bg-[#232428] rounded-xl overflow-hidden w-72">
                <div className="h-20 relative" style={{ background: bannerPreview ? undefined : 'linear-gradient(135deg, #5865f2, #3b4acf)' }}>
                  {bannerPreview && <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />}
                </div>
                <div className="px-4 relative pb-4">
                  <div className="absolute -top-8 left-4 w-16 h-16 rounded-full border-4 border-[#232428] overflow-hidden">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold" style={{ background: isAdmin ? '#cc0000' : '#5865f2' }}>{avatarChar}</div>
                    }
                  </div>
                  <div className="pt-10">
                    {isAdmin
                      ? <AdminNameEffect name={user.username} className="text-sm" />
                      : <p className="text-white font-bold text-sm">{user.username}</p>
                    }
                    {bio && <p className="text-[#949ba4] text-xs mt-1">{bio}</p>}
                  </div>
                </div>
              </div>

              {/* Avatar */}
              <div className="mb-4">
                <label className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wider mb-2 block">Profil Resmi</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold" style={{ background: isAdmin ? '#cc0000' : '#5865f2' }}>{avatarChar}</div>
                    }
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
                  <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleAvatarChange} />
                </div>
                <p className="text-[#949ba4] text-xs mt-2">Desteklenen formatlar: {ALLOWED_EXT}</p>
              </div>

              {/* Banner */}
              <div className="mb-4">
                <label className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wider mb-2 block">Profil Başlığı (Banner)</label>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-14 rounded-md overflow-hidden shrink-0" style={{ background: bannerPreview ? undefined : 'linear-gradient(135deg, #5865f2, #3b4acf)' }}>
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
                  <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleBannerChange} />
                </div>
                <p className="text-[#949ba4] text-xs mt-2">Desteklenen formatlar: {ALLOWED_EXT}</p>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <label className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wider mb-2 block">Hakkımda</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={190} rows={3}
                  placeholder="Brookmere Polis Departmanı"
                  className="w-full bg-[#1e1f22] text-[#dbdee1] placeholder-[#6d6f78] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5865f2] resize-none"
                />
                <p className="text-[#949ba4] text-xs mt-1">{bio.length}/190</p>
              </div>

              {profileMsg && (
                <p className={`text-sm mb-3 ${profileMsgOk ? 'text-[#23a55a]' : 'text-[#f23f43]'}`}>{profileMsg}</p>
              )}
              <button onClick={handleSaveProfile} disabled={profileSaving}
                className="px-6 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
              >{profileSaving ? '⏳ Kaydediliyor...' : 'Değişiklikleri Kaydet'}</button>
            </div>
          )}

          {/* ── Hesap Sekmesi ── */}
          {activeTab === 'account' && (
            <div>
              <h3 className="text-white font-bold text-xl mb-6">Hesap Ayarları</h3>
              <div className="mb-6 p-4 bg-[#1e1f22] rounded-lg flex items-center gap-3">
                <div>
                  <p className="text-[#949ba4] text-xs font-semibold uppercase tracking-wider mb-1">Kullanıcı Adı</p>
                  {isAdmin
                    ? <AdminNameEffect name={user.username} className="text-base" />
                    : <p className="text-white font-semibold">{user.username}</p>
                  }
                </div>
                {isAdmin && (
                  <span className="ml-auto text-xs bg-[#cc0000]/20 text-[#ff4444] border border-[#cc0000]/40 px-2 py-0.5 rounded-full font-semibold">
                    Holder - Kaymakam
                  </span>
                )}
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
                    type="text" value={newName}
                    onChange={e => setNewName(e.target.value)}
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

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
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

      {/* Image Cropper */}
      {cropTarget && (
        <ImageCropper
          src={cropTarget.src}
          aspectRatio={cropTarget.field === 'avatar' ? 1 : 600 / 240}
          circular={cropTarget.field === 'avatar'}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropTarget(null)}
        />
      )}
    </div>
  );
}
