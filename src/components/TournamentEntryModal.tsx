import React, { useState, useEffect } from 'react';
import { TournamentState } from '../types';
import { multiplayerService, normalizeTournamentCode } from '../services/multiplayer';
import { sound } from '../services/audio';
import { Trophy, Users, PlusCircle, LogIn, X, ShieldCheck, Sparkles } from 'lucide-react';

interface TournamentEntryModalProps {
  isOpen: boolean;
  initialCode?: string | null;
  onClose: () => void;
  onEnterTournament: (
    tournamentCode: string,
    playerId: string,
    playerName: string,
    initialState: TournamentState
  ) => void;
}

const STORAGE_PLAYER_ID_KEY = 'fb_tournament_player_id_v1';
const STORAGE_PLAYER_NAME_KEY = 'fb_tournament_player_name_v1';

function getOrCreateTournamentPlayerId(currentName: string): string {
  const normalizedName = currentName.trim().toLowerCase();
  try {
    const existingId = sessionStorage.getItem(STORAGE_PLAYER_ID_KEY);
    const existingName = (sessionStorage.getItem(STORAGE_PLAYER_NAME_KEY) || '').trim().toLowerCase();
    if (existingId && existingId.trim().length > 0 && existingName === normalizedName) {
      return existingId;
    }
    const created = `tp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(STORAGE_PLAYER_ID_KEY, created);
    sessionStorage.setItem(STORAGE_PLAYER_NAME_KEY, currentName.trim());
    return created;
  } catch {
    return `tp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

export const TournamentEntryModal: React.FC<TournamentEntryModalProps> = ({
  isOpen,
  initialCode,
  onClose,
  onEnterTournament,
}) => {
  const [tab, setTab] = useState<'join' | 'create'>(initialCode ? 'join' : 'join');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_PLAYER_NAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const [tournamentCodeInput, setTournamentCodeInput] = useState<string>(initialCode || '');
  const [tournamentNameInput, setTournamentNameInput] = useState<string>('Torneo Naval de Aula');
  const [includeHostAsPlayer, setIncludeHostAsPlayer] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      setTournamentCodeInput(normalizeTournamentCode(initialCode));
      setTab('join');
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const savePlayerSession = (id: string, name: string) => {
    try {
      sessionStorage.setItem(STORAGE_PLAYER_ID_KEY, id);
      sessionStorage.setItem(STORAGE_PLAYER_NAME_KEY, name.trim());
    } catch {
      // ignore storage errors
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = playerName.trim();
    if (!cleanName) {
      setErrorMsg('Por favor ingresa tu nombre o alias para registrarte en las llaves.');
      return;
    }

    const formattedCode = normalizeTournamentCode(tournamentCodeInput);
    if (!formattedCode || formattedCode.length < 5) {
      setErrorMsg('Ingresa un código de torneo válido (ejemplo: TOR-7B4).');
      return;
    }

    setIsLoading(true);
    try {
      const playerId = getOrCreateTournamentPlayerId(cleanName);
      const res = await multiplayerService.joinTournament(formattedCode, cleanName, playerId);
      savePlayerSession(res.playerId, res.playerName);
      sound.playSonar();
      onEnterTournament(
        res.tournamentCode,
        res.playerId,
        res.playerName,
        res.tournament
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo encontrar o unir al torneo.');
      sound.playSplash();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = playerName.trim();
    if (!cleanName) {
      setErrorMsg('Ingresa tu nombre de Comandante u Organizador.');
      return;
    }

    const cleanTourneyName = tournamentNameInput.trim() || 'Torneo Naval de Aula';
    setIsLoading(true);
    try {
      const res = await multiplayerService.createTournament(
        cleanTourneyName,
        cleanName,
        includeHostAsPlayer
      );
      savePlayerSession(res.playerId, res.playerName);
      sound.playSonar();
      onEnterTournament(res.tournamentCode, res.playerId, res.playerName, res.tournament);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al crear el torneo.');
      sound.playSplash();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-400 flex items-center justify-center shadow-inner">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                Eliminatoria Directa · Combates Simultáneos
              </span>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                TORNEO NAVAL DE AULA
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-2 gap-2 bg-slate-950/60 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('join');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'join'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Unirse con Código</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('create');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'create'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Torneo de Salón</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {tab === 'join' ? (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tu Nombre o Alias de Jugador
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ej.Sebastián, Valeria, Almirante..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Con este nombre aparecerás en la lista del lobby y en el cuadro oficial de llaves.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Código del Torneo
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={tournamentCodeInput}
                  onChange={(e) => setTournamentCodeInput(e.target.value.toUpperCase())}
                  placeholder="TOR-XXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-300 font-mono font-bold text-base tracking-widest uppercase focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>¿Cómo funciona el Torneo en Clase?</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  1. Todos ingresan con el mismo código y verifican su nombre en pantalla.
                  <br />
                  2. El anfitrión realiza el <strong>Sorteo de Llaves</strong>.
                  <br />
                  3. Los duelos 1 vs 1 listos en cada ronda se habilitan <strong>en simultáneo</strong> hasta coronar al Campeón de la Gran Final.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Users className="w-4 h-4" />
                <span>{isLoading ? 'Conectando al Lobby...' : 'Entrar al Lobby del Torneo'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nombre del Torneo / Salón
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={tournamentNameInput}
                  onChange={(e) => setTournamentNameInput(e.target.value)}
                  placeholder="Ej. Copa Naval Salón 11A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tu Nombre (Anfitrión / Director del Torneo)
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ej. Profesor / Comandante"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeHostAsPlayer}
                  onChange={(e) => setIncludeHostAsPlayer(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-200 block">
                    Participar también como jugador en las llaves
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Desmarca esta opción si solo deseas proyectar el cuadro de llaves y dirigir el sorteo sin combatir.
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Generando Sala...' : 'Crear Sala y Obtener Código'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
