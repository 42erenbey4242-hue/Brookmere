/**
 * store.ts — Brookmere v4
 *
 * Mimari değişiklik:
 * - Artık tüm state tek bir Firebase yoluna yazılmıyor.
 * - Her varlık (user, message, channel, server, dm...) kendi path'ine yazılıyor.
 * - Bu sayede race condition ortadan kalkıyor ve gerçek zamanlı senkronizasyon düzgün çalışıyor.
 */

import { AppState, User, Server, Category, Channel, Message, DirectMessage, DMConversation } from './types';
import { ref, onValue, set, remove, get, DatabaseReference } from 'firebase/database';
import { initFirebase } from './firebase';

// ── Local cache ───────────────────────────────────────────────────────────────
const LOCAL_KEY = 'brookmere_data_v4';
const BC = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('brookmere_v4') : null;

// ── Firebase ──────────────────────────────────────────────────────────────────
let db: ReturnType<typeof initFirebase>['db'] = null;
let fbEnabled = false;
const readyCallbacks: Array<() => void> = [];

export function onFirebaseReady(cb: () => void) {
  if (fbEnabled && db) cb();
  else readyCallbacks.push(cb);
}

export function setupFirebase(config: {
  apiKey: string; authDomain: string; databaseURL: string;
  projectId: string; storageBucket: string; messagingSenderId: string; appId: string;
}) {
  try {
    const result = initFirebase(config);
    if (result.db) {
      db = result.db;
      fbEnabled = true;
      readyCallbacks.forEach(cb => cb());
      readyCallbacks.length = 0;
      return true;
    }
  } catch (e) { console.warn('Firebase setup failed:', e); }
  return false;
}

export function isFirebaseEnabled() { return fbEnabled && db !== null; }

function fbRef(path: string): DatabaseReference {
  return ref(db as Parameters<typeof ref>[0], path);
}

// ── Atomic Firebase writers ───────────────────────────────────────────────────
// Her varlık kendi path'ine yazılır — tüm state'i üzerine yazmak yok!

// Firebase null değerleri siliyor — null alanları explicit olarak saklamak için
// string placeholder kullanıyoruz, okurken geri çeviriyoruz
const FB_NULL = '__NULL__';

function toFirebaseUser(user: User): Record<string, unknown> {
  return {
    ...user,
    // null string'leri Firebase'e güvenle yazılabilir placeholder ile sakla
    avatarUrl: user.avatarUrl === null ? FB_NULL : (user.avatarUrl ?? FB_NULL),
    bannerUrl: user.bannerUrl === null ? FB_NULL : (user.bannerUrl ?? FB_NULL),
    avatarIsGif: user.avatarIsGif ?? false,
    bannerIsGif: user.bannerIsGif ?? false,
    bio: user.bio ?? '',
  };
}

function fromFirebaseUser(raw: Record<string, unknown>): User {
  const resolveUrl = (val: unknown): string | null => {
    if (val === FB_NULL || val === '__GIF_IN_FIREBASE__' || val === undefined || val === null) return null;
    return val as string;
  };
  return {
    ...(raw as User),
    avatarUrl: resolveUrl(raw.avatarUrl),
    bannerUrl: resolveUrl(raw.bannerUrl),
    avatarIsGif: (raw.avatarIsGif as boolean) ?? false,
    bannerIsGif: (raw.bannerIsGif as boolean) ?? false,
    bio: (raw.bio as string) ?? '',
  };
}

export function fbWriteUser(user: User) {
  if (!db) return;
  set(fbRef(`brookmere/users/${user.id}`), toFirebaseUser(user)).catch(console.warn);
}

export function fbWriteServer(server: Server) {
  if (!db) return;
  set(fbRef(`brookmere/servers/${server.id}`), server).catch(console.warn);
}

export function fbWriteCategory(cat: Category) {
  if (!db) return;
  set(fbRef(`brookmere/categories/${cat.id}`), cat).catch(console.warn);
}

export function fbWriteChannel(ch: Channel) {
  if (!db) return;
  set(fbRef(`brookmere/channels/${ch.id}`), ch).catch(console.warn);
}

export function fbDeleteChannel(id: string) {
  if (!db) return;
  remove(fbRef(`brookmere/channels/${id}`)).catch(console.warn);
}

