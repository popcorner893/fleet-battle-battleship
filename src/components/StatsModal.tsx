import React, { useState } from 'react';
import { MatchStatistics } from '../types';
import { X, Award, Flame, Target, Trash2, Check, AlertCircle } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statistics: MatchStatistics;
  onClearStats: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  statistics,
  onClearStats,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const winRate =
    statistics.gamesPlayed > 0
      ? Math.round((statistics.wins / statistics.gamesPlayed) * 100)
      : 0;

  const overallAccuracy =
    statistics.totalShots > 0
      ? Math.round((statistics.totalHits / statistics.totalShots) * 1000) / 10
      : 0;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs}s`;
  };

  const difficultyNames: Record<string, string> = {
    EASY: 'Fácil',
    MEDIUM: 'Media',
    HARD: 'Difícil',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Registro Táctico & Estadísticas
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Key KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-1">Partidas Jugadas</div>
              <div className="text-xl font-bold font-mono text-white">
                {statistics.gamesPlayed}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-1">Victorias / Derrotas</div>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {statistics.wins} <span className="text-slate-500 text-sm">/</span> {statistics.losses}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-1">Tasa de Victoria</div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {winRate}%
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-1">Precisión Global</div>
              <div className="text-xl font-bold font-mono text-amber-400">
                {overallAccuracy}%
              </div>
            </div>
          </div>

          {/* Secondary stats (Streaks & Shots) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Racha Actual:</span>
              <span className="font-mono font-bold text-cyan-300">
                {statistics.currentStreak} victorias
              </span>
            </div>

            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Mejor Racha:</span>
              <span className="font-mono font-bold text-amber-400">
                {statistics.bestStreak} victorias
              </span>
            </div>

            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
              <span className="text-slate-400">Impactos / Total:</span>
              <span className="font-mono font-bold text-slate-200">
                {statistics.totalHits} / {statistics.totalShots}
              </span>
            </div>
          </div>

          {/* Match History Table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Historial Reciente de Operaciones</span>
            </h4>

            {statistics.history.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Aún no has registrado ninguna batalla naval. ¡Completa tu primera partida!
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Resultado</th>
                      <th className="py-2.5 px-3">IA</th>
                      <th className="py-2.5 px-3">Turnos</th>
                      <th className="py-2.5 px-3">Precisión</th>
                      <th className="py-2.5 px-3">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {statistics.history.slice(0, 15).map((m) => {
                      const isWin = m.result === 'victory';
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">{m.date}</td>
                          <td className="py-2.5 px-3 font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                isWin
                                  ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-400'
                                  : 'bg-rose-950/80 border border-rose-800 text-rose-400'
                              }`}
                            >
                              {isWin ? 'VICTORIA' : 'DERROTA'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {difficultyNames[m.difficulty] || m.difficulty}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{m.turns}</td>
                          <td className="py-2.5 px-3 text-amber-300">{m.accuracy}%</td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {formatTimer(m.durationSeconds)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Reset Stats */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                ¿Confirmar borrado total?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearStats();
                  setConfirmDelete(false);
                }}
                className="py-1 px-2.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Sí, borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={statistics.gamesPlayed === 0}
              className="py-1.5 px-3 rounded-lg text-rose-400 hover:bg-rose-950/40 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Restablecer Historial</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs tracking-wide transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
