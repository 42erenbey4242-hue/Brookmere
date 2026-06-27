import React, { useState } from 'react';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface Props {
  onSetup: (config: FirebaseConfig) => void;
  onSkip: () => void;
  isConfigured: boolean;
}

const FB_CONFIG_KEY = 'brookmere_firebase_config';

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(FB_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirebaseConfig;
  } catch {
    return null;
  }
}

export function storeFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(FB_CONFIG_KEY, JSON.stringify(config));
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(FB_CONFIG_KEY);
}

export default function FirebaseSetup({ onSetup, onSkip, isConfigured }: Props) {
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });
  const [error, setError] = useState('');
  const [pasteMode, setPasteMode] = useState(true);
  const [jsonInput, setJsonInput] = useState('');

  const handleParse = () => {
    try {
      // Try to extract config from pasted text
      let parsed: Partial<FirebaseConfig> = {};
      
      // Try JSON parse
      try {
        const obj = JSON.parse(jsonInput);
        parsed = obj;
      } catch {
        // Try to extract key-value pairs
        const patterns: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        patterns.forEach(key => {
          const match = jsonInput.match(new RegExp(`"?${key}"?\\s*:\\s*"([^"]+)"`));
          if (match) {
            parsed[key] = match[1];
          }
        });
      }
      
      if (!parsed.apiKey || !parsed.databaseURL) {
        setError('Geçersiz yapılandırma. apiKey ve databaseURL gereklidir.');
        return;
      }
      
      setConfig(prev => ({ ...prev, ...parsed }));
      setError('');
      setPasteMode(false);
    } catch {
      setError('Yapılandırma ayrıştırılamadı. Lütfen geçerli bir JSON yapıştırın.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.apiKey || !config.databaseURL) {
      setError('API Key ve Database URL zorunludur.');
      return;
    }
    storeFirebaseConfig(config);
    onSetup(config);
  };

  if (isConfigured) return null;

  return (
    <div className="fixed inset-0 bg-[#1e1f22]/95 z-[100] flex items-center justify-center p-4 backdrop-blur">
      <div className="bg-[#2b2d31] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#1e1f22]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f5a623] flex items-center justify-center">
              <span className="text-xl">🔥</span>
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">Firebase Bağlantısı Kur</h2>
              <p className="text-[#949ba4] text-sm">Gerçek zamanlı çok kullanıcılı deneyim için gereklidir</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Why Firebase */}
          <div className="bg-[#5865f2]/10 border border-[#5865f2]/30 rounded-lg p-4 mb-6">
            <h3 className="text-[#5865f2] font-semibold mb-2">🌐 Neden Firebase?</h3>
            <p className="text-[#b5bac1] text-sm">
              Firebase olmadan bu platform <strong className="text-white">sadece tek cihazda</strong> çalışır.
              Firebase ile arkadaşlarınız farklı cihazlardan girdiğinde Admin'in kurduğu sunucuları görebilir,
              mesajlar gerçek zamanlı ulaşır.
            </p>
          </div>

          {/* Setup steps */}
          <div className="bg-[#1e1f22] rounded-lg p-4 mb-6 space-y-2">
            <h3 className="text-white font-semibold mb-3">📋 Kurulum Adımları (2 dakika):</h3>
            <div className="space-y-2 text-sm text-[#b5bac1]">
              <p>1. <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-[#5865f2] hover:underline">console.firebase.google.com</a> adresine gidin</p>
              <p>2. "Proje Ekle" → proje ismi girin → oluşturun</p>
              <p>3. Sol menüden <strong className="text-white">Realtime Database</strong> → "Veritabanı Oluştur" → <strong className="text-white">Test modu</strong></p>
              <p>4. Sol menüden <strong className="text-white">Proje Ayarları</strong> (⚙️) → "Uygulamalarınız" bölümünde <strong className="text-white">Web uygulaması ekle</strong> (&lt;/&gt;)</p>
              <p>5. <strong className="text-white">firebaseConfig</strong> nesnesini kopyalayıp aşağıya yapıştırın</p>
            </div>
          </div>

          {/* Input */}
          {pasteMode ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider">
                Firebase Config Yapıştır
              </label>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-3 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-xs font-mono h-40 resize-none"
                placeholder={`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "proje.firebaseapp.com",
  databaseURL: "https://proje-default-rtdb.firebaseio.com",
  projectId: "proje",
  storageBucket: "proje.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};`}
              />
              {error && <p className="text-[#f23f43] text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleParse}
                  disabled={!jsonInput.trim()}
                  className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white py-2.5 rounded-md font-semibold transition-colors disabled:opacity-50"
                >
                  Config'i Ayrıştır
                </button>
                <button
                  onClick={() => setPasteMode(false)}
                  className="px-4 py-2.5 text-[#949ba4] hover:text-white text-sm transition-colors"
                >
                  Manuel Gir
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {([
                ['apiKey', 'API Key', 'AIzaSy...'],
                ['authDomain', 'Auth Domain', 'proje.firebaseapp.com'],
                ['databaseURL', 'Database URL', 'https://proje-default-rtdb.firebaseio.com'],
                ['projectId', 'Project ID', 'proje'],
                ['storageBucket', 'Storage Bucket', 'proje.appspot.com'],
                ['messagingSenderId', 'Messaging Sender ID', '123456789'],
                ['appId', 'App ID', '1:123456789:web:abc123'],
              ] as const).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-1">
                    {label} {(key === 'apiKey' || key === 'databaseURL') && <span className="text-[#f23f43]">*</span>}
                  </label>
                  <input
                    type="text"
                    value={config[key]}
                    onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-sm font-mono"
                    placeholder={placeholder}
                  />
                </div>
              ))}

              {error && <p className="text-[#f23f43] text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasteMode(true)}
                  className="px-4 py-2.5 text-[#949ba4] hover:text-white text-sm transition-colors"
                >
                  ← Geri
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white py-2.5 rounded-md font-semibold transition-colors"
                >
                  🔥 Firebase'i Bağla
                </button>
              </div>
            </form>
          )}

          {/* Skip */}
          <div className="border-t border-[#35373c] mt-6 pt-4">
            <p className="text-[#949ba4] text-xs mb-3 text-center">
              Firebase kurulmadan platform sadece <strong className="text-white">bu tarayıcıda</strong> çalışır.
              Farklı cihazlardan erişilemez.
            </p>
            <button
              onClick={onSkip}
              className="w-full py-2 text-[#949ba4] hover:text-white text-sm transition-colors border border-[#35373c] rounded-md hover:border-[#949ba4]"
            >
              Şimdilik Atla (Tek cihaz modu)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
