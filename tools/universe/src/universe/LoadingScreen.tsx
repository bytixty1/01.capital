import { useEffect, useState } from 'react';

interface Props {
  progress: number; // 0..1
  done: boolean;
}

export function LoadingScreen({ progress, done }: Props) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setGone(true), 900);
    return () => window.clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div className={`loading-screen${done ? ' loading-screen--done' : ''}`}>
      <div className="loading-logo">01</div>
      <div className="loading-text">Initializing ZEROCAPS Universe...</div>
      <div className="loading-bar">
        <div
          className="loading-bar-fill"
          style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
        />
      </div>
    </div>
  );
}