export function fbDeleteCategory(id: string) {
  if (!db) return;
  remove(fbRef(`brookmere/categories/${id}`)).catch(console.warn);
}

export function fbWriteMessage(msg: Message) {
  if (!db) return;
  set(fbRef(`brookmere/messages/${msg.id}`), msg).catch(console.warn);
}

export function fbDeleteMessage(id: string) {
  if (!db) return;
  remove(fbRef(`brookmere/messages/${id}`)).catch(console.warn);
}

export function fbWriteDM(dm: DirectMessage) {
  if (!db) return;
  set(fbRef(`brookmere/directMessages/${dm.id}`), dm).catch(console.warn);
}

export function fbWriteDMConv(conv: DMConversation) {
  if (!db) return;
  set(fbRef(`brookmere/dmConversations/${conv.id}`), conv).catch(console.warn);
}

export function fbDeleteServer(id: string) {
  if (!db) return;
  remove(fbRef(`brookmere/servers/${id}`)).catch(console.warn);
}

export function fbDeleteUser(id: string) {
  if (!db) return;
  remove(fbRef(`brookmere/users/${id}`)).catch(console.warn);
}

export function fbWriteDeviceCooldown(deviceId: string, ts: number) {
  if (!db) return;
  set(fbRef(`brookmere/deviceAccountCooldown/${deviceId}`), ts).catch(console.warn);
}

// ── Full state listener ───────────────────────────────────────────────────────
// Tüm brookmere path'ini dinle — her değişiklik tüm istemcilere yansır
export function subscribeToFirebase(callback: (state: AppState) => void): () => void {
  if (!db) return () => {};
  const r = fbRef('brookmere');
  const unsub = onValue(r, (snapshot) => {
    if (!snapshot.exists()) return;
    const raw = snapshot.val();
    const state = ensureDefaults(raw as Partial<AppState>);
    // Yerel cache güncelle
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch {}
    callback(state);
  }, (err) => console.warn('Firebase listener error:', err));
  return unsub;
}

// İlk yükleme: Firebase'den al, yoksa local'i Firebase'e yaz
export async function loadFromFirebase(): Promise<AppState | null> {
  if (!db) return null;
  try {
    const snapshot = await get(fbRef('brookmere'));
    if (snapshot.exists()) {
      const state = ensureDefaults(snapshot.val() as Partial<AppState>);
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch {}
      return state;
    }
    // Firebase boş — local'i yükle ve yaz
    const local = loadLocalState();
    await set(fbRef('brookmere'), local);
    return local;
  } catch (e) {
    console.warn('Firebase load failed:', e);
    return null;
  }
}

// ── Local state ───────────────────────────────────────────────────────────────
export function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      const s = getDefaultState();
      localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw);
    const state = ensureDefaults(parsed);
    // GIF placeholder'larını null'a çevir — Firebase'den gelene kadar boş göster
    Object.keys(state.users).forEach(uid => {
      const u = state.users[uid];
      if (u.avatarUrl === '__GIF_IN_FIREBASE__') state.users[uid].avatarUrl = null;
      if (u.bannerUrl === '__GIF_IN_FIREBASE__') state.users[uid].bannerUrl = null;
    });
    return state;
  } catch {
    const s = getDefaultState();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
    return s;
  }
}

// GIF base64 verileri localStorage'ı doldurabileceğinden (5MB limit),
// localStorage'a yazarken GIF base64'lerini kırpıyoruz.
// Gerçek veri Firebase'den gelir; bu sadece offline/hız cache'i.
function stripGifsForLocalStorage(state: AppState): AppState {
  const users = { ...state.users };
  Object.keys(users).forEach(uid => {
    const u = users[uid];
    const needsStrip =
      (u.avatarIsGif && u.avatarUrl && u.avatarUrl.startsWith('data:')) ||
      (u.bannerIsGif && u.bannerUrl && u.bannerUrl.startsWith('data:'));
    if (needsStrip) {
      users[uid] = {
        ...u,
        avatarUrl: u.avatarIsGif && u.avatarUrl?.startsWith('data:') ? '__GIF_IN_FIREBASE__' : u.avatarUrl,
        bannerUrl: u.bannerIsGif && u.bannerUrl?.startsWith('data:') ? '__GIF_IN_FIREBASE__' : u.bannerUrl,
      };
    }
  });
  return { ...state, users };
}

