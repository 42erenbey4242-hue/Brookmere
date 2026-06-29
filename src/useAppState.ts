import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppState, User, Server, Category, Channel, Message, DirectMessage, DMConversation
} from './types';
import {
  loadLocalState, saveLocal, onLocalChange, generateId,
  getDeviceId, getStoredSession, storeSession, clearSession, hashPassword,
  subscribeToFirebase, loadFromFirebase, isFirebaseEnabled, onFirebaseReady,
  fbWriteUser, fbWriteServer, fbWriteCategory, fbWriteChannel, fbDeleteChannel,
  fbDeleteCategory, fbWriteMessage, fbDeleteMessage, fbWriteDM, fbWriteDMConv,
  fbDeleteServer, fbDeleteUser, fbWriteDeviceCooldown,
} from './store';

export function useAppState() {
  const [state, setStateRaw] = useState<AppState>(() => loadLocalState());
  const stateRef = useRef(state);

  // State güncelleyici — hem local hem Firebase'e yaz (Firebase yazımı granüler, aşağıda)
  const setLocalState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      stateRef.current = next;
      saveLocal(next);
      return next;
    });
  }, []);

  // Cross-tab (aynı cihaz farklı sekme)
  useEffect(() => {
    return onLocalChange(s => { setStateRaw(s); stateRef.current = s; });
  }, []);

  // Firebase gerçek zamanlı listener — tüm değişiklikleri dinle
  useEffect(() => {
    let unsub: (() => void) | null = null;

    onFirebaseReady(async () => {
      // İlk yükleme
      const fbState = await loadFromFirebase();
      if (fbState) { setStateRaw(fbState); stateRef.current = fbState; }

      // Canlı dinleyici
      unsub = subscribeToFirebase(newState => {
        setStateRaw(newState);
        stateRef.current = newState;
      });
    });

    return () => { unsub?.(); };
  }, []);

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      const uid = currentUserIdRef.current;
      if (!uid) return;
      const prev = stateRef.current;
      const user = prev.users[uid];
      if (!user) return;
      if (user.online && Date.now() - user.lastSeen < 4000) return;
      const updated = { ...user, online: true, lastSeen: Date.now() };
      const next = { ...prev, users: { ...prev.users, [uid]: updated } };
      stateRef.current = next;
      saveLocal(next);
      setStateRaw(next);
      fbWriteUser(updated);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fn = () => {
      const uid = currentUserIdRef.current;
      if (!uid) return;
      const user = stateRef.current.users[uid];
      if (!user) return;
      const updated = { ...user, online: false, lastSeen: Date.now() };
      fbWriteUser(updated);
    };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);

  // Offline detection for other users (15s no heartbeat)
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const prev = stateRef.current;
      let changed = false;
      const newUsers = { ...prev.users };
      Object.values(newUsers).forEach(u => {
        if (u.id === currentUserIdRef.current) return;
        if (u.online && now - u.lastSeen > 15000) {
          newUsers[u.id] = { ...u, online: false };
          changed = true;
        }
      });
      if (!changed) return;
      const next = { ...prev, users: newUsers };
      stateRef.current = next; saveLocal(next); setStateRaw(next);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const getCurrentUser = useCallback((): User | null => {
    const uid = getStoredSession();
    if (!uid) return null;
    return stateRef.current.users[uid] || null;
  }, []);

  const register = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const deviceId = getDeviceId();
    const s = stateRef.current;
    const cooldown = s.deviceAccountCooldown[deviceId];
    if (cooldown) {
      const diff = Date.now() - cooldown;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (diff < thirtyDays) {
        const rem = Math.ceil((thirtyDays - diff) / 86400000);
        return { success: false, error: `Hesap değiştirme bekleme süresi: ${rem} gün kaldı.` };
      }
    }
    if (!username.trim() || username.trim().length < 2) return { success: false, error: 'İsim en az 2 karakter olmalıdır.' };
    if (username.trim().length > 32) return { success: false, error: 'İsim en fazla 32 karakter olabilir.' };

    const userId = 'user_' + generateId();
    const newUser: User = {
      id: userId, username: username.trim(),
      passwordHash: hashPassword(password), role: 'citizen',
      createdAt: Date.now(), lastNameChangeAt: null, lastAccountSwitchAt: null,
      isBanned: false, online: true, lastSeen: Date.now(),
      avatarUrl: null, bannerUrl: null, bio: '',
    };
    const next = { ...s, users: { ...s.users, [userId]: newUser } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(newUser);
    storeSession(userId);
    currentUserIdRef.current = userId;
    return { success: true };
  }, []);

  const loginAdmin = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const adminId = 'admin_user_brookmere';
    const admin = s.users[adminId];
    if (!admin) return { success: false, error: 'Admin bulunamadı.' };
    if (admin.username.toLowerCase() !== username.toLowerCase()) return { success: false, error: 'Hatalı kullanıcı adı.' };
    if (admin.passwordHash !== hashPassword(password)) return { success: false, error: 'Hatalı şifre.' };
    const updated = { ...admin, online: true, lastSeen: Date.now() };
    const next = { ...s, users: { ...s.users, [adminId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(updated);
    storeSession(adminId);
    currentUserIdRef.current = adminId;
    return { success: true };
  }, []);

  const autoLogin = useCallback((): boolean => {
    const uid = getStoredSession();
    if (!uid) return false;
    const s = stateRef.current;
    const user = s.users[uid];
    if (!user || user.isBanned) { clearSession(); return false; }
    const updated = { ...user, online: true, lastSeen: Date.now() };
    const next = { ...s, users: { ...s.users, [uid]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(updated);
    currentUserIdRef.current = uid;
    return true;
  }, []);

  const logout = useCallback((deleteAccount = false) => {
    const uid = getStoredSession();
    if (!uid) return;
    const s = stateRef.current;
    const user = s.users[uid];
    if (user) {
      const updated = { ...user, online: false, lastSeen: Date.now() };
      const newState = { ...s, users: { ...s.users, [uid]: updated } };
      if (deleteAccount) {
        const deviceId = getDeviceId();
        newState.deviceAccountCooldown = { ...newState.deviceAccountCooldown, [deviceId]: Date.now() };
        fbWriteDeviceCooldown(deviceId, Date.now());
      }
      fbWriteUser(updated);
      stateRef.current = newState; saveLocal(newState); setStateRaw(newState);
    }
    clearSession();
    currentUserIdRef.current = null;
  }, []);

  const markOnline = useCallback((uid: string) => { currentUserIdRef.current = uid; }, []);

  // ── Users ──────────────────────────────────────────────────────────────────
  const changeName = useCallback((userId: string, newName: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const user = s.users[userId];
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };
    if (user.role !== 'admin' && user.lastNameChangeAt) {
      const diff = Date.now() - user.lastNameChangeAt;
      if (diff < 30 * 86400000) {
        const rem = Math.ceil((30 * 86400000 - diff) / 86400000);
        return { success: false, error: `İsim değiştirme hakkı ${rem} gün sonra kullanılabilir.` };
      }
    }
    if (!newName.trim() || newName.trim().length < 2) return { success: false, error: 'İsim en az 2 karakter olmalıdır.' };
    const updated = { ...user, username: newName.trim(), lastNameChangeAt: user.role !== 'admin' ? Date.now() : user.lastNameChangeAt };
    const next = { ...s, users: { ...s.users, [userId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(updated);
    return { success: true };
  }, []);

  // Admin herhangi bir kullanıcının adını değiştirebilir (cooldown yok)
  const adminRenameUser = useCallback((userId: string, newName: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const user = s.users[userId];
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };
    if (!newName.trim() || newName.trim().length < 2) return { success: false, error: 'İsim en az 2 karakter olmalıdır.' };
    if (newName.trim().length > 32) return { success: false, error: 'İsim en fazla 32 karakter olabilir.' };
    const updated = { ...user, username: newName.trim() };
    const next = { ...s, users: { ...s.users, [userId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(updated);
    return { success: true };
  }, []);

  const updateProfile = useCallback(async (userId: string, updates: { avatarUrl?: string | null; avatarIsGif?: boolean; bannerUrl?: string | null; bannerIsGif?: boolean; bio?: string }): Promise<{ success: boolean; error?: string }> => {
    const s = stateRef.current;
    const user = s.users[userId];
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };
    // GIF artık desteklenmiyor — avatarIsGif/bannerIsGif her zaman false
    const updated = { ...user, ...updates, avatarIsGif: false, bannerIsGif: false };
    const next = { ...s, users: { ...s.users, [userId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(updated);
    return { success: true };
  }, []);

  const banUser = useCallback((userId: string) => {
    const s = stateRef.current;
    const newUsers = { ...s.users };
    delete newUsers[userId];
    const newDMs = Object.fromEntries(Object.entries(s.directMessages).filter(([, dm]) => dm.senderId !== userId && dm.receiverId !== userId));
    const newConvs = Object.fromEntries(Object.entries(s.dmConversations).filter(([, c]) => !c.participants.includes(userId)));
    const next = { ...s, users: newUsers, directMessages: newDMs, dmConversations: newConvs };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbDeleteUser(userId);
  }, []);

  const timeoutUser = useCallback((userId: string, minutes: number) => {
    const s = stateRef.current;
    const updated = { ...s.users[userId], timeoutUntil: Date.now() + minutes * 60000 };
    const next = { ...s, users: { ...s.users, [userId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(updated);
  }, []);

  const removeTimeout = useCallback((userId: string) => {
    const s = stateRef.current;
    const updated = { ...s.users[userId], timeoutUntil: null };
    const next = { ...s, users: { ...s.users, [userId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteUser(updated);
  }, []);

  // ── Servers ────────────────────────────────────────────────────────────────
  const createServer = useCallback((name: string): Server => {
    const server: Server = { id: 'server_' + generateId(), name, icon: null, createdAt: Date.now(), createdBy: 'admin_user_brookmere' };
    const s = stateRef.current;
    const next = { ...s, servers: { ...s.servers, [server.id]: server } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteServer(server);
    return server;
  }, []);

  const updateServer = useCallback((serverId: string, updates: Partial<Server>) => {
    const s = stateRef.current;
    const updated = { ...s.servers[serverId], ...updates };
    const next = { ...s, servers: { ...s.servers, [serverId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteServer(updated);
  }, []);

  const deleteServer = useCallback((serverId: string) => {
    const s = stateRef.current;
    const newServers = { ...s.servers }; delete newServers[serverId];
    const newChannels = Object.fromEntries(Object.entries(s.channels).filter(([, c]) => c.serverId !== serverId));
    const newCats = Object.fromEntries(Object.entries(s.categories).filter(([, c]) => c.serverId !== serverId));
    const next = { ...s, servers: newServers, channels: newChannels, categories: newCats };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbDeleteServer(serverId);
    Object.keys(s.channels).filter(id => s.channels[id].serverId === serverId).forEach(fbDeleteChannel);
    Object.keys(s.categories).filter(id => s.categories[id].serverId === serverId).forEach(fbDeleteCategory);
  }, []);

  // ── Categories ─────────────────────────────────────────────────────────────
  const createCategory = useCallback((serverId: string, name: string): Category => {
    const s = stateRef.current;
    const maxOrder = Math.max(-1, ...Object.values(s.categories).filter(c => c.serverId === serverId).map(c => c.order));
    const cat: Category = { id: 'cat_' + generateId(), serverId, name, order: maxOrder + 1 };
    const next = { ...s, categories: { ...s.categories, [cat.id]: cat } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteCategory(cat);
    return cat;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    const s = stateRef.current;
    const updated = { ...s.categories[id], ...updates };
    const next = { ...s, categories: { ...s.categories, [id]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteCategory(updated);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    const s = stateRef.current;
    const newCats = { ...s.categories }; delete newCats[id];
    const newChannels = { ...s.channels };
    Object.keys(newChannels).forEach(cid => { if (newChannels[cid].categoryId === id) newChannels[cid] = { ...newChannels[cid], categoryId: null }; });
    const next = { ...s, categories: newCats, channels: newChannels };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbDeleteCategory(id);
    Object.values(newChannels).filter(c => c.categoryId === null && s.channels[c.id]?.categoryId === id).forEach(c => fbWriteChannel(c));
  }, []);

  const reorderCategories = useCallback((updates: Array<{ id: string; order: number }>) => {
    const s = stateRef.current;
    const newCats = { ...s.categories };
    updates.forEach(({ id, order }) => { if (newCats[id]) newCats[id] = { ...newCats[id], order }; });
    const next = { ...s, categories: newCats };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    updates.forEach(({ id }) => fbWriteCategory(newCats[id]));
  }, []);

  // ── Channels ───────────────────────────────────────────────────────────────
  const createChannel = useCallback((serverId: string, categoryId: string | null, name: string): Channel => {
    const s = stateRef.current;
    const maxOrder = Math.max(-1, ...Object.values(s.channels).filter(c => c.serverId === serverId).map(c => c.order));
    const ch: Channel = { id: 'ch_' + generateId(), serverId, categoryId, name, order: maxOrder + 1, permission: 'everyone' };
    const next = { ...s, channels: { ...s.channels, [ch.id]: ch } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteChannel(ch);
    return ch;
  }, []);

  const updateChannel = useCallback((id: string, updates: Partial<Channel>) => {
    const s = stateRef.current;
    const updated = { ...s.channels[id], ...updates };
    const next = { ...s, channels: { ...s.channels, [id]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteChannel(updated);
  }, []);

  const updateChannels = useCallback((updates: Array<{ id: string; changes: Partial<Channel> }>) => {
    const s = stateRef.current;
    const newChannels = { ...s.channels };
    updates.forEach(({ id, changes }) => { if (newChannels[id]) newChannels[id] = { ...newChannels[id], ...changes }; });
    const next = { ...s, channels: newChannels };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    updates.forEach(({ id }) => fbWriteChannel(newChannels[id]));
  }, []);

  const deleteChannel = useCallback((id: string) => {
    const s = stateRef.current;
    const newChannels = { ...s.channels }; delete newChannels[id];
    const next = { ...s, channels: newChannels };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbDeleteChannel(id);
  }, []);

  // ── Messages ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback((channelId: string, userId: string, username: string, content: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const user = s.users[userId];
    const channel = s.channels[channelId];
    if (!user || !channel) return { success: false, error: 'Hata.' };
    if (user.isBanned) return { success: false, error: 'Banlandınız.' };
    if (user.timeoutUntil && Date.now() < user.timeoutUntil) {
      const rem = Math.ceil((user.timeoutUntil - Date.now()) / 60000);
      return { success: false, error: `Susturuldunuz. ${rem} dakika kaldı.` };
    }
    if (channel.permission === 'admin_only' && user.role !== 'admin') return { success: false, error: 'Bu kanalda mesaj gönderme izniniz yok.' };
    const msg: Message = { id: 'msg_' + generateId(), channelId, userId, username, content: content.trim(), createdAt: Date.now() };
    const next = { ...s, messages: { ...s.messages, [msg.id]: msg } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteMessage(msg); // Sadece bu mesaj Firebase'e yazılır — tüm state değil!
    return { success: true };
  }, []);

  const deleteMessage = useCallback((messageId: string, requesterId: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const msg = s.messages[messageId];
    const requester = s.users[requesterId];
    if (!msg) return { success: false, error: 'Mesaj bulunamadı.' };
    if (!requester) return { success: false, error: 'Yetkisiz.' };
    if (requester.role !== 'admin' && msg.userId !== requesterId) return { success: false, error: 'Bu mesajı silemezsiniz.' };
    const newMsgs = { ...s.messages }; delete newMsgs[messageId];
    const next = { ...s, messages: newMsgs };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbDeleteMessage(messageId);
    return { success: true };
  }, []);

  // ── DMs ────────────────────────────────────────────────────────────────────
  const getConvId = (a: string, b: string) => [a, b].sort().join('_');

  const sendDirectMessage = useCallback((fromId: string, toId: string, content: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const user = s.users[fromId];
    if (!user || user.isBanned) return { success: false, error: 'Yetkisiz.' };
    if (user.timeoutUntil && Date.now() < user.timeoutUntil) return { success: false, error: 'Susturuldunuz.' };
    const convId = getConvId(fromId, toId);
    const dm: DirectMessage = {
      id: 'dm_' + generateId(), conversationId: convId,
      senderId: fromId, receiverId: toId,
      content: content.trim(), createdAt: Date.now(),
    };
    // Unread count: karşı tarafın okunmamış sayısını artır
    const existingConv = s.dmConversations[convId];
    const unread = { ...(existingConv?.unread || {}) };
    unread[toId] = (unread[toId] || 0) + 1;
    const conv: DMConversation = {
      id: convId, participants: [fromId, toId] as [string, string],
      lastMessageAt: Date.now(), unread,
    };
    const next = { ...s, directMessages: { ...s.directMessages, [dm.id]: dm }, dmConversations: { ...s.dmConversations, [convId]: conv } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteDM(dm);
    fbWriteDMConv(conv);
    return { success: true };
  }, []);

  const markDMRead = useCallback((convId: string, userId: string) => {
    const s = stateRef.current;
    const conv = s.dmConversations[convId];
    if (!conv) return;
    const unread = { ...(conv.unread || {}), [userId]: 0 };
    const updated = { ...conv, unread };
    const next = { ...s, dmConversations: { ...s.dmConversations, [convId]: updated } };
    stateRef.current = next; saveLocal(next); setStateRaw(next);
    fbWriteDMConv(updated);
  }, []);

  const getOrCreateConversation = useCallback((uid1: string, uid2: string): string => {
    const convId = getConvId(uid1, uid2);
    const s = stateRef.current;
    if (!s.dmConversations[convId]) {
      const conv: DMConversation = { id: convId, participants: [uid1, uid2] as [string, string], lastMessageAt: Date.now(), unread: {} };
      const next = { ...s, dmConversations: { ...s.dmConversations, [convId]: conv } };
      stateRef.current = next; saveLocal(next); setStateRaw(next);
      fbWriteDMConv(conv);
    }
    return convId;
  }, []);

  return {
    state,
    getCurrentUser, register, loginAdmin, autoLogin, logout, markOnline,
    changeName, adminRenameUser, updateProfile, banUser, timeoutUser, removeTimeout,
    createServer, updateServer, deleteServer,
    createCategory, updateCategory, deleteCategory, reorderCategories,
    createChannel, updateChannel, updateChannels, deleteChannel,
    sendMessage, deleteMessage,
    sendDirectMessage, markDMRead, getOrCreateConversation,
  };
}
