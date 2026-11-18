import React from 'react';
import {
  X,
  BookOpen,
  Anchor,
  Crosshair,
  Trophy,
  RotateCw,
  Users,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { CLASSIC_FLEET_CONFIG } from '../utils/coordinates';
import { ShipGraphic } from './ShipGraphic';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructions-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 id="instructions-modal-title" className="text-base font-bold text-white tracking-tight">
                Reglas Rápidas de Batalla Naval
              </h3>
              <p className="text-xs text-slate-400">Guía táctica esencial en 3 sencillos pasos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar instrucciones"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: 3 Quick-Step Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Step 1: Despliegue */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-md bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-xs">
                    1
                  </div>
                  <span>Despliega tu Flota</span>
                </div>
                <p className="text-xs text-slate-300 mb-3">
                  Ubica tus 5 navíos de guerra en el cuadrante de 10×10 casillas.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  <li className="flex items-start gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Pulsa <strong>[R]</strong> o clic derecho para rotar vertical/horizontal.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Usa <strong>Aleatorio</strong> para un despliegue inmediato.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 2: Combate */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-md bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-xs">
                    2
                  </div>
                  <span>Localiza y Dispara</span>
                </div>
                <p className="text-xs text-slate-300 mb-3">
                  Por turnos alternos, selecciona una coordenada enemiga desconocida.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  <li className="flex items-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-1" />
                    <span><strong>Agua (azul):</strong> Disparo al mar, no hay barco.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                    <span><strong>Impacto (rojo):</strong> Nave enemiga alcanzada. ¡Continúa la búsqueda!</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3: Victoria */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-xs">
                    3
                  </div>
                  <span>Habilidades y Victoria</span>
                </div>
                <p className="text-xs text-slate-300 mb-3">
                  Consigue 2 impactos para activar recursos tácticos balísticos:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold shrink-0">📡</span>
                    <span><strong>Sonar 3×3:</strong> Revela presencia de naves enemigas.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold shrink-0">✈️</span>
                    <span><strong>Ataque Aéreo:</strong> Bombardeo en cruz de 5 casillas.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>¡Hunde los 5 buques</strong> rivales para ganar!</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Warship Reference List */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                Flota de Combate Oficial (17 casillas totales)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CLASSIC_FLEET_CONFIG.map((ship) => (
                <div
                  key={ship.id}
                  className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col items-center text-center"
                >
                  <span className="text-[11px] font-bold text-slate-200 truncate w-full">{ship.name}</span>
                  <span className="text-[10px] font-mono text-cyan-400 mb-1">{ship.length} casillas</span>
                  <div className="h-5 w-full flex items-center justify-center overflow-hidden">
                    <ShipGraphic type={ship.id} length={ship.length} className="w-full h-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Capabilities Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-2.5">
              <Users className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block text-xs mb-0.5">Multijugador en Tiempo Real</strong>
                <span>Crea una sala, comparte tu código de 6 dígitos con un amigo y jueguen desde cualquier pantalla con anti-trampas.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block text-xs mb-0.5">3 Modos de IA Enemiga</strong>
                <span>Elige entre <strong>Fácil</strong> (fuego aleatorio), <strong>Media</strong> (rastreo ortogonal) o <strong>Difícil</strong> (probabilidad bayesiana).</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">[R]</kbd> en cualquier momento para rotar buques
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto ml-auto py-2 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer"
          >
            ¡Entendido, al Combate!
          </button>
        </div>
      </div>
    </div>
  );
};
