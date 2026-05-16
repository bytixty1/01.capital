'use client';

import dynamic from 'next/dynamic';

const FluidBg = dynamic(() => import('@/components/MetaballCanvas'), { ssr: false });

export function PageBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <FluidBg />
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-vignette" aria-hidden="true" />
      <style jsx global>{`
        .lp-grain { 
          position: fixed; inset: -50%; z-index: 1; pointer-events: none; opacity: .07; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          background-size: 240px 240px; animation: lp-grain 1.4s steps(6) infinite; 
        }
        @keyframes lp-grain { 
          0%{transform:translate(0,0)} 20%{transform:translate(-4%,2%)} 40%{transform:translate(3%,-3%)} 60%{transform:translate(-2%,4%)} 80%{transform:translate(4%,-2%)} 100%{transform:translate(0,0)} 
        }
        .lp-vignette { 
          position: fixed; inset: 0; z-index: 2; pointer-events: none; background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,.65) 100%); 
        }
      `}</style>
    </div>
  );
}
