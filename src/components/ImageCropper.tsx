import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  src: string;
  aspectRatio: number; // width/height — avatar: 1, banner: 2.5
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
  circular?: boolean;
}

export default function ImageCropper({ src, aspectRatio, onConfirm, onCancel, circular = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const PREVIEW_W = 320;
  const PREVIEW_H = Math.round(PREVIEW_W / aspectRatio);

  // Resmi yükle
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Başlangıç scale: resim tam sığsın
      const sw = PREVIEW_W / img.naturalWidth;
      const sh = PREVIEW_H / img.naturalHeight;
      const initScale = Math.max(sw, sh);
      setScale(initScale);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = src;
  }, [src]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;

    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = (PREVIEW_W - drawW) / 2 + offset.x;
    const y = (PREVIEW_H - drawH) / 2 + offset.y;

    ctx.drawImage(img, x, y, drawW, drawH);

    // Karartma overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    if (circular) {
      ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      const r = Math.min(PREVIEW_W, PREVIEW_H) / 2 - 2;
      ctx.arc(PREVIEW_W / 2, PREVIEW_H / 2, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sadece kenar karartma
      ctx.fillRect(0, 0, PREVIEW_W, 2);
      ctx.fillRect(0, PREVIEW_H - 2, PREVIEW_W, 2);
      ctx.fillRect(0, 0, 2, PREVIEW_H);
      ctx.fillRect(PREVIEW_W - 2, 0, 2, PREVIEW_H);
    }
    ctx.restore();

    // Çerçeve
    ctx.save();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    if (circular) {
      ctx.beginPath();
      const r = Math.min(PREVIEW_W, PREVIEW_H) / 2 - 2;
      ctx.arc(PREVIEW_W / 2, PREVIEW_H / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(1, 1, PREVIEW_W - 2, PREVIEW_H - 2);
    }
    ctx.restore();
  }, [scale, offset, imgLoaded, circular, PREVIEW_W, PREVIEW_H]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.max(0.1, Math.min(10, s - e.deltaY * 0.001)));
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    // Output canvas — yüksek çözünürlük
    const outW = circular ? 256 : 600;
    const outH = circular ? 256 : Math.round(600 / aspectRatio);
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    const scaleX = outW / PREVIEW_W;
    const scaleY = outH / PREVIEW_H;

    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = ((PREVIEW_W - drawW) / 2 + offset.x) * scaleX;
    const y = ((PREVIEW_H - drawH) / 2 + offset.y) * scaleY;

    if (circular) {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, x, y, drawW * scaleX, drawH * scaleY);
    onConfirm(out.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#2b2d31] rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="text-white font-bold text-base mb-1">Fotoğrafı Ayarla</h3>
        <p className="text-[#949ba4] text-xs mb-4">Sürükle • Kaydır ile zoom yap</p>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg mx-auto cursor-grab active:cursor-grabbing select-none"
          style={{ width: PREVIEW_W, height: PREVIEW_H, background: '#1e1f22' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>

        {/* Zoom slider */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[#949ba4] text-xs">−</span>
          <input
            type="range" min="0.1" max="5" step="0.01"
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-[#5865f2]"
          />
          <span className="text-[#949ba4] text-xs">+</span>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 bg-[#393c41] hover:bg-[#4e5058] text-white text-sm font-semibold rounded-md transition-colors"
          >İptal</button>
          <button onClick={handleConfirm}
            className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold rounded-md transition-colors"
          >Uygula</button>
        </div>
      </div>
    </div>
  );
}
