/**
 * store.ts — Brookmere v5 (GIF → Imgur)
 *
 * GIF Stratejisi:
 * - GIF seçilince önce Imgur'a yüklenir → https://i.imgur.com/XXX.gif URL döner
 * - Firebase'e bu küçük URL yazılır (base64 değil)
 * - Herkes aynı URL'den GIF'i görür, reload'da kaybolmaz
 * - PNG/JPG → base64 olarak Firebase'e (küçük, sorunsuz)
 */

import { AppState, User, Server, Category, Channel, Message, DirectMessage, DMConversation } from './types';
import { ref, onValue, set, remove, get, DatabaseReference } from 'firebase/database';
import { initFirebase } from './firebase';

const LOCAL_KEY = 'brookmere_data_v5';
const BC = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('brookmere_v5') : null;

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

// ── Firebase null fix ─────────────────────────────────────────────────────────
const FB_NULL = '__NULL__';

function toFirebaseUser(user: User): Record<string, unknown> {
  return {
    ...user,
    avatarUrl: user.avatarUrl ?? FB_NULL,
    bannerUrl: user.bannerUrl ?? FB_NULL,
    avatarIsGif: user.avatarIsGif ?? false,
    bannerIsGif: user.bannerIsGif ?? false,
    bio: user.bio ?? '',
  };
}

function fromFirebaseUser(raw: Record<string, unknown>): User {
  const resolveUrl = (val: unknown): string | null => {
    if (!val || val === FB_NULL) return null;
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

// ── Atomic Firebase writers ───────────────────────────────────────────────────
export function fbWriteUser(user: User) {
  if (!db) return;
  // base64 data URL'leri Firebase'e yazma — Imgur URL veya null olmalı
  const safe: User = {
    ...user,
    avatarUrl: user.avatarUrl?.startsWith('data:') ? null : user.avatarUrl,
    bannerUrl: user.bannerUrl?.startsWith('data:') ? null : user.bannerUrl,
  };
  set(fbRef(`brookmere/users/${safe.id}`), toFirebaseUser(safe)).catch(console.warn);
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

// ── Firebase listener ─────────────────────────────────────────────────────────
export function subscribeToFirebase(callback: (state: AppState) => void): () => void {
  if (!db) return () => {};
  const unsub = onValue(fbRef('brookmere'), (snapshot) => {
    if (!snapshot.exists()) return;
    const state = ensureDefaults(snapshot.val() as Partial<AppState>);
    saveLocalRaw(state);
    callback(state);
  }, (err) => console.warn('Firebase listener error:', err));
  return unsub;
}

export async function loadFromFirebase(): Promise<AppState | null> {
  if (!db) return null;
  try {
    const snapshot = await get(fbRef('brookmere'));
    if (snapshot.exists()) {
      const state = ensureDefaults(snapshot.val() as Partial<AppState>);
      saveLocalRaw(state);
      return state;
    }
    const local = loadLocalState();
    await set(fbRef('brookmere'), local);
    return local;
  } catch (e) {
    console.warn('Firebase load failed:', e);
    return null;
  }
}

// ── Local state ───────────────────────────────────────────────────────────────
function saveLocalRaw(state: AppState) {
  try {
    // base64 data URL'leri localStorage'a yazma (5MB limit)
    // Imgur URL'leri (https://) küçük — sorunsuz
    const users: Record<string, User> = {};
    Object.keys(state.users).forEach(uid => {
      const u = state.users[uid];
      users[uid] = {
        ...u,
        avatarUrl: u.avatarUrl?.startsWith('data:') ? null : u.avatarUrl,
        bannerUrl: u.bannerUrl?.startsWith('data:') ? null : u.bannerUrl,
      };
    });
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...state, users }));
    BC?.postMessage({ type: 'STATE_UPDATE', state });
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

export function saveLocal(state: AppState) {
  saveLocalRaw(state);
}

export function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      const s = getDefaultState();
      saveLocalRaw(s);
      return s;
    }
    return ensureDefaults(JSON.parse(raw));
  } catch {
    const s = getDefaultState();
    saveLocalRaw(s);
    return s;
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
        avatarUrl: null, bannerUrl: null,
        avatarIsGif: false, bannerIsGif: false, bio: '',
      }
    },
    sessions: {}, servers: {}, categories: {}, channels: {},
    messages: {}, directMessages: {}, dmConversations: {},
    deviceAccountCooldown: {},
  };
}

function ensureDefaults(raw: Partial<AppState>): AppState {
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

  if (!s.users[ADMIN_ID]) {
    s.users[ADMIN_ID] = getDefaultState().users[ADMIN_ID];
  } else {
    s.users[ADMIN_ID] = {
      ...s.users[ADMIN_ID],
      passwordHash: hashPassword('6668'),
      role: 'admin',
    };
  }
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
