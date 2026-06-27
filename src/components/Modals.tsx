import React, { useState, useRef } from 'react';
import { Server, Channel, Category } from '../types';

// ── Create Server Modal ───────────────────────────────────────────────────────

interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateServerModal({ onClose, onCreate }: CreateServerModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white text-xl font-bold mb-2">Sunucu Oluştur</h2>
      <p className="text-[#949ba4] text-sm mb-6">Yeni bir sunucu oluşturun. Tüm vatandaşlar otomatik olarak katılır.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">Sunucu Adı</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2]"
            placeholder="Brookmere Genel"
            maxLength={100}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2.5 rounded-md font-semibold transition-colors">
            İptal
          </button>
          <button type="submit" disabled={!name.trim()} className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white py-2.5 rounded-md font-semibold transition-colors disabled:opacity-50">
            Oluştur
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Server Settings Modal ─────────────────────────────────────────────────────

interface ServerSettingsModalProps {
  server: Server;
  onClose: () => void;
  onUpdate: (updates: Partial<Server>) => void;
  onDelete: () => void;
}

export function ServerSettingsModal({ server, onClose, onUpdate, onDelete }: ServerSettingsModalProps) {
  const [name, setName] = useState(server.name);
  const [iconPreview, setIconPreview] = useState<string | null>(server.icon);
  const [iconData, setIconData] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      setIconPreview(data);
      setIconData(data);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const updates: Partial<Server> = { name: name.trim() };
    if (iconData) updates.icon = iconData;
    onUpdate(updates);
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white text-xl font-bold mb-6">Sunucu Ayarları</h2>
      
      <div className="space-y-5">
        {/* Icon */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-[#4e5058] hover:border-[#5865f2] transition-colors bg-[#1e1f22]"
          >
            {iconPreview ? (
              <img src={iconPreview} alt="Server icon" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-semibold mb-1">Sunucu Simgesi</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-[#4e5058] hover:bg-[#6d6f78] text-white px-3 py-1.5 rounded-md transition-colors"
            >
              Resim Yükle
            </button>
            {iconPreview && (
              <button
                onClick={() => { setIconPreview(null); setIconData('REMOVE'); }}
                className="ml-2 text-xs text-[#f23f43] hover:underline"
              >
                Kaldır
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">Sunucu Adı</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2]"
            maxLength={100}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2.5 rounded-md font-semibold transition-colors">
            İptal
          </button>
          <button onClick={handleSave} className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white py-2.5 rounded-md font-semibold transition-colors">
            Kaydet
          </button>
        </div>

        <div className="border-t border-[#f23f43]/30 pt-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-[#f23f43]/10 hover:bg-[#f23f43]/20 text-[#f23f43] py-2 rounded-md font-semibold text-sm transition-colors border border-[#f23f43]/30"
          >
            Sunucuyu Sil
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center">
          <div className="bg-[#2b2d31] rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-bold text-lg mb-2">Sunucuyu Sil</h3>
            <p className="text-[#949ba4] text-sm mb-6">
              <strong className="text-white">"{server.name}"</strong> sunucusunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2.5 rounded-md font-semibold transition-colors">
                İptal
              </button>
              <button onClick={() => { onDelete(); onClose(); }} className="flex-1 bg-[#f23f43] hover:bg-[#c93b3b] text-white py-2.5 rounded-md font-semibold transition-colors">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalOverlay>
  );
}

// ── Create/Edit Channel Modal ─────────────────────────────────────────────────

interface ChannelModalProps {
  channel?: Channel;
  categories: Category[];
  defaultCategoryId?: string | null;
  onClose: () => void;
  onSave: (name: string, categoryId: string | null, permission: 'everyone' | 'admin_only') => void;
  selectedChannelIds?: string[];
}

export function ChannelModal({ channel, categories, defaultCategoryId, onClose, onSave, selectedChannelIds }: ChannelModalProps) {
  const [name, setName] = useState(channel?.name || '');
  const [categoryId, setCategoryId] = useState<string | null>(channel?.categoryId ?? defaultCategoryId ?? null);
  const [permission, setPermission] = useState<'everyone' | 'admin_only'>(channel?.permission || 'everyone');
  const isBulk = selectedChannelIds && selectedChannelIds.length > 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBulk && !name.trim()) return;
    onSave(isBulk ? channel?.name || '' : name.trim(), categoryId, permission);
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white text-xl font-bold mb-6">
        {isBulk ? `${selectedChannelIds!.length} Kanalı Düzenle` : channel ? 'Kanalı Düzenle' : 'Kanal Oluştur'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isBulk && (
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">Kanal Adı</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2]"
              placeholder="genel"
              maxLength={100}
            />
          </div>
        )}

        {!isBulk && (
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">Kategori</label>
            <select
              value={categoryId || ''}
              onChange={e => setCategoryId(e.target.value || null)}
              className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2]"
            >
              <option value="">— Kategorisiz —</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">İzinler</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-[#1e1f22] rounded-md cursor-pointer hover:bg-[#2e3035] transition-colors">
              <input
                type="radio"
                name="permission"
                value="everyone"
                checked={permission === 'everyone'}
                onChange={() => setPermission('everyone')}
                className="accent-[#5865f2]"
              />
              <div>
                <p className="text-white text-sm font-medium">Herkes yazabilir</p>
                <p className="text-[#949ba4] text-xs">Tüm vatandaşlar mesaj gönderebilir</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-[#1e1f22] rounded-md cursor-pointer hover:bg-[#2e3035] transition-colors">
              <input
                type="radio"
                name="permission"
                value="admin_only"
                checked={permission === 'admin_only'}
                onChange={() => setPermission('admin_only')}
                className="accent-[#5865f2]"
              />
              <div>
                <p className="text-white text-sm font-medium">Sadece Admin yazabilir</p>
                <p className="text-[#949ba4] text-xs">Vatandaşlar yalnızca okuyabilir</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2.5 rounded-md font-semibold transition-colors">
            İptal
          </button>
          <button type="submit" className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white py-2.5 rounded-md font-semibold transition-colors">
            {channel ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Create/Edit Category Modal ────────────────────────────────────────────────

interface CategoryModalProps {
  category?: Category;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function CategoryModal({ category, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white text-xl font-bold mb-6">{category ? 'Kategoriyi Düzenle' : 'Kategori Oluştur'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">Kategori Adı</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2]"
            placeholder="Genel"
            maxLength={100}
          />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2.5 rounded-md font-semibold transition-colors">
            İptal
          </button>
          <button type="submit" disabled={!name.trim()} className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white py-2.5 rounded-md font-semibold transition-colors disabled:opacity-50">
            {category ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Shared Modal Overlay ──────────────────────────────────────────────────────

interface OverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

function ModalOverlay({ children, onClose }: OverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#2b2d31] rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