export function saveLocal(state: AppState) {
  try {
    const stripped = stripGifsForLocalStorage(state);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stripped));
    BC?.postMessage({ type: 'STATE_UPDATE', state }); // BroadcastChannel'a orijinal veriyi gönder
  } catch (e) {
    // localStorage dolu olabilir — sessizce atla
    console.warn('localStorage write failed (possibly full):', e);
  }
}

export function onLocalChange(cb: (s: AppState) => void): () => void {
  if (!BC) return () => {};
  const h = (e: MessageEvent) => {
    if (e.data?.type === 'STATE_UPDATE') cb(e.data.state as AppState);
  };
  BC.addEventListener('message', h);
  return () => BC.removeEventListener('message', h);
}

// ── Defaults ──────────────────────────────────────────────────────────────────
export function hashPassword(password: string): string {
  let hash = 0;
  const str = password + '_brookmere_salt_v2';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

const ADMIN_ID = 'admin_user_brookmere';

function getDefaultState(): AppState {
  return {
    users: {
      [ADMIN_ID]: {
        id: ADMIN_ID, username: 'Admin',
        passwordHash: hashPassword('6668'), role: 'admin',
        createdAt: 1704067200000, lastNameChangeAt: null,
        lastAccountSwitchAt: null, isBanned: false,
        online: false, lastSeen: Date.now(),
        avatarUrl: null, bannerUrl: null, bio: '',
      }
    },
    sessions: {}, servers: {}, categories: {}, channels: {},
    messages: {}, directMessages: {}, dmConversations: {},
    deviceAccountCooldown: {},
  };
}

function ensureDefaults(raw: Partial<AppState>): AppState {
  // Firebase'den gelen user verilerini normalize et
  const rawUsers = raw.users || {};
  const users: Record<string, User> = {};
  Object.keys(rawUsers).forEach(uid => {
    users[uid] = fromFirebaseUser(rawUsers[uid] as Record<string, unknown>);
  });

  const s: AppState = {
    users,
    sessions: raw.sessions || {},
    servers: raw.servers || {},
    categories: raw.categories || {},
    channels: raw.channels || {},
    messages: raw.messages || {},
    directMessages: raw.directMessages || {},
    dmConversations: raw.dmConversations || {},
    deviceAccountCooldown: raw.deviceAccountCooldown || {},
  };
  // Admin her zaman var olmalı — ama mevcut profil/isim bilgilerini koru
  if (!s.users[ADMIN_ID]) {
    s.users[ADMIN_ID] = getDefaultState().users[ADMIN_ID];
  } else {
    // Sadece şifre ve rol override edilir, profil bilgileri korunur
    s.users[ADMIN_ID] = {
      ...s.users[ADMIN_ID],
      passwordHash: hashPassword('6668'),
      role: 'admin',
      avatarUrl: s.users[ADMIN_ID].avatarUrl ?? null,
      bannerUrl: s.users[ADMIN_ID].bannerUrl ?? null,
      avatarIsGif: s.users[ADMIN_ID].avatarIsGif ?? false,
      bannerIsGif: s.users[ADMIN_ID].bannerIsGif ?? false,
      bio: s.users[ADMIN_ID].bio ?? '',
    };
  }
  // Tüm kullanıcılar için eksik profil alanlarını normalize et
  Object.keys(s.users).forEach(uid => {
    if (uid === ADMIN_ID) return;
    const u = s.users[uid];
    s.users[uid] = {
      ...u,
      avatarUrl: u.avatarUrl ?? null,
      bannerUrl: u.bannerUrl ?? null,
      avatarIsGif: u.avatarIsGif ?? false,
      bannerIsGif: u.bannerIsGif ?? false,
      bio: u.bio ?? '',
    };
  });
  return s;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function getDeviceId(): string {
  let id = localStorage.getItem('brookmere_device_id');
  if (!id) { id = 'device_' + generateId(); localStorage.setItem('brookmere_device_id', id); }
  return id;
}

const SESSION_KEY = () => 'brookmere_session_' + getDeviceId();
export const getStoredSession = () => localStorage.getItem(SESSION_KEY());
export const storeSession = (uid: string) => localStorage.setItem(SESSION_KEY(), uid);
export const clearSession = () => localStorage.removeItem(SESSION_KEY());
