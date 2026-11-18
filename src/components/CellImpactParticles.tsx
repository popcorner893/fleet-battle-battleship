import React from 'react';
import { ShotResultType } from '../types';

interface CellImpactParticlesProps {
  result: ShotResultType;
  isSunk?: boolean;
}

export const CellImpactParticles: React.FC<CellImpactParticlesProps> = ({
  result,
  isSunk = false,
}) => {
  const isWater = result === 'miss';
  const isFire = result === 'hit' || result === 'sunk';

  // 12 particles for water splash in 360 degree directions
  const waterDroplets = Array.from({ length: 14 }).map((_, i) => {
    const angle = (i / 14) * Math.PI * 2 + (i % 2 === 0 ? 0.1 : -0.1);
    const dist = 14 + (i % 3) * 8;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist * 0.7 - 6; // upward bias
    const delay = (i % 4) * 0.03;
    const size = 3 + (i % 3);

    return { id: i, x, y, delay, size };
  });

  // 18 fiery spark particles for direct hit
  const fireSparks = Array.from({ length: isSunk ? 24 : 16 }).map((_, i) => {
    const total = isSunk ? 24 : 16;
    const angle = (i / total) * Math.PI * 2;
    const dist = 18 + (i % 4) * 9;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const delay = (i % 3) * 0.02;
    const size = 3 + (i % 3) * 1.5;
    const colors = ['#fef08a', '#f59e0b', '#ef4444', '#dc2626'];
    const color = colors[i % colors.length];

    return { id: i, x, y, delay, size, color };
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-visible select-none"
    >
      {/* WATER MISS SPLASH EFFECT */}
      {isWater && (
        <div className="relative flex items-center justify-center w-0 h-0 overflow-visible">
          {/* Expanding shockwave water ripple rings */}
          <span
            className="absolute rounded-full border-2 border-sky-300 animate-water-shockwave"
            style={{ width: '44px', height: '44px' }}
          />
          <span
            className="absolute rounded-full border border-white animate-water-shockwave"
            style={{ width: '28px', height: '28px', animationDelay: '0.08s' }}
          />

          {/* Central water plume flash */}
          <span className="absolute w-4 h-4 rounded-full bg-sky-300/80 animate-water-plume" />

          {/* Radiating water droplets */}
          {waterDroplets.map((d) => (
            <span
              key={d.id}
              className="absolute rounded-full bg-sky-200 animate-water-droplet shadow-sm shadow-cyan-500/50"
              style={
                {
                  width: `${d.size}px`,
                  height: `${d.size}px`,
                  '--tx': `${d.x}px`,
                  '--ty': `${d.y}px`,
                  animationDelay: `${d.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* FIRE DIRECT HIT / SUNK EFFECT */}
      {isFire && (
        <div className="relative flex items-center justify-center w-0 h-0 overflow-visible">
          {/* Fiery detonation flash shockwave */}
          <span
            className={`absolute rounded-full ${
              isSunk ? 'border-4 border-rose-500 bg-amber-400/30' : 'border-2 border-amber-400 bg-orange-500/30'
            } animate-fire-shockwave`}
            style={{ width: isSunk ? '68px' : '52px', height: isSunk ? '68px' : '52px' }}
          />

          {/* Secondary bright core burst */}
          <span
            className="absolute rounded-full bg-amber-200 shadow-lg shadow-orange-500 animate-fire-core"
            style={{ width: isSunk ? '22px' : '16px', height: isSunk ? '22px' : '16px' }}
          />

          {/* Radiating sparks & burning embers */}
          {fireSparks.map((s) => (
            <span
              key={s.id}
              className="absolute rounded-full animate-fire-spark shadow-sm"
              style={
                {
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  backgroundColor: s.color,
                  boxShadow: `0 0 6px ${s.color}`,
                  '--tx': `${s.x}px`,
                  '--ty': `${s.y}px`,
                  animationDelay: `${s.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}

          {/* Rising smoke puffs */}
          <span
            className="absolute rounded-full bg-slate-600/70 animate-smoke-puff"
            style={{ width: '16px', height: '16px', '--sx': '-6px', '--sy': '-22px' } as React.CSSProperties}
          />
          <span
            className="absolute rounded-full bg-slate-500/60 animate-smoke-puff"
            style={{ width: '14px', height: '14px', '--sx': '8px', '--sy': '-26px', animationDelay: '0.08s' } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
};
