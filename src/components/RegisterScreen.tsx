import React, { useState } from 'react';

interface Props {
  onRegister: (username: string, password: string) => { success: boolean; error?: string };
  onAdminLogin: (username: string, password: string) => { success: boolean; error?: string };
  deviceCooldownDays?: number;
}

export default function RegisterScreen({ onRegister, onAdminLogin, deviceCooldownDays }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Lütfen bir isim girin.');
      return;
    }
    if (!password.trim()) {
      setError('Lütfen bir şifre girin.');
      return;
    }
    const result = onRegister(username, password);
    if (!result.success) {
      setError(result.error || 'Bir hata oluştu.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = onAdminLogin(adminUsername, adminPassword);
    if (!result.success) {
      setError(result.error || 'Hatalı giriş bilgileri.');
    }
  };

  return (
    <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#5865f2] flex items-center justify-center shadow-2xl">
            <span className="text-white text-4xl font-bold">B</span>
          </div>
        </div>

        <div className="bg-[#2b2d31] rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-[#1e1f22]">
            <button
              onClick={() => { setIsAdminMode(false); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${!isAdminMode ? 'text-white border-b-2 border-[#5865f2]' : 'text-[#949ba4] hover:text-white'}`}
            >
              Vatandaş Kaydı
            </button>
            <button
              onClick={() => { setIsAdminMode(true); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${isAdminMode ? 'text-white border-b-2 border-[#5865f2]' : 'text-[#949ba4] hover:text-white'}`}
            >
              Admin Girişi
            </button>
          </div>

          <div className="p-8">
            {!isAdminMode ? (
              <>
                <h1 className="text-white text-2xl font-bold text-center mb-2">
                  Kimliğini Oluşturalım Sayın Brookmere Vatandaşı!
                </h1>

                {deviceCooldownDays && deviceCooldownDays > 0 ? (
                  <div className="mt-4 p-4 bg-[#f23f43]/20 border border-[#f23f43]/40 rounded-lg text-[#f23f43] text-sm text-center">
                    Hesap değiştirme bekleme süresi: <strong>{deviceCooldownDays} gün</strong> kaldı.
                    <br />Yeni hesap oluşturamazsınız.
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">
                        İsim <span className="text-[#f23f43]">*</span>
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md border border-[#1e1f22] focus:outline-none focus:border-[#5865f2] transition-colors"
                        placeholder="Ahmet Yılmaz"
                        maxLength={32}
                      />
                      <p className="mt-1.5 text-[10px] text-[#f23f43] font-semibold">
                        ⚠️ Uygunsuz İsimler Koyanlar Cezalandırılacaktır!
                      </p>
                      <p className="mt-1 text-[10px] text-[#949ba4]">
                        <strong>Bilgilendirme:</strong> Yazdığınız isim sizin vatandaşlık isminiz olacaktır. Bu nedenle uygun ve gerçekçi isimler kullanınız. Örnek: Ahmet Yılmaz
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">
                        Şifre <span className="text-[#f23f43]">*</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md border border-[#1e1f22] focus:outline-none focus:border-[#5865f2] transition-colors"
                        placeholder="••••••••"
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-[#f23f43]/20 border border-[#f23f43]/40 rounded-md text-[#f23f43] text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-3 rounded-md transition-colors mt-2"
                    >
                      Brookmere'ye Katıl
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <h1 className="text-white text-2xl font-bold text-center mb-2">
                  Admin Girişi
                </h1>
                <p className="text-[#949ba4] text-sm text-center mb-6">Yönetici hesabıyla giriş yapın</p>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">
                      Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md border border-[#1e1f22] focus:outline-none focus:border-[#5865f2] transition-colors"
                      placeholder="Admin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">
                      Şifre
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-md border border-[#1e1f22] focus:outline-none focus:border-[#5865f2] transition-colors"
                      placeholder="••••••••"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-[#f23f43]/20 border border-[#f23f43]/40 rounded-md text-[#f23f43] text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-3 rounded-md transition-colors"
                  >
                    Giriş Yap
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[#949ba4] text-xs mt-4">
          Brookmere İletişim Platformu
        </p>
      </div>
    </div>
  );
}
