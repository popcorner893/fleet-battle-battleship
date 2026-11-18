import React from 'react';
import { Flag, ShieldAlert, ArrowLeft, AlertTriangle } from 'lucide-react';
import { sound } from '../services/audio';

interface SurrenderModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirmSurrender: () => void;
  isMultiplayer?: boolean;
}

export const SurrenderModal: React.FC<SurrenderModalProps> = ({
  isOpen,
  onCancel,
  onConfirmSurrender,
  isMultiplayer = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    sound.playClick();
    onConfirmSurrender();
  };

  const handleCancel = () => {
    sound.playClick();
    onCancel();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="surrender-title"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/50 overflow-hidden">
        {/* Urgent Alert Banner */}
        <div className="bg-rose-950/80 border-b border-rose-900/80 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-900/60 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-rose-400 uppercase">
              Protocolo de Emergencia Naval
            </div>
            <h3 id="surrender-title" className="text-base font-extrabold text-white tracking-tight">
              ¿Confirmar Retirada Táctica?
            </h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              {isMultiplayer ? (
                <span>
                  Al retirarte, tu adversario obtendrá la <strong>victoria inmediata</strong> y se
                  notificará la rendición en el canal de combate en tiempo real.
                </span>
              ) : (
                <span>
                  La retirada concluirá inmediatamente el enfrentamiento y se registrará como una{' '}
                  <strong className="text-rose-400">derrota</strong> en las estadísticas de tu
                  hoja de servicio naval.
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Si tus buques aún cuentan con munición y flotabilidad, puedes continuar disparando en
            busca de un contraataque decisivo.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 font-bold text-xs tracking-wide transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continuar Batalla</span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-950 transition-all border border-rose-400/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Flag className="w-4 h-4 fill-current" />
              <span>Rendirse</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
