import React from 'react';
import { GameSettings } from '../types';
import { X, Volume2, VolumeX, Eye, Radio, Gauge } from 'lucide-react';
import { sound } from '../services/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleSoundToggle = () => {
    const next = !settings.soundEnabled;
    onUpdateSettings({
      soundEnabled: next,
      sfxVolume: next && settings.sfxVolume === 0 ? 0.5 : settings.sfxVolume,
    });
    if (next) sound.playClick();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({
      sfxVolume: val,
      soundEnabled: val > 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Ajustes Tácticos</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-5">
          {/* Sound enable toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-3">
              {settings.soundEnabled && settings.sfxVolume > 0 ? (
                <Volume2 className="w-5 h-5 text-cyan-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <div className="text-xs font-semibold text-slate-200">Música y Efectos de Sonido</div>
                <div className="text-[11px] text-slate-400">Banda sonora, cañones, impactos y sonar</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSoundToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.soundEnabled && settings.sfxVolume > 0 ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundEnabled && settings.sfxVolume > 0 ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Volume slider (Always visible so player can slide from 0% to 100% anytime) */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-semibold">Nivel de Volumen General</span>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round((settings.soundEnabled ? settings.sfxVolume : 0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.soundEnabled ? settings.sfxVolume : 0}
              onChange={handleVolumeChange}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Show coordinates toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Etiquetas de Coordenadas</div>
                <div className="text-[11px] text-slate-400">Mostrar A-J y 1-10 en los bordes</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({ showCoordinates: !settings.showCoordinates });
                sound.playClick();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.showCoordinates ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showCoordinates ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Radar effect toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Barrido de Radar Táctico</div>
                <div className="text-[11px] text-slate-400">Efecto visual de escaneo en la cuadrícula</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({ radarPulseEnabled: !settings.radarPulseEnabled });
                sound.playClick();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.radarPulseEnabled ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.radarPulseEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Screen Shake toggle [REQ-011, REQ-177] */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Vibración de Pantalla (Screen Shake)</div>
                <div className="text-[11px] text-slate-400">Sacudida táctica en impactos críticos sufridos</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({ screenShakeEnabled: !settings.screenShakeEnabled });
                sound.playClick();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.screenShakeEnabled ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.screenShakeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs tracking-wide transition-colors cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
