import React, { useState } from 'react';
import { AchievementCategory, AchievementStateItem } from '../types';
import {
  X,
  Trophy,
  Flame,
  Crosshair,
  ShieldCheck,
  Zap,
  Anchor,
  Navigation,
  Wrench,
  Plane,
  Shield,
  Radio,
  Target,
  Award,
  Crown,
  Medal,
  Users,
  Wifi,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { sound } from '../services/audio';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AchievementStateItem[];
}

const CATEGORY_LABELS: Record<AchievementCategory | 'all', string> = {
  all: 'Todos',
  combat: 'Combate',
  tactical: 'Habilidades Tácticas',
  difficulty: 'Maestría IA',
  multiplayer: 'Multijugador P2P',
};

export function renderAchievementIcon(iconName: string, className: string = 'w-5 h-5') {
  switch (iconName) {
    case 'Flame':
      return <Flame className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    case 'Crosshair':
      return <Crosshair className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Anchor':
      return <Anchor className={className} />;
    case 'Navigation':
      return <Navigation className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Plane':
      return <Plane className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Radio':
      return <Radio className={className} />;
    case 'Target':
      return <Target className={className} />;
    case 'Award':
      return <Award className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Medal':
      return <Medal className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Wifi':
      return <Wifi className={className} />;
    default:
      return <Trophy className={className} />;
  }
}

function getNavalRankByProgress(unlockedCount: number, totalCount: number): string {
  const ratio = totalCount > 0 ? unlockedCount / totalCount : 0;
  if (ratio >= 1) return 'Almirante Supremo de la Flota';
  if (ratio >= 0.75) return 'Almirante de Escuadra';
  if (ratio >= 0.5) return 'Comandante Táctico';
  if (ratio >= 0.25) return 'Capitán de Corbeta';
  if (unlockedCount > 0) return 'Teniente de Navío';
  return 'Cadete Naval';
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  if (!isOpen) return null;

  const totalCount = achievements.length;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const navalRank = getNavalRankByProgress(unlockedCount, totalCount);

  const filteredAchievements =
    selectedCategory === 'all'
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  const categories: (AchievementCategory | 'all')[] = [
    'all',
    'combat',
    'tactical',
    'difficulty',
    'multiplayer',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                Condecoraciones y Logros Navales
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                <span>Rango: {navalRank}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-semibold">
                  {unlockedCount} / {totalCount} Desbloqueados ({completionPct}%)
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar Logros"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overall Progress Bar + Category Filter Tabs */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-800/80 bg-slate-950/30 flex flex-col gap-3 shrink-0">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono tabular-nums">
              <span className="text-slate-400">Progreso General de Hoja de Servicio</span>
              <span className="text-cyan-400 font-bold">{completionPct}% Completado</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Segmented Category Filter Controls */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              const catItems =
                cat === 'all' ? achievements : achievements.filter((a) => a.category === cat);
              const catUnlocked = catItems.filter((a) => a.unlocked).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-slate-800'
                  }`}
                >
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isActive ? 'text-slate-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {catUnlocked}/{catItems.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAchievements.map((ach) => {
            const pct = ach.target > 0 ? Math.min(100, Math.round((ach.current / ach.target) * 100)) : 0;

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition-all flex gap-3.5 items-start ${
                  ach.unlocked
                    ? 'bg-slate-950/80 border-amber-500/45 shadow-md'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-80'
                }`}
              >
                {/* Medal Icon Slot */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    ach.unlocked
                      ? 'bg-amber-500/15 border-amber-400/70 text-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {renderAchievementIcon(ach.iconName, 'w-5 h-5')}
                </div>

                {/* Details & Progress Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={`text-sm font-bold truncate ${
                        ach.unlocked ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {ach.title}
                    </h4>

                    <span
                      className={`text-[11px] font-mono tabular-nums shrink-0 flex items-center gap-1 ${
                        ach.unlocked ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {ach.unlocked ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Obtenido</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>
                            {ach.current}/{ach.target}
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ach.description}</p>

                  {/* Individual Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`h-full transition-all duration-300 ${
                          ach.unlocked ? 'bg-amber-400' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>{CATEGORY_LABELS[ach.category]}</span>
                      <span>
                        {ach.unlocked && ach.unlockedAt
                          ? `Desbloqueado · ${ach.unlockedAt}`
                          : `Progreso: ${ach.current} / ${ach.target}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Los logros se desbloquean automáticamente en partidas contra la IA y Multijugador P2P.
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

interface AchievementUnlockToastProps {
  unlockedQueue: AchievementStateItem[];
  onDismiss: (id: string) => void;
}

export const AchievementUnlockToast: React.FC<AchievementUnlockToastProps> = ({
  unlockedQueue,
  onDismiss,
}) => {
  if (unlockedQueue.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {unlockedQueue.slice(0, 3).map((ach) => (
        <div
          key={ach.id}
          className="pointer-events-auto bg-slate-900/95 border border-amber-400/80 rounded-xl p-3.5 shadow-2xl flex items-start gap-3 animate-fade-in"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
            {renderAchievementIcon(ach.iconName, 'w-5 h-5')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              Condecoración Desbloqueada
            </div>
            <div className="text-sm font-bold text-white truncate mt-0.5">{ach.title}</div>
            <div className="text-xs text-slate-300 mt-0.5 line-clamp-2">{ach.description}</div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(ach.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar notificación de logro"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
