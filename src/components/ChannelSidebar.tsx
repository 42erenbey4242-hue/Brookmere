import React, { useState, useRef } from 'react';
import { Server, Category, Channel, User } from '../types';

interface Props {
  server: Server;
  categories: Category[];
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
  isAdmin: boolean;
  currentUser: User;
  onCreateChannel: (categoryId: string | null) => void;
  onCreateCategory: () => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onReorderChannels: (updates: Array<{ id: string; changes: Partial<Channel> }>) => void;
  onReorderCategories: (updates: Array<{ id: string; order: number }>) => void;
  onOpenSettings: () => void;
  onOpenUserSettings: () => void;
}

type DragType = 'channel' | 'category';

export default function ChannelSidebar({
  server, categories, channels, selectedChannelId, onSelectChannel,
  isAdmin, currentUser, onCreateChannel, onCreateCategory, onEditChannel,
  onDeleteChannel, onEditCategory, onDeleteCategory, onReorderChannels,
  onReorderCategories, onOpenSettings, onOpenUserSettings
}: Props) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [shiftSelectStart, setShiftSelectStart] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<DragType>('channel');
  const dragItem = useRef<{ id: string; type: DragType } | null>(null);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const getChannelsByCategory = (catId: string | null) =>
    channels.filter(ch => ch.categoryId === catId).sort((a, b) => a.order - b.order);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const uncategorizedChannels = getChannelsByCategory(null);
  const allDisplayedChannels: Channel[] = [
    ...uncategorizedChannels,
    ...sortedCategories.flatMap(cat => getChannelsByCategory(cat.id))
  ];

  const handleChannelClick = (channelId: string, e: React.MouseEvent) => {
    if (!isAdmin) { onSelectChannel(channelId); return; }
    if (e.shiftKey && shiftSelectStart) {
      const startIdx = allDisplayedChannels.findIndex(c => c.id === shiftSelectStart);
      const endIdx = allDisplayedChannels.findIndex(c => c.id === channelId);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
        setSelectedChannels(new Set(allDisplayedChannels.slice(from, to + 1).map(c => c.id)));
      }
    } else {
      onSelectChannel(channelId);
      setShiftSelectStart(channelId);
      setSelectedChannels(new Set([channelId]));
    }
  };

  // Channel drag
  const handleChannelDragStart = (e: React.DragEvent, channelId: string) => {
    dragItem.current = { id: channelId, type: 'channel' };
    setDraggingId(channelId); setDragType('channel');
    e.dataTransfer.effectAllowed = 'move';
  };

  // Category drag
  const handleCategoryDragStart = (e: React.DragEvent, catId: string) => {
    dragItem.current = { id: catId, type: 'category' };
    setDraggingId(catId); setDragType('category');
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(id);
  };

  const handleChannelDrop = (e: React.DragEvent, targetChannelId: string) => {
    e.preventDefault();
    if (!dragItem.current || dragItem.current.type !== 'channel' || dragItem.current.id === targetChannelId) {
      setDragOverId(null); setDraggingId(null); return;
    }
    const dragged = channels.find(c => c.id === dragItem.current!.id);
    const target = channels.find(c => c.id === targetChannelId);
    if (!dragged || !target) return;
    const sameGroup = channels.filter(c => c.categoryId === target.categoryId).sort((a, b) => a.order - b.order);
    const targetIdx = sameGroup.findIndex(c => c.id === targetChannelId);
    const filtered = sameGroup.filter(c => c.id !== dragged.id);
    filtered.splice(targetIdx, 0, { ...dragged, categoryId: target.categoryId });
    const updates = filtered.map((ch, idx) => ({ id: ch.id, changes: { order: idx, categoryId: target.categoryId } }));
    if (dragged.categoryId !== target.categoryId) {
      const origGroup = channels.filter(c => c.categoryId === dragged.categoryId && c.id !== dragged.id)
        .sort((a, b) => a.order - b.order).map((ch, idx) => ({ id: ch.id, changes: { order: idx, categoryId: ch.categoryId } }));
      updates.push(...origGroup);
    }
    onReorderChannels(updates);
    setDragOverId(null); setDraggingId(null); dragItem.current = null;
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCatId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!dragItem.current || dragItem.current.type !== 'category' || dragItem.current.id === targetCatId) {
      setDragOverId(null); setDraggingId(null); return;
    }
    const sorted = [...sortedCategories];
    const fromIdx = sorted.findIndex(c => c.id === dragItem.current!.id);
    const toIdx = sorted.findIndex(c => c.id === targetCatId);
    if (fromIdx === -1 || toIdx === -1) return;
    const moved = sorted.splice(fromIdx, 1)[0];
    sorted.splice(toIdx, 0, moved);
    onReorderCategories(sorted.map((c, idx) => ({ id: c.id, order: idx })));
    setDragOverId(null); setDraggingId(null); dragItem.current = null;
  };

  const handleDragEnd = () => { setDragOverId(null); setDraggingId(null); dragItem.current = null; };

  const renderChannel = (channel: Channel) => {
    const isSelected = selectedChannelId === channel.id;
    const isHighlighted = selectedChannels.has(channel.id);
    return (
      <div key={channel.id} className="relative">
        {dragOverId === channel.id && dragType === 'channel' && draggingId !== channel.id && (
          <div className="h-0.5 bg-[#5865f2] rounded-full mx-2" />
        )}
        <div
          draggable={isAdmin}
          onDragStart={e => handleChannelDragStart(e, channel.id)}
          onDragOver={e => handleDragOver(e, channel.id)}
          onDrop={e => handleChannelDrop(e, channel.id)}
          onDragEnd={handleDragEnd}
          onClick={e => handleChannelClick(channel.id, e)}
          className={`group flex items-center gap-1.5 px-2 py-1 mx-2 rounded cursor-pointer transition-colors select-none ${
            isSelected ? 'bg-[#393c41] text-white' :
            isHighlighted ? 'bg-[#5865f2]/30 text-white' :
            draggingId === channel.id ? 'opacity-50' :
            'text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]'
          }`}
        >
          {isAdmin && (
            <svg className="w-3 h-3 text-[#949ba4] opacity-0 group-hover:opacity-100 cursor-grab shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/>
              <circle cx="14" cy="6" r="1.5"/><circle cx="14" cy="12" r="1.5"/><circle cx="14" cy="18" r="1.5"/>
            </svg>
          )}
          <svg className="w-4 h-4 shrink-0 text-[#80848e]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10.18 17.44a.75.75 0 0 1-1.06 1.12l-.6-.56A2.75 2.75 0 0 1 7.75 16V9.75a.75.75 0 0 1 1.5 0V16c0 .32.12.63.34.86l.59.58Zm3.64 0 .59-.58c.22-.23.34-.54.34-.86V9.75a.75.75 0 0 1 1.5 0V16a2.75 2.75 0 0 1-.77 1.9l-.6.56a.75.75 0 0 1-1.06-1.12v.1Zm-4.68-9.19a.75.75 0 1 1 0-1.5h5.72a.75.75 0 0 1 0 1.5H9.14ZM5.5 8a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h.25a.75.75 0 0 1 0 1.5H5.5A2 2 0 0 1 3.5 15.5v-7A2 2 0 0 1 5.5 6.5h.25a.75.75 0 0 1 0 1.5H5.5Zm13 0h-.25a.75.75 0 0 1 0-1.5h.25a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-.25a.75.75 0 0 1 0-1.5h.25a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5Z"/>
          </svg>
          <span className="text-sm flex-1 truncate">{channel.name}</span>
          {channel.permission === 'admin_only' && (
            <svg className="w-3.5 h-3.5 text-[#f5a623] shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          )}
          {isAdmin && (
            <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
              <button onClick={e => { e.stopPropagation(); onEditChannel(channel); }} className="p-0.5 text-[#b5bac1] hover:text-white rounded">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={e => { e.stopPropagation(); onDeleteChannel(channel.id); }} className="p-0.5 text-[#b5bac1] hover:text-[#f23f43] rounded">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0">
      <button
        onClick={isAdmin ? onOpenSettings : undefined}
        className={`flex items-center justify-between px-4 py-3 border-b border-[#1e1f22] ${isAdmin ? 'hover:bg-[#35373c] cursor-pointer' : 'cursor-default'} transition-colors`}
      >
        <span className="text-white font-bold text-base truncate">{server.name}</span>
        {isAdmin && (
          <svg className="w-4 h-4 text-[#949ba4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {uncategorizedChannels.map(renderChannel)}

        {sortedCategories.map(cat => (
          <div
            key={cat.id}
            draggable={isAdmin}
            onDragStart={e => handleCategoryDragStart(e, cat.id)}
            onDragOver={e => { e.preventDefault(); handleDragOver(e, cat.id); }}
            onDrop={e => handleCategoryDrop(e, cat.id)}
            onDragEnd={handleDragEnd}
            className={`mt-2 ${draggingId === cat.id ? 'opacity-50' : ''} ${dragOverId === cat.id && dragType === 'category' && draggingId !== cat.id ? 'border-t-2 border-[#5865f2]' : ''}`}
          >
            <div className="flex items-center group px-2 mb-0.5">
              {isAdmin && (
                <svg className="w-3 h-3 text-[#949ba4] opacity-0 group-hover:opacity-100 cursor-grab shrink-0 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/>
                  <circle cx="14" cy="6" r="1.5"/><circle cx="14" cy="12" r="1.5"/><circle cx="14" cy="18" r="1.5"/>
                </svg>
              )}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center gap-1 flex-1 text-xs font-semibold text-[#949ba4] hover:text-[#dbdee1] uppercase tracking-wider transition-colors"
              >
                <svg className={`w-2.5 h-2.5 transition-transform ${collapsedCategories.has(cat.id) ? '-rotate-90' : ''}`} fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {cat.name}
              </button>
              {isAdmin && (
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button onClick={() => onCreateChannel(cat.id)} className="p-0.5 text-[#949ba4] hover:text-white rounded transition-colors" title="Kanal Ekle">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button onClick={() => onEditCategory(cat)} className="p-0.5 text-[#949ba4] hover:text-white rounded transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => onDeleteCategory(cat.id)} className="p-0.5 text-[#949ba4] hover:text-[#f23f43] rounded transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>
            {!collapsedCategories.has(cat.id) && getChannelsByCategory(cat.id).map(renderChannel)}
          </div>
        ))}

        {isAdmin && (
          <div className="px-2 pt-3 pb-1 space-y-1">
            <button onClick={() => onCreateChannel(null)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c] text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Kanal Oluştur
            </button>
            <button onClick={onCreateCategory} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c] text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Kategori Oluştur
            </button>
          </div>
        )}
      </div>

      {/* User panel */}
      <div className="bg-[#232428] px-2 py-2 flex items-center gap-2 border-t border-[#1e1f22]">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-white text-sm font-bold ${currentUser.role === 'admin' ? 'bg-[#f5a623]' : 'bg-[#5865f2]'}`}>
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold truncate">{currentUser.username}</div>
          <div className="text-[#949ba4] text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#23a55a] inline-block" />Çevrimiçi
          </div>
        </div>
        <button onClick={onOpenUserSettings} className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition-colors" title="Kullanıcı Ayarları">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
