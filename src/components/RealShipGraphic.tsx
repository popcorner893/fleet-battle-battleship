import React, { useId } from 'react';
import { PlacedShip } from '../types';
import { areCoordinatesEqual } from '../utils/coordinates';

interface RealShipGraphicProps {
  ship: PlacedShip;
  isGhost?: boolean;
  isValidGhost?: boolean;
}

export const RealShipGraphic: React.FC<RealShipGraphicProps> = ({
  ship,
  isGhost = false,
  isValidGhost = true,
}) => {
  const uid = useId().replace(/:/g, '');
  const { type, length, orientation, isSunk, coordinates = [], hits = [] } = ship;
  const isVertical = orientation === 'vertical';

  // Determine which segment indices have taken hits (if ship is sunk, all segments are damaged)
  const safeHits = Array.isArray(hits) && hits.length > 0 ? hits : isSunk ? coordinates : [];
  const hitSegmentIndices = new Set<number>();
  (coordinates || []).forEach((coord, idx) => {
    if (isSunk || safeHits.some((h) => areCoordinatesEqual(h, coord))) {
      hitSegmentIndices.add(idx);
    }
  });

  // Total dimensions: 100 units per segment
  const totalLength = length * 100;
  const width = isVertical ? 100 : totalLength;
  const height = isVertical ? totalLength : 100;

  // Color & Gradient IDs scoped per instance
  const hullGradId = `hull-${uid}`;
  const deckGradId = `deck-${uid}`;
  const teakGradId = `teak-${uid}`;
  const superGradId = `super-${uid}`;
  const turretGradId = `turret-${uid}`;
  const wakeGradId = `wake-${uid}`;

  const renderDefs = () => (
    <defs>
      {/* Realistic Naval Steel Hull Gradient (Port to Starboard 3D curvature) */}
      <linearGradient id={hullGradId} x1="0%" y1="0%" x2="0%" y2="100%">
        {isGhost ? (
          isValidGhost ? (
            <>
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#047857" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0.85" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#be123c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.85" />
            </>
          )
        ) : isSunk ? (
          <>
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="50%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="18%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="82%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </>
        )}
      </linearGradient>

      {/* Dark Non-Skid Weather Deck / Flight Deck Gradient */}
      <linearGradient id={deckGradId} x1="0%" y1="0%" x2="0%" y2="100%">
        {isGhost ? (
          isValidGhost ? (
            <>
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.8" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9f1239" stopOpacity="0.8" />
            </>
          )
        ) : isSunk ? (
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

      {/* Authentic Weathered Teak Wood Deck for Battleship */}
      <linearGradient id={teakGradId} x1="0%" y1="0%" x2="0%" y2="100%">
        {isGhost ? (
          <stop offset="0%" stopColor={isValidGhost ? '#059669' : '#e11d48'} />
        ) : isSunk ? (
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

      {/* Armored Superstructure & Bridge Metallic Gradient */}
      <linearGradient id={superGradId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isSunk ? '#3f3f46' : '#cbd5e1'} />
        <stop offset="55%" stopColor={isSunk ? '#27272a' : '#64748b'} />
        <stop offset="100%" stopColor={isSunk ? '#18181b' : '#334155'} />
      </linearGradient>

      {/* 3D Gun Turret Cupola Gradient */}
      <radialGradient id={turretGradId} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor={isSunk ? '#52525b' : '#e2e8f0'} />
        <stop offset="55%" stopColor={isSunk ? '#27272a' : '#64748b'} />
        <stop offset="100%" stopColor={isSunk ? '#09090b' : '#1e293b'} />
      </radialGradient>

      {/* Subtle White Ocean Foam Wake around Hull */}
      <linearGradient id={wakeGradId} x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
        <stop offset="85%" stopColor="#e0f2fe" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
      </linearGradient>
    </defs>
  );

  const hullStroke = isGhost
    ? isValidGhost
      ? '#6ee7b7'
      : '#fda4af'
    : isSunk
    ? '#991b1b'
    : '#1e293b';

  const renderShipArtwork = () => {
    switch (type) {
      case 'carrier': {
        // 5 segments (500x100) — Nimitz / Ford Class Supercarrier
        return (
          <g>
            {/* Hydrodynamic Foam Wake */}
            {!isSunk && !isGhost && (
              <path
                d="M 4 50 L 18 8 L 455 3 L 498 50 L 455 97 L 18 92 Z"
                fill="none"
                stroke={`url(#${wakeGradId})`}
                strokeWidth="3.5"
                strokeDasharray="10 4"
              />
            )}

            {/* Lower Hull & Sponsons */}
            <path
              d="M 14 14 L 446 7 L 494 50 L 446 93 L 14 86 L 6 50 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.5"
            />

            {/* Angled Flight Deck with Port & Starboard Aircraft Elevators */}
            <path
              d="M 20 18 L 130 14 L 140 6 L 235 6 L 245 14 L 442 12 L 484 50 L 442 88 L 310 88 L 300 94 L 190 94 L 180 86 L 20 82 Z"
              fill={`url(#${deckGradId})`}
              stroke={isSunk ? '#7f1d1d' : '#475569'}
              strokeWidth="2"
            />

            {/* Deck Surface Non-Skid Panel Seam Lines */}
            <line x1="100" y1="16" x2="100" y2="84" stroke="#0f172a" strokeWidth="1" opacity="0.5" />
            <line x1="200" y1="12" x2="200" y2="88" stroke="#0f172a" strokeWidth="1" opacity="0.5" />
            <line x1="300" y1="14" x2="300" y2="86" stroke="#0f172a" strokeWidth="1" opacity="0.5" />
            <line x1="400" y1="14" x2="400" y2="86" stroke="#0f172a" strokeWidth="1" opacity="0.5" />

            {/* Angled Landing Runway Strip (Port-side tilt) */}
            <path
              d="M 26 62 L 420 20 L 434 42 L 26 80 Z"
              fill="#0f172a"
              opacity="0.45"
            />
            {/* Runway Boundary Lines (White) */}
            <line x1="28" y1="62" x2="420" y2="21" stroke="#f8fafc" strokeWidth="1.5" opacity="0.75" />
            <line x1="28" y1="79" x2="432" y2="41" stroke="#f8fafc" strokeWidth="1.5" opacity="0.75" />
            {/* Centerline Dashed Yellow Striping */}
            <line
              x1="32"
              y1="71"
              x2="425"
              y2="31"
              stroke={isSunk ? '#ef4444' : '#facc15'}
              strokeWidth="2.2"
              strokeDasharray="12 8"
            />

            {/* 4 Arresting Gear Cables at Stern */}
            <g stroke="#94a3b8" strokeWidth="1.4" opacity="0.8">
              <line x1="45" y1="56" x2="48" y2="80" />
              <line x1="62" y1="54" x2="65" y2="78" />
              <line x1="79" y1="52" x2="82" y2="76" />
              <line x1="96" y1="50" x2="99" y2="74" />
            </g>

            {/* Dual Steam Catapult Tracks on Bow */}
            <line x1="335" y1="42" x2="462" y2="42" stroke="#cbd5e1" strokeWidth="2" opacity="0.75" />
            <line x1="345" y1="62" x2="458" y2="56" stroke="#cbd5e1" strokeWidth="2" opacity="0.75" />
            {/* Jet Blast Deflectors */}
            <rect x="322" y="37" width="8" height="10" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
            <rect x="332" y="57" width="8" height="10" fill="#475569" stroke="#94a3b8" strokeWidth="1" />

            {/* Realistic F/A-18 Hornet Fighter Squadrons on Deck */}
            {[
              { x: 152, y: 18, rot: 12 },
              { x: 196, y: 18, rot: 12 },
              { x: 245, y: 74, rot: -15 },
              { x: 352, y: 42, rot: 0 },
            ].map((jet, i) => (
              <g key={i} transform={`translate(${jet.x}, ${jet.y}) rotate(${jet.rot})`}>
                {/* Drop shadow */}
                <polygon
                  points="-12,0 -6,-11 2,-2 14,0 2,2 -6,11"
                  fill="#020617"
                  opacity="0.55"
                  transform="translate(2, 2)"
                />
                {/* Swept Wings & Fuselage */}
                <polygon
                  points="-13,-7 -9,-2 -4,-11 4,-2 16,0 4,2 -4,11 -9,2 -13,7 -10,0"
                  fill="#94a3b8"
                  stroke="#334155"
                  strokeWidth="0.8"
                />
                {/* Twin Vertical Stabilizers */}
                <line x1="-11" y1="-4" x2="-6" y2="-3" stroke="#475569" strokeWidth="1.5" />
                <line x1="-11" y1="4" x2="-6" y2="3" stroke="#475569" strokeWidth="1.5" />
                {/* Glass Canopy */}
                <ellipse cx="6" cy="0" rx="3.5" ry="1.4" fill="#38bdf8" />
                {/* Afterburner Nozzles */}
                <circle cx="-11" cy="-1.5" r="1" fill="#f97316" />
                <circle cx="-11" cy="1.5" r="1" fill="#f97316" />
              </g>
            ))}

            {/* Starboard Multi-Tier Control Island Superstructure */}
            <g transform="translate(290, 7)">
              {/* Shadow */}
              <rect x="3" y="3" width="82" height="20" rx="3" fill="#020617" opacity="0.6" />
              {/* Main Island Hull */}
              <polygon
                points="0,4 74,4 82,11 74,20 0,20"
                fill={`url(#${superGradId})`}
                stroke="#1e293b"
                strokeWidth="1.8"
              />
              {/* Upper Command Bridge Tier */}
              <rect x="12" y="6" width="46" height="12" rx="2" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
              {/* Primary Flight Control Bridge Windows */}
              <rect x="48" y="7" width="8" height="10" rx="1" fill="#0284c7" />
              {/* AN/SPY Phased Array Radar Faces */}
              <rect x="18" y="8" width="12" height="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.8" />
              {/* Rotating Radar Dish & Mast */}
              <circle cx="38" cy="12" r="4.5" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.2" />
              <line x1="34" y1="12" x2="42" y2="12" stroke="#38bdf8" strokeWidth="1.8" />
            </g>

            {/* Bow Hull Number "68" */}
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
      }

      case 'battleship': {
        // 4 segments (400x100) — Iowa / Yamato Class Heavy Dreadnought Battleship
        return (
          <g>
            {/* Hydrodynamic Foam Wake */}
            {!isSunk && !isGhost && (
              <path
                d="M 4 50 L 18 20 L 358 9 L 398 50 L 358 91 L 18 80 Z"
                fill="none"
                stroke={`url(#${wakeGradId})`}
                strokeWidth="3.5"
                strokeDasharray="10 4"
              />
            )}

            {/* Heavy Torpedo-Bulge Armored Hull */}
            <path
              d="M 14 26 L 80 14 L 348 12 L 394 50 L 348 88 L 80 86 L 14 74 L 5 50 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.8"
            />

            {/* Weathered Teak Wood Main Deck */}
            <path
              d="M 22 30 L 82 20 L 340 18 L 380 50 L 340 82 L 82 80 L 22 70 Z"
              fill={`url(#${teakGradId})`}
              stroke={isSunk ? '#451a03' : '#475569'}
              strokeWidth="1.8"
            />

            {/* Teak Plank Striping Texture */}
            <g stroke="#451a03" strokeWidth="0.7" opacity="0.35">
              <line x1="30" y1="30" x2="355" y2="30" />
              <line x1="25" y1="38" x2="365" y2="38" />
              <line x1="22" y1="46" x2="375" y2="46" />
              <line x1="22" y1="54" x2="375" y2="54" />
              <line x1="25" y1="62" x2="365" y2="62" />
              <line x1="30" y1="70" x2="355" y2="70" />
            </g>

            {/* Steel Forecastle Bow Plate & Anchor Chains */}
            <path d="M 340 18 L 380 50 L 340 82 L 332 50 Z" fill={`url(#${deckGradId})`} />
            <line x1="350" y1="42" x2="376" y2="47" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="350" y1="58" x2="376" y2="53" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 2" />

            {/* Armored Central Citadel Deckhouse */}
            <polygon
              points="105,24 235,24 248,50 235,76 105,76 95,50"
              fill={`url(#${deckGradId})`}
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Secondary 5-Inch Twin Gun Mounts (2 Port, 2 Starboard) */}
            {[
              { x: 145, y: 24, dir: -1 },
              { x: 190, y: 24, dir: -1 },
              { x: 145, y: 76, dir: 1 },
              { x: 190, y: 76, dir: 1 },
            ].map((sec, i) => (
              <g key={i} transform={`translate(${sec.x}, ${sec.y})`}>
                <line x1="-2" y1="0" x2="-2" y2={sec.dir * 10} stroke="#cbd5e1" strokeWidth="1.8" />
                <line x1="2" y1="0" x2="2" y2={sec.dir * 10} stroke="#cbd5e1" strokeWidth="1.8" />
                <rect x="-6" y="-5" width="12" height="10" rx="2" fill={`url(#${turretGradId})`} stroke="#1e293b" strokeWidth="1" />
              </g>
            ))}

            {/* Armored Bridge Citadel, Conning Tower & Twin Funnels */}
            <g>
              {/* Aft Funnel Stack */}
              <ellipse cx="132" cy="50" rx="14" ry="10" fill={`url(#${superGradId})`} stroke="#1e293b" strokeWidth="1.5" />
              <ellipse cx="132" cy="50" rx="8" ry="5" fill="#09090b" />
              {/* Forward Funnel Stack */}
              <ellipse cx="168" cy="50" rx="15" ry="11" fill={`url(#${superGradId})`} stroke="#1e293b" strokeWidth="1.5" />
              <ellipse cx="168" cy="50" rx="9" ry="6" fill="#09090b" />

              {/* Multi-tier Forward Armored Bridge Tower */}
              <polygon
                points="192,31 228,34 236,50 228,66 192,69"
                fill={`url(#${superGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Bridge Navigation Windows */}
              <path d="M 225 37 L 232 50 L 225 63" fill="none" stroke="#0284c7" strokeWidth="2.5" />
              {/* Main Fire-Control Rangefinder Director */}
              <line x1="210" y1="27" x2="210" y2="73" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
              <circle cx="210" cy="50" r="7" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
            </g>

            {/* Turret #1 (Forward A-Turret — Triple 406mm / 16-inch Barrels with Blast Bags) */}
            <g transform="translate(310, 50)">
              {/* Turret shadow */}
              <polygon points="-16,-16 14,-13 18,16 -14,18" fill="#020617" opacity="0.55" transform="translate(3, 3)" />
              {/* 3 Tapered Rifle Barrels */}
              <line x1="10" y1="-9" x2="54" y2="-9" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
              <line x1="12" y1="0" x2="58" y2="0" stroke="#e2e8f0" strokeWidth="4.2" strokeLinecap="round" />
              <line x1="10" y1="9" x2="54" y2="9" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
              {/* White/Tan Canvas Blast Bags (Bloom) */}
              <ellipse cx="15" cy="-9" rx="4.5" ry="3" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <ellipse cx="16" cy="0" rx="4.5" ry="3" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <ellipse cx="15" cy="9" rx="4.5" ry="3" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              {/* Sloped Armored Turret House */}
              <polygon
                points="-18,-15 8,-16 16,-11 16,11 8,16 -18,15"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Rangefinder Ears */}
              <rect x="-14" y="-20" width="8" height="5" rx="1" fill="#475569" stroke="#0f172a" strokeWidth="1" />
              <rect x="-14" y="15" width="8" height="5" rx="1" fill="#475569" stroke="#0f172a" strokeWidth="1" />
            </g>

            {/* Turret #2 (Superfiring B-Turret — Triple 16-inch Barrels) */}
            <g transform="translate(256, 50)">
              <polygon points="-15,-15 12,-12 16,15 -13,17" fill="#020617" opacity="0.55" transform="translate(3, 3)" />
              <line x1="10" y1="-8" x2="46" y2="-8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <line x1="12" y1="0" x2="50" y2="0" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
              <line x1="10" y1="8" x2="46" y2="8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <ellipse cx="14" cy="-8" rx="4" ry="2.8" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <ellipse cx="15" cy="0" rx="4" ry="2.8" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <ellipse cx="14" cy="8" rx="4" ry="2.8" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <polygon
                points="-16,-14 7,-15 14,-10 14,10 7,15 -16,14"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>

            {/* Turret #3 (Aft X-Turret Facing Stern — Triple 16-inch Barrels) */}
            <g transform="translate(72, 50) rotate(180)">
              <polygon points="-15,-15 12,-12 16,15 -13,17" fill="#020617" opacity="0.55" transform="translate(-3, -3)" />
              <line x1="10" y1="-8" x2="46" y2="-8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <line x1="12" y1="0" x2="50" y2="0" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
              <line x1="10" y1="8" x2="46" y2="8" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="round" />
              <ellipse cx="14" cy="-8" rx="4" ry="2.8" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <ellipse cx="15" cy="0" rx="4" ry="2.8" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <ellipse cx="14" cy="8" rx="4" ry="2.8" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.8" />
              <polygon
                points="-16,-14 7,-15 14,-10 14,10 7,15 -16,14"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          </g>
        );
      }

      case 'cruiser': {
        // 3 segments (300x100) — Ticonderoga Class Guided-Missile Cruiser
        return (
          <g>
            {/* Hydrodynamic Foam Wake */}
            {!isSunk && !isGhost && (
              <path
                d="M 4 50 L 16 24 L 262 11 L 297 50 L 262 89 L 16 76 Z"
                fill="none"
                stroke={`url(#${wakeGradId})`}
                strokeWidth="3"
                strokeDasharray="8 4"
              />
            )}

            {/* Sleek Guided-Missile Cruiser Hull */}
            <path
              d="M 12 28 L 260 15 L 294 50 L 260 85 L 12 72 L 6 50 Z"
              fill={`url(#${hullGradId})`}
              stroke={hullStroke}
              strokeWidth="2.5"
            />

            {/* Main Weather Deck */}
            <path
              d="M 18 32 L 252 20 L 282 50 L 252 80 L 18 68 Z"
              fill={`url(#${deckGradId})`}
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Bow Mk 45 127mm Stealth Gun Turret */}
            <g transform="translate(244, 50)">
              <line x1="6" y1="0" x2="36" y2="0" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
              <polygon
                points="-11,-11 6,-9 12,0 6,9 -11,11"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="1.8"
              />
            </g>

            {/* Forward Mk 41 64-Cell VLS Missile Launcher Matrix */}
            <g transform="translate(194, 34)">
              <rect x="0" y="0" width="32" height="32" rx="2" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
              <rect x="3" y="3" width="26" height="26" fill="#334155" />
              {/* VLS Cell Grid Lines */}
              <line x1="9" y1="3" x2="9" y2="29" stroke="#94a3b8" strokeWidth="1" />
              <line x1="16" y1="3" x2="16" y2="29" stroke="#94a3b8" strokeWidth="1" />
              <line x1="23" y1="3" x2="23" y2="29" stroke="#94a3b8" strokeWidth="1" />
              <line x1="3" y1="11" x2="29" y2="11" stroke="#94a3b8" strokeWidth="1" />
              <line x1="3" y1="19" x2="29" y2="19" stroke="#94a3b8" strokeWidth="1" />
            </g>

            {/* Twin Aegis Superstructure Towers & Phased Array Radars */}
            <g>
              {/* Main Superstructure Block */}
              <polygon
                points="94,25 184,25 190,50 184,75 94,75 88,50"
                fill={`url(#${superGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Bridge Windows */}
              <path d="M 178 32 L 184 50 L 178 68" fill="none" stroke="#0284c7" strokeWidth="2.5" />
              {/* Forward Aegis SPY-1 Tower */}
              <rect x="148" y="33" width="24" height="34" rx="2" fill="#475569" stroke="#cbd5e1" strokeWidth="1.2" />
              {/* Aft Exhaust Funnel & Mast */}
              <ellipse cx="128" cy="50" rx="10" ry="7" fill="#09090b" stroke="#94a3b8" strokeWidth="1.2" />
              {/* White CIWS Phalanx Radome */}
              <circle cx="104" cy="50" r="5.5" fill="#f8fafc" stroke="#334155" strokeWidth="1.2" />
            </g>

            {/* Stern Helipad with Parked Seahawk Naval Helicopter */}
            <g transform="translate(52, 50)">
              {/* Helipad Landing Circle & H */}
              <circle cx="0" cy="0" r="16" fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.75" />
              <text x="0" y="5" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.6">
                H
              </text>
              {/* Seahawk Helicopter */}
              <ellipse cx="3" cy="0" rx="10" ry="4" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
              <line x1="-14" y1="0" x2="-5" y2="0" stroke="#64748b" strokeWidth="2.2" />
              <ellipse cx="8" cy="0" rx="3" ry="2.5" fill="#0284c7" />
              {/* 4 Main Rotor Blades */}
              <g stroke="#e2e8f0" strokeWidth="1.2" opacity="0.85">
                <line x1="-8" y1="-11" x2="14" y2="11" />
                <line x1="14" y1="-11" x2="-8" y2="11" />
              </g>
              <circle cx="3" cy="0" r="2" fill="#1e293b" />
            </g>
          </g>
        );
      }

      case 'destroyer': {
        // 3 segments (300x100) — Arleigh Burke Class Stealth Destroyer
        return (
          <g>
            {/* Hydrodynamic Foam Wake */}
            {!isSunk && !isGhost && (
              <path
                d="M 4 50 L 14 27 L 266 14 L 297 50 L 266 86 L 14 73 Z"
                fill="none"
                stroke={`url(#${wakeGradId})`}
                strokeWidth="3"
                strokeDasharray="8 4"
              />
            )}

            {/* Razor-Sharp Wave-Piercing Destroyer Hull */}
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

            {/* Forward Dual Rapid-Fire Gun Turret */}
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

            {/* Angular Stealth Bridge Superstructure */}
            <g>
              <polygon
                points="146,27 210,30 220,50 210,70 146,73 138,50"
                fill={`url(#${superGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Tinted Bridge Windshield */}
              <path d="M 204 35 L 212 50 L 204 65" fill="none" stroke="#0284c7" strokeWidth="2.5" />
              {/* Radar Mast & Twin Exhaust Louvers */}
              <circle cx="182" cy="50" r="6" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="182" y1="36" x2="182" y2="64" stroke="#e2e8f0" strokeWidth="2" />
              <rect x="152" y="42" width="16" height="16" rx="2" fill="#09090b" stroke="#64748b" strokeWidth="1" />
            </g>

            {/* Midship Triple Torpedo Tube Launchers (Port & Starboard) & Harpoon Canisters */}
            <g transform="translate(96, 50)">
              {/* Port Triple Torpedo Bank */}
              <g transform="translate(0, -16) rotate(-12)">
                <line x1="-12" y1="-3" x2="12" y2="-3" stroke="#94a3b8" strokeWidth="2.2" />
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#cbd5e1" strokeWidth="2.2" />
                <line x1="-12" y1="3" x2="12" y2="3" stroke="#94a3b8" strokeWidth="2.2" />
              </g>
              {/* Starboard Triple Torpedo Bank */}
              <g transform="translate(0, 16) rotate(12)">
                <line x1="-12" y1="-3" x2="12" y2="-3" stroke="#94a3b8" strokeWidth="2.2" />
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#cbd5e1" strokeWidth="2.2" />
                <line x1="-12" y1="3" x2="12" y2="3" stroke="#94a3b8" strokeWidth="2.2" />
              </g>
              {/* Central ASROC / Missile Box */}
              <rect x="-14" y="-8" width="28" height="16" rx="2" fill={`url(#${superGradId})`} stroke="#0f172a" strokeWidth="1.5" />
            </g>

            {/* Stern Anti-Submarine Depth Charge Racks & Towed Sonar Winch */}
            <g transform="translate(42, 50)">
              <rect x="-14" y="-14" width="24" height="6" rx="1" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
              <rect x="-14" y="8" width="24" height="6" rx="1" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
              <circle cx="-8" cy="-11" r="2.2" fill="#cbd5e1" />
              <circle cx="0" cy="-11" r="2.2" fill="#cbd5e1" />
              <circle cx="-8" cy="11" r="2.2" fill="#cbd5e1" />
              <circle cx="0" cy="11" r="2.2" fill="#cbd5e1" />
              {/* White CIWS Dome */}
              <circle cx="8" cy="0" r="5" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.2" />
            </g>
          </g>
        );
      }

      case 'patrol': {
        // 2 segments (200x100) — Fast Attack Craft / Coastal Interceptor
        return (
          <g>
            {/* High-Speed Twin Waterjet Stern Wake & Bow Spray */}
            {!isSunk && !isGhost && (
              <path
                d="M 2 38 L 14 26 L 172 13 L 197 50 L 172 87 L 14 74 L 2 62"
                fill="none"
                stroke={`url(#${wakeGradId})`}
                strokeWidth="3.5"
                strokeDasharray="6 3"
              />
            )}

            {/* Planing Interceptor Hull with Rubber Boarding Fenders */}
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

            {/* Forward Stabilized 25mm Remote Autocannon Turret */}
            <g transform="translate(148, 50)">
              <line x1="4" y1="0" x2="30" y2="0" stroke="#e2e8f0" strokeWidth="3.2" strokeLinecap="round" />
              <polygon
                points="-9,-9 5,-7 10,0 5,7 -9,9"
                fill={`url(#${turretGradId})`}
                stroke="#0f172a"
                strokeWidth="1.6"
              />
            </g>

            {/* Armored Pilothouse with Ballistic Wrap-Around Windshield */}
            <g>
              <polygon
                points="58,30 116,30 128,50 116,70 58,70 50,50"
                fill={`url(#${superGradId})`}
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Dark Tinted Wrap-Around Bridge Windows */}
              <polygon
                points="98,34 114,34 122,50 114,66 98,66 105,50"
                fill="#0284c7"
                stroke="#0f172a"
                strokeWidth="1"
              />
              {/* Communications & Surface Search Radar Arch */}
              <rect x="70" y="36" width="16" height="28" rx="2" fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="78" y1="30" x2="78" y2="70" stroke="#f8fafc" strokeWidth="2.2" />
              <circle cx="78" cy="50" r="4" fill="#38bdf8" />
            </g>

            {/* Twin Stern Waterjet Thruster Nozzles & Exhausts */}
            <rect x="10" y="35" width="14" height="10" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="10" y="55" width="14" height="10" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="28" cy="40" r="4" fill="#09090b" stroke="#64748b" strokeWidth="1" />
            <circle cx="28" cy="60" r="4" fill="#09090b" stroke="#64748b" strokeWidth="1" />
          </g>
        );
      }
    }
  };

  return (
    <div
      className={`relative w-full h-full pointer-events-none select-none transition-all duration-200 ${
        isSunk ? 'filter saturate-75 brightness-90' : ''
      }`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        className="w-full h-full block drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)]"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderDefs()}

        {isVertical ? (
          <g transform="rotate(90) translate(0, -100)">{renderShipArtwork()}</g>
        ) : (
          renderShipArtwork()
        )}

        {/* Realistic Localized Fire, Blast Craters & Billowing Smoke on Damaged Segments */}
        {!isGhost &&
          Array.from(hitSegmentIndices).map((idx) => {
            const segX = isVertical ? 50 : idx * 100 + 50;
            const segY = isVertical ? idx * 100 + 50 : 50;

            return (
              <g key={idx} transform={`translate(${segX}, ${segY})`}>
                {/* Scorched hull blast shadow */}
                <circle cx="0" cy="0" r="24" fill="#09090b" opacity="0.85" />
                {/* Torn steel rim */}
                <polygon
                  points="-18,-8 -8,-20 6,-16 20,-10 15,6 18,16 4,20 -12,16 -20,4"
                  fill="#18181b"
                  stroke="#52525b"
                  strokeWidth="1.5"
                />
                {/* Glowing magma / fire core */}
                <circle cx="0" cy="0" r="14" fill="#dc2626" opacity="0.9" />
                <circle cx="-2" cy="-1" r="9" fill="#f97316" opacity="0.95" />
                <circle cx="1" cy="1" r="4.5" fill="#fef08a" />
              </g>
            );
          })}

        {/* Sunk Overlay: Flooded & Scorched Wreckage Outline */}
        {isSunk && (
          <g>
            <rect
              x="2"
              y="2"
              width={width - 4}
              height={height - 4}
              fill="rgba(9, 9, 11, 0.38)"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="8 6"
              rx="4"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
