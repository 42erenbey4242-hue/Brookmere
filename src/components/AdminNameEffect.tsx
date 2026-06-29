/**
 * AdminNameEffect — Admin ismi için kırmızı-siyah akan renk efekti
 * Rol admin ise her zaman gösterilir, isim değişse bile çalışır
 */
import React, { useEffect, useRef } from 'react';

interface Props {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AdminNameEffect({ name, className = '', style }: Props) {
  return (
    <>
      <style>{`
        @keyframes adminFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .admin-name-effect {
          background: linear-gradient(90deg, #ff0000, #cc0000, #1a1a1a, #ff3333, #8b0000, #ff0000);
          background-size: 300% 300%;
          animation: adminFlow 2.5s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
          display: inline;
        }
      `}</style>
      <span className={`admin-name-effect ${className}`} style={style}>
        {name}
      </span>
    </>
  );
}
