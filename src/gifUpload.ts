/**
 * gifUpload.ts
 * GIF'leri Imgur'a anonim olarak yükle (ücretsiz, herkese açık URL döner)
 * Client ID: Imgur'un herkese açık demo client ID'si
 * Kendi Client ID'ni almak için: https://api.imgur.com/oauth2/addclient
 */

const IMGUR_CLIENT_ID = 'c9a6efb3d7932fd'; // Imgur public demo client ID

export async function uploadGifToImgur(base64DataUrl: string): Promise<string> {
  // data:image/gif;base64,XXXX → sadece base64 kısmı
  const base64 = base64DataUrl.split(',')[1];
  if (!base64) throw new Error('Geçersiz base64 verisi');

  const formData = new FormData();
  formData.append('image', base64);
  formData.append('type', 'base64');

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Imgur yükleme hatası: ${response.status} ${err}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error('Imgur yükleme başarısız');

  // https://i.imgur.com/XXXXX.gif formatında URL döner
  return data.data.link;
}
