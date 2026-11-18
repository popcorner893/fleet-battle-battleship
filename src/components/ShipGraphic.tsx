import React, { useId } from 'react';
import { ShipTypeId } from '../types';

interface ShipGraphicProps {
  type: ShipTypeId;
  length: number;
  orientation?: 'horizontal' | 'vertical';
  isSunk?: boolean;
  className?: string;
}

export const ShipGraphic: React.FC<ShipGraphicProps> = ({
  type,
  length,
  orientation = 'horizontal',
  isSunk = false,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const isVertical = orientation === 'vertical';

  const hullGradId = `sg-hull-${uid}`;
  const deckGradId = `sg-deck-${uid}`;
  const teakGradId = `sg-teak-${uid}`;
  const superGradId = `sg-super-${uid}`;
  const turretGradId = `sg-turret-${uid}`;

  const viewWidth = length * 100;

  const renderDefs = () => (
    <defs>
      <linearGradient id={hullGradId} x1="0%" y1="0%" x2="0%" y2="100%">
        {isSunk ? (
          <>
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="50%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="20%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="80%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </>
        )}
      </linearGradient>

      <linearGradient id={deckGradId} x1="0%" y1="0%" x2="0%" y2="100%">
        {isSunk ? (
          <>
            <stop offset="0%" stopColor="#1c1917" />
            <stop offset="100%" stopColor="#0c0a09" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </>
        )}
      </linearGradient>

      <linearGradient id={teakGradId} x1="0%" y1="0%" x2="0%" y2="100%">
        {isSunk ? (
          <>
            <stop offset="0%" stopColor="#292524" />
            <stop offset="100%" stopColor="#1c1917" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#a16207" />
            <stop offset="50%" stopColor="#854d0e" />
            <stop offset="100%" stopColor="#713f12" />
          </>
        )}
      </linearGradient>

      <linearGradient id={superGradId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isSunk ? '#3f3f46' : '#cbd5e1'} />
        <stop offset="55%" stopColor={isSunk ? '#27272a' : '#64748b'} />
        <stop offset="100%" stopColor={isSunk ? '#18181b' : '#334155'} />
      </linearGradient>

      <radialGradient id={turretGradId} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor={isSunk ? '#52525b' : '#e2e8f0'} />
        <stop offset="55%" stopColor={isSunk ? '#27272a' : '#64748b'} />
        <stop offset="100%" stopColor={isSunk ? '#09090b' : '#1e293b'} />
      </radialGradient>
    </defs>
  );

  const hullStroke = isSunk ? '#991b1b' : '#1e293b';

  const renderArtwork = () => {
    switch (type) {
      case 'carrier':
        return (
          <g>
            <path
              d="M 14 14 L 446 7 L 494 50 L 446 93 L 14 86 L 6 50 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.5"
            />
            <path
              d="M 20 18 L 130 14 L 140 6 L 235 6 L 245 14 L 442 12 L 484 50 L 442 88 L 310 88 L 300 94 L 190 94 L 180 86 L 20 82 Z"
              fill={`url(#${deckGradId})`}
              stroke={isSunk ? '#7f1d1d' : '#475569'}
              strokeWidth="2"
            />
            <path d="M 26 62 L 420 20 L 434 42 L 26 80 Z" fill="#0f172a" opacity="0.45" />
            <line x1="28" y1="62" x2="420" y2="21" stroke="#f8fafc" strokeWidth="1.5" opacity="0.75" />
            <line x1="28" y1="79" x2="432" y2="41" stroke="#f8fafc" strokeWidth="1.5" opacity="0.75" />
            <line
              x1="32"
              y1="71"
              x2="425"
              y2="31"
              stroke={isSunk ? '#ef4444' : '#facc15'}
              strokeWidth="2.2"
              strokeDasharray="12 8"
            />
            <line x1="335" y1="42" x2="462" y2="42" stroke="#cbd5e1" strokeWidth="2" opacity="0.75" />
            <line x1="345" y1="62" x2="458" y2="56" stroke="#cbd5e1" strokeWidth="2" opacity="0.75" />
            {[
              { x: 152, y: 18, rot: 12 },
              { x: 196, y: 18, rot: 12 },
              { x: 245, y: 74, rot: -15 },
              { x: 352, y: 42, rot: 0 },
            ].map((jet, i) => (
              <g key={i} transform={`translate(${jet.x}, ${jet.y}) rotate(${jet.rot})`}>
                <polygon
                  points="-13,-7 -9,-2 -4,-11 4,-2 16,0 4,2 -4,11 -9,2 -13,7 -10,0"
                  fill="#94a3b8"
                  stroke="#334155"
                  strokeWidth="0.8"
                />
                <ellipse cx="6" cy="0" rx="3.5" ry="1.4" fill="#38bdf8" />
              </g>
            ))}
            <g transform="translate(290, 7)">
              <polygon
                points="0,4 74,4 82,11 74,20 0,20"
                fill={`url(#${superGradId})`}
                stroke="#1e293b"
                strokeWidth="1.8"
              />
              <rect x="12" y="6" width="46" height="12" rx="2" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="48" y="7" width="8" height="10" rx="1" fill="#0284c7" />
              <circle cx="38" cy="12" r="4.5" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.2" />
            </g>
            <text
              x="448"
              y="55"
              fill="#f8fafc"
              fontSize="16"
              fontWeight="800"
              fontFamily="monospace"
              textAnchor="middle"
              opacity="0.85"
            >
              68
            </text>
          </g>
        );

      case 'battleship':
        return (
          <g>
            <path
              d="M 14 26 L 80 14 L 348 12 L 394 50 L 348 88 L 80 86 L 14 74 L 5 50 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.8"
            />
            <path
              d="M 22 30 L 82 20 L 340 18 L 380 50 L 340 82 L 82 80 L 22 70 Z"
              fill={`url(#${teakGradId})`}
              stroke={isSunk ? '#451a03' : '#475569'}
              strokeWidth="1.8"
            />
            <path d="M 340 18 L 380 50 L 340 82 L 332 50 Z" fill={`url(#${deckGradId})`} />
            <polygon
              points="105,24 235,24 248,50 235,76 105,76 95,50"
              fill={`url(#${deckGradId})`}
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <ellipse cx="132" cy="50" rx="14" ry="10" fill={`url(#${superGradId})`} stroke="#1e293b" strokeWidth="1.5" />
            <ellipse cx="132" cy="50" rx="8" ry="5" fill="#09090b" />
            <ellipse cx="168" cy="50" rx="15" ry="11" fill={`url(#${superGradId})`} stroke="#1e293b" strokeWidth="1.5" />
            <ellipse cx="168" cy="50" rx="9" ry="6" fill="#09090b" />
            <polygon
              points="192,31 228,34 236,50 228,66 192,69"
              fill={`url(#${superGradId})`}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <circle cx="210" cy="50" r="7" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Turret #1 */}
            <g transform="translate(310, 50)">
              <line x1="10" y1="-9" x2="54" y2="-9" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
              <line x1="12" y1="0" x2="58" y2="0" stroke="#e2e8f0" strokeWidth="4.2" strokeLinecap="round" />
              <line x1="10" y1="9" x2="54" y2="9" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
              <polygon
                points="-18,-15 8,-16 16,-11 16,11 8,16 -18,15"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
            {/* Turret #2 */}
            <g transform="translate(256, 50)">
              <line x1="10" y1="-8" x2="46" y2="-8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <line x1="12" y1="0" x2="50" y2="0" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
              <line x1="10" y1="8" x2="46" y2="8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <polygon
                points="-16,-14 7,-15 14,-10 14,10 7,15 -16,14"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
            {/* Turret #3 */}
            <g transform="translate(72, 50) rotate(180)">
              <line x1="10" y1="-8" x2="46" y2="-8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <line x1="12" y1="0" x2="50" y2="0" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
              <line x1="10" y1="8" x2="46" y2="8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <polygon
                points="-16,-14 7,-15 14,-10 14,10 7,15 -16,14"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          </g>
        );

      case 'cruiser':
        return (
          <g>
            <path
              d="M 12 28 L 260 15 L 294 50 L 260 85 L 12 72 L 6 50 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.5"
            />
            <path
              d="M 18 32 L 252 20 L 282 50 L 252 80 L 18 68 Z"
              fill={`url(#${deckGradId})`}
              stroke="#475569"
              strokeWidth="1.5"
            />
            <g transform="translate(244, 50)">
              <line x1="6" y1="0" x2="36" y2="0" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
              <polygon
                points="-11,-11 6,-9 12,0 6,9 -11,11"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="1.8"
              />
            </g>
            <g transform="translate(194, 34)">
              <rect x="0" y="0" width="32" height="32" rx="2" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
              <rect x="3" y="3" width="26" height="26" fill="#334155" />
              <line x1="16" y1="3" x2="16" y2="29" stroke="#94a3b8" strokeWidth="1" />
              <line x1="3" y1="16" x2="29" y2="16" stroke="#94a3b8" strokeWidth="1" />
            </g>
            <polygon
              points="94,25 184,25 190,50 184,75 94,75 88,50"
              fill={`url(#${superGradId})`}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <rect x="148" y="33" width="24" height="34" rx="2" fill="#475569" stroke="#cbd5e1" strokeWidth="1.2" />
            <ellipse cx="128" cy="50" rx="10" ry="7" fill="#09090b" stroke="#94a3b8" strokeWidth="1.2" />
            <circle cx="104" cy="50" r="5.5" fill="#f8fafc" stroke="#334155" strokeWidth="1.2" />
            <g transform="translate(52, 50)">
              <circle cx="0" cy="0" r="16" fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.75" />
              <ellipse cx="3" cy="0" rx="10" ry="4" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
              <line x1="-8" y1="-11" x2="14" y2="11" stroke="#e2e8f0" strokeWidth="1.2" />
              <line x1="14" y1="-11" x2="-8" y2="11" stroke="#e2e8f0" strokeWidth="1.2" />
            </g>
          </g>
        );

      case 'destroyer':
        return (
          <g>
            <path
              d="M 12 31 L 266 17 L 295 50 L 266 83 L 12 69 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.5"
            />
            <path
              d="M 18 35 L 258 22 L 284 50 L 258 78 L 18 65 Z"
              fill={`url(#${deckGradId})`}
              stroke="#475569"
              strokeWidth="1.5"
            />
            <g transform="translate(242, 50)">
              <line x1="6" y1="-4" x2="34" y2="-4" stroke="#e2e8f0" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="6" y1="4" x2="34" y2="4" stroke="#e2e8f0" strokeWidth="2.8" strokeLinecap="round" />
              <polygon
                points="-11,-11 6,-9 12,0 6,9 -11,11"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="1.8"
              />
            </g>
            <polygon
              points="146,27 210,30 220,50 210,70 146,73 138,50"
              fill={`url(#${superGradId})`}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <circle cx="182" cy="50" r="6" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
            <rect x="152" y="42" width="16" height="16" rx="2" fill="#09090b" stroke="#64748b" strokeWidth="1" />
            <rect x="82" y="42" width="28" height="16" rx="2" fill={`url(#${superGradId})`} stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="5" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.2" />
          </g>
        );

      case 'patrol':
        return (
          <g>
            <path
              d="M 14 28 L 172 16 L 194 50 L 172 84 L 14 72 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.8"
            />
            <path
              d="M 20 32 L 164 21 L 184 50 L 164 79 L 20 68 Z"
              fill={`url(#${deckGradId})`}
              stroke="#475569"
              strokeWidth="1.5"
            />
            <g transform="translate(148, 50)">
              <line x1="4" y1="0" x2="30" y2="0" stroke="#e2e8f0" strokeWidth="3.2" strokeLinecap="round" />
              <polygon
                points="-9,-9 5,-7 10,0 5,7 -9,9"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="1.6"
              />
            </g>
            <polygon
              points="58,30 116,30 128,50 116,70 58,70 50,50"
              fill={`url(#${superGradId})`}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <polygon
              points="98,34 114,34 122,50 114,66 98,66 105,50"
              fill="#0284c7"
              stroke="#0f172a"
              strokeWidth="1"
            />
            <rect x="10" y="35" width="14" height="10" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="10" y="55" width="14" height="10" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
          </g>
        );
    }
  };

  return (
    <div
      className={`w-full h-full flex items-center justify-center select-none overflow-hidden ${
        isVertical ? 'rotate-90 origin-center' : ''
      } ${className}`}
    >
      <svg
        viewBox={`0 0 ${viewWidth} 100`}
        width="100%"
        height="100%"
        className="w-full h-full max-w-full max-h-full block drop-shadow-sm"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderDefs()}
        {renderArtwork()}
      </svg>
    </div>
  );
};
