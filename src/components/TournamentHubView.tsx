import React, { useState, useEffect, useCallback } from 'react';
import {
  TournamentMatchSlot,
  TournamentSpectatorView,
  TournamentState,
} from '../types';
import { multiplayerService } from '../services/multiplayer';
import { sound } from '../services/audio';
import { BoardGrid } from './BoardGrid';
import { formatCoordinate } from '../utils/coordinates';
import {
  Trophy,
  Users,
  Shuffle,
  Play,
  Copy,
  Check,
  Swords,
  Eye,
  Crown,
  Anchor,
  ArrowLeft,
  UserPlus,
  Trash2,
  Radio,
  Sparkles,
  X,
  ShieldAlert,
} from 'lucide-react';

interface TournamentHubViewProps {
  tournamentCode: string;
  playerId: string;
  playerName: string;
  initialTournament?: TournamentState | null;
  onEnterMatch: (
    roomCode: string,
    playerId: string,
    role: 'host' | 'guest',
    playerName: string,
    skipPlacement?: boolean
  ) => void;
  onBackToMenu: () => void;
  showCoordinates?: boolean;
  radarPulse?: boolean;
}

export const TournamentHubView: React.FC<TournamentHubViewProps> = ({
  tournamentCode,
  playerId,
  playerName,
  initialTournament = null,
  onEnterMatch,
  onBackToMenu,
  showCoordinates = true,
  radarPulse = true,
}) => {
  const [tournament, setTournament] = useState<TournamentState | null>(initialTournament);
  const [spectatedRoomCode, setSpectatedRoomCode] = useState<string | null>(null);
  const [spectatorView, setSpectatorView] = useState<TournamentSpectatorView | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quickAddName, setQuickAddName] = useState<string>('');
  const [isAddingLocal, setIsAddingLocal] = useState<boolean>(false);

  const fetchTournamentState = useCallback(async () => {
    try {
      const res = await multiplayerService.getTournament(
        tournamentCode,
        playerId,
        spectatedRoomCode
      );
      setTournament(res.tournament);
      setSpectatorView(res.spectatorView);
    } catch (err) {
      console.error('Error syncing tournament:', err);
    }
  }, [tournamentCode, playerId, spectatedRoomCode]);

  useEffect(() => {
    fetchTournamentState();
    const interval = window.setInterval(fetchTournamentState, 1000);
    const unsub = multiplayerService.subscribeTournamentLocalTabs(tournamentCode, () => {
      fetchTournamentState();
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [fetchTournamentState, tournamentCode]);

  const handleCopyCode = () => {
    sound.playClick();
    navigator.clipboard?.writeText(tournamentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyShareLink = () => {
    sound.playClick();
    const url = `${window.location.origin}${window.location.pathname}?tournament=${encodeURIComponent(
      tournamentCode
    )}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDrawBracket = async () => {
    if (!tournament) return;
    setErrorMsg(null);
    setIsDrawing(true);
    sound.playSonar();
    try {
      const updated = await multiplayerService.drawTournamentBracket(tournament.code, playerId);
      setTimeout(() => {
        setTournament(updated);
        setIsDrawing(false);
        sound.playAchievement();
      }, 650);
    } catch (err: any) {
      setIsDrawing(false);
      setErrorMsg(err?.message || 'No se pudo realizar el sorteo.');
      sound.playSplash();
    }
  };

  const handleStartMatches = async () => {
    if (!tournament) return;
    setErrorMsg(null);
    setIsStarting(true);
    sound.playSonar();
    try {
      const updated = await multiplayerService.startTournamentMatches(tournament.code, playerId);
      setTournament(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al iniciar los combates del torneo.');
      sound.playSplash();
    } finally {
      setIsStarting(false);
    }
  };

  const handleRemoveParticipant = async (targetId: string) => {
    if (!tournament) return;
    sound.playClick();
    try {
      const updated = await multiplayerService.removeTournamentPlayer(
        tournament.code,
        playerId,
        targetId
      );
      setTournament(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al remover participante.');
    }
  };

  const handleQuickAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || !quickAddName.trim()) return;
    setIsAddingLocal(true);
    setErrorMsg(null);
    try {
      const syntheticId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const res = await multiplayerService.joinTournament(
        tournament.code,
        quickAddName.trim(),
        syntheticId
      );
      setTournament(res.tournament);
      setQuickAddName('');
      sound.playClick();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo registrar el jugador.');
    } finally {
      setIsAddingLocal(false);
    }
  };

  if (!tournament) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-400 flex items-center justify-center animate-pulse mb-3">
          <Trophy className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-200">Sincronizando Centro de Torneo Naval...</p>
        <p className="text-xs text-slate-400 font-mono mt-1">{tournamentCode}</p>
      </div>
    );
  }

  const isHost = tournament.hostId === playerId;

  // Find if the current player has an active/ready match right now in any round
  let myActiveMatch: { match: TournamentMatchSlot; roundTitle: string } | null = null;
  let myNextPendingMatch: { match: TournamentMatchSlot; roundTitle: string } | null = null;
  let wasEliminated = false;

  for (const round of tournament.rounds) {
    for (const m of round.matches) {
      const isP1 = m.player1?.id === playerId;
      const isP2 = m.player2?.id === playerId;
      if (!isP1 && !isP2) continue;

      if (m.winnerId && m.winnerId !== playerId) {
        wasEliminated = true;
      } else if (!m.winnerId && m.roomCode && m.player1 && m.player2) {
        myActiveMatch = { match: m, roundTitle: round.title };
      } else if (!m.winnerId && (!m.player1 || !m.player2 || !m.roomCode)) {
        myNextPendingMatch = { match: m, roundTitle: round.title };
      }
    }
  }

  // Count active simultaneous matches across the bracket
  const activeMatchesList: Array<{ match: TournamentMatchSlot; roundTitle: string }> = [];
  for (const round of tournament.rounds) {
    for (const m of round.matches) {
      if (m.roomCode && !m.winnerId && m.player1 && m.player2) {
        activeMatchesList.push({ match: m, roundTitle: round.title });
      }
    }
  }

  const getMatchStatusBadge = (match: TournamentMatchSlot) => {
    if (match.status === 'bye') {
      return (
        <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase">
          Pase Directo (BYE)
        </span>
      );
    }
    if (match.winnerId || match.status === 'finished') {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase">
          Finalizado
        </span>
      );
    }
    if (match.liveStatus?.roomStatus === 'combat' || match.status === 'in_progress') {
      return (
        <span className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/70 text-rose-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          En Combate
        </span>
      );
    }
    if (match.roomCode || match.status === 'ready') {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/60 text-amber-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          Sala Habilitada
        </span>
      );
    }
    if (match.player1 && match.player2) {
      return (
        <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-sky-300 text-[10px] font-mono font-bold uppercase">
          Listo
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-mono uppercase">
        Esperando Rivales
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 gap-4">
      {/* Top Tournament Command Header */}
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onBackToMenu();
            }}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Volver al Menú Principal"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                {tournament.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  tournament.status === 'lobby'
                    ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                    : tournament.status === 'drawn'
                    ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                    : tournament.status === 'in_progress'
                    ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                    : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                }`}
              >
                {tournament.status === 'lobby'
                  ? 'Fase 1: Registro en Lobby'
                  : tournament.status === 'drawn'
                  ? 'Fase 2: Llaves Sorteadas'
                  : tournament.status === 'in_progress'
                  ? `Fase 3: Combates Simultáneos (${activeMatchesList.length} activos)`
                  : 'Torneo Finalizado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Organizador: <strong className="text-slate-200">{tournament.hostName}</strong> · Tu
              perfil: <strong className="text-amber-300">{playerName}</strong>{' '}
              {isHost && <span className="text-cyan-400 font-mono">(Anfitrión)</span>}
            </p>
          </div>
        </div>

        {/* Shareable Tournament Code Box */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-1.5 gap-2.5">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block">
                Código de Aula
              </span>
              <span className="text-base sm:text-lg font-mono font-black text-amber-400 tracking-widest">
                {tournament.code}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Copiar código del torneo"
            >
              {copiedCode ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Enlace Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copiar Enlace de Invitación</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          GRAND FINAL CHAMPION PODIUM BANNER (when completed)
          ===================================================================== */}
      {tournament.status === 'completed' && tournament.champion && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/90 via-yellow-900/50 to-amber-950/90 border-2 border-amber-400 p-6 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-300 text-amber-300 mb-3 shadow-lg">
            <Crown className="w-9 h-9" />
          </div>
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-amber-300">
            ¡Gran Final Concluida · Campeón Supremo del Torneo Naval!
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight">
            🏆 {tournament.champion.name} 🏆
          </h2>
          <p className="text-xs text-amber-100/80 mt-1">
            Ha superado todas las rondas eliminatorias y dominado las aguas del salón de clase.
          </p>
          {isHost && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={isDrawing}
                onClick={handleDrawBracket}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isDrawing ? 'animate-spin' : ''}`} />
                <span>Nuevo Sorteo con este Salón</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          PERSONAL ACTIVE MATCH CALLOUT BANNER (Simultaneous Match Ready!)
          ===================================================================== */}
      {myActiveMatch && myActiveMatch.match.roomCode && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/95 via-teal-950/90 to-slate-900 border-2 border-emerald-400 p-4 sm:p-5 shadow-[0_0_35px_rgba(16,185,129,0.3)] flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center shrink-0 animate-pulse">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono font-black text-[10px] uppercase">
                  ¡TU DUELO ESTÁ HABILITADO!
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {myActiveMatch.roundTitle} · Combate #{myActiveMatch.match.matchIndex + 1}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                {myActiveMatch.match.player1?.name} <span className="text-emerald-400">vs</span>{' '}
                {myActiveMatch.match.player2?.name}
              </h3>
              <p className="text-xs text-slate-300">
                Tu llave ya tiene ambos contrincantes listos. Entra a desplegar tu flota y combatir en tiempo real.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playSonar();
              const m = myActiveMatch!.match;
              const role = m.player1?.id === playerId ? 'host' : 'guest';
              const alreadyReady =
                (role === 'host'
                  ? Boolean(m.liveStatus?.hostReady)
                  : Boolean(m.liveStatus?.guestReady)) ||
                m.liveStatus?.roomStatus === 'combat';
              onEnterMatch(
                m.roomCode!,
                playerId,
                role,
                playerName,
                alreadyReady
              );
            }}
            className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer shrink-0"
          >
            <Swords className="w-4 h-4" />
            <span>
              {(myActiveMatch.match.player1?.id === playerId
                ? myActiveMatch.match.liveStatus?.hostReady
                : myActiveMatch.match.liveStatus?.guestReady) ||
              myActiveMatch.match.liveStatus?.roomStatus === 'combat'
                ? 'Reanudar Combate en Curso'
                : 'Desplegar Flota y Combatir Ahora'}
            </span>
          </button>
        </div>
      )}

      {/* Waiting for next opponent notice (when player advanced via BYE or earlier win) */}
      {!myActiveMatch && myNextPendingMatch && tournament.status === 'in_progress' && (
        <div className="rounded-xl bg-cyan-950/50 border border-cyan-500/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-cyan-200">
            <Radio className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>
              Estás clasificado en <strong>{myNextPendingMatch.roundTitle}</strong> (Combate #
              {myNextPendingMatch.match.matchIndex + 1}). En cuanto se defina tu rival en la llave previa, tu partida se habilitará automáticamente. Mientras tanto, puedes <strong>espectar cualquier batalla en vivo</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Eliminated player notice */}
      {!myActiveMatch && !myNextPendingMatch && wasEliminated && tournament.status === 'in_progress' && (
        <div className="rounded-xl bg-slate-900/90 border border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>
              Has caído en combate, Comandante. Puedes seguir el avance de las llaves en vivo y hacer clic en <strong>Espectar en Vivo</strong> en cualquier partida activa.
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          PHASE 1: LOBBY PARTICIPANT VERIFICATION & HOST DRAW TRIGGER
          ===================================================================== */}
      {tournament.status === 'lobby' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Classroom Player Roster */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-extrabold text-white uppercase tracking-wide">
                  Jugadores Registrados en el Salón
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-bold text-xs">
                {tournament.participants.length} Jugadores en Sala
              </span>
            </div>

            {tournament.participants.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Esperando a que los jugadores del salón ingresen con el código{' '}
                <strong className="text-amber-400 font-mono">{tournament.code}</strong>...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-4 max-h-[420px] overflow-y-auto pr-1">
                {tournament.participants.map((p, idx) => {
                  const isMe = p.id === playerId;
                  const isTourneyHost = p.id === tournament.hostId;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isMe
                          ? 'bg-amber-950/40 border-amber-400/70 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-amber-400 flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{p.name}</span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold uppercase shrink-0">
                                Tú
                              </span>
                            )}
                          </div>
                          {isTourneyHost && (
                            <span className="text-[10px] font-mono text-cyan-400 block">
                              Anfitrión
                            </span>
                          )}
                        </div>
                      </div>

                      {isHost && !isMe && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                          title={`Retirar a ${p.name} del lobby`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Local Registration Bar for Host/Teacher */}
            {isHost && (
              <form
                onSubmit={handleQuickAddParticipant}
                className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  <span>Inscribir alumno manualmente:</span>
                </div>
                <input
                  type="text"
                  maxLength={24}
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="Nombre del jugador..."
                  className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={isAddingLocal || !quickAddName.trim()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  + Añadir a la Lista
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Draw Control Panel */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Verificación y Sorteo</span>
              </div>
              <h3 className="text-lg font-extrabold text-white">
                ¿Están todos los jugadores del salón en la lista?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pide a todos los participantes que ingresen al menú <strong>Torneo de Aula</strong> con el código{' '}
                <strong className="text-amber-400 font-mono">{tournament.code}</strong>.
              </p>
              <ul className="text-xs text-slate-400 space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">1.</span>
                  <span>
                    Verifica en pantalla que los nombres de todos los estudiantes aparezcan registrados.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">2.</span>
                  <span>
                    Si el número de jugadores es impar o no es potencia de 2, el sistema otorgará{' '}
                    <strong className="text-cyan-300">Pase Directo (BYE)</strong> equilibrado en primera ronda.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">3.</span>
                  <span>
                    Al iniciar los combates, <strong>todas las llaves con rivales definidos podrán jugar en simultáneo</strong>.
                  </span>
                </li>
              </ul>
            </div>

            {isHost ? (
              <button
                type="button"
                disabled={tournament.participants.length < 2 || isDrawing}
                onClick={handleDrawBracket}
                className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                <Shuffle className={`w-4 h-4 ${isDrawing ? 'animate-spin' : ''}`} />
                <span>
                  {isDrawing
                    ? 'Sorteando Llaves del Torneo...'
                    : `Realizar Sorteo de Llaves (${tournament.participants.length} Jugadores)`}
                </span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-300">
                Esperando a que el anfitrión (<strong>{tournament.hostName}</strong>) verifique la lista y realice el <strong>Sorteo de Llaves</strong>...
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          PHASE 2 & 3: GRAPHICAL TOURNAMENT BRACKET & SIMULTANEOUS MATCHES
          ===================================================================== */}
      {tournament.status !== 'lobby' && (
        <div className="flex flex-col gap-4">
          {/* Host Control Bar when Bracket is Drawn */}
          {tournament.status === 'drawn' && (
            <div className="bg-amber-950/50 border border-amber-500/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                  ¡Sorteo de Llaves Completado! Revisa los Emparejamientos
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Cuando el salón esté listo, inicia las batallas para habilitar simultáneamente todos los combates 1 vs 1 de las llaves.
                </p>
              </div>

              {isHost ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isDrawing}
                    onClick={handleDrawBracket}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Volver a Sortear</span>
                  </button>

                  <button
                    type="button"
                    disabled={isStarting}
                    onClick={handleStartMatches}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>
                      {isStarting
                        ? 'Habilitando Salas...'
                        : '¡Iniciar Torneo y Habilitar Combates Simultáneos!'}
                    </span>
                  </button>
                </div>
              ) : (
                <span className="text-xs font-mono text-amber-300">
                  Esperando a que {tournament.hostName} inicie las batallas...
                </span>
              )}
            </div>
          )}

          {/* Graphical Elimination Bracket Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Cuadro Oficial de Eliminación Directa
                </h2>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  Combate en Curso
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Ganador Avanza Automáticamente
                </span>
              </div>
            </div>

            {/* Bracket Columns */}
            <div className="flex items-stretch gap-6 min-w-max pb-2">
              {tournament.rounds.map((round) => (
                <div
                  key={round.roundIndex}
                  className="w-72 sm:w-80 flex flex-col justify-between shrink-0"
                >
                  {/* Round Column Header */}
                  <div className="mb-3 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                      Fase {round.roundIndex + 1} de {tournament.rounds.length}
                    </span>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">
                      {round.title}
                    </h3>
                  </div>

                  {/* Matches in this Round */}
                  <div className="flex-1 flex flex-col justify-around gap-4 py-2">
                    {round.matches.map((match) => {
                      const isP1Winner = Boolean(
                        match.winnerId && match.player1?.id === match.winnerId
                      );
                      const isP2Winner = Boolean(
                        match.winnerId && match.player2?.id === match.winnerId
                      );
                      const isMyMatch =
                        match.player1?.id === playerId || match.player2?.id === playerId;
                      const isSpectatingThis =
                        Boolean(spectatedRoomCode && spectatedRoomCode === match.roomCode);

                      return (
                        <div
                          key={match.id}
                          className={`relative rounded-2xl border p-3.5 transition-all ${
                            isMyMatch && !match.winnerId
                              ? 'bg-emerald-950/30 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                              : isSpectatingThis
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                              : match.status === 'in_progress'
                              ? 'bg-slate-950/90 border-rose-500/60 shadow-lg'
                              : 'bg-slate-950/85 border-slate-800'
                          }`}
                        >
                          {/* Match Top Bar */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                              Combate #{match.matchIndex + 1}
                            </span>
                            {getMatchStatusBadge(match)}
                          </div>

                          {/* Player 1 Slot */}
                          <div
                            className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs mb-1.5 ${
                              isP1Winner
                                ? 'bg-emerald-950/60 border-emerald-500/60 text-white font-bold'
                                : match.winnerId && !isP1Winner
                                ? 'bg-slate-900/40 border-slate-800/60 text-slate-500 line-through'
                                : match.player1?.id === playerId
                                ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 font-bold'
                                : 'bg-slate-900/80 border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isP1Winner && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate">
                                {match.player1 ? match.player1.name : 'Por definir...'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {typeof match.liveStatus?.hostShipsAlive === 'number' &&
                                (match.status === 'in_progress' || match.status === 'finished') && (
                                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-0.5">
                                    {match.liveStatus.hostShipsAlive}
                                    <Anchor className="w-2.5 h-2.5" />
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* Player 2 Slot */}
                          <div
                            className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                              match.status === 'bye'
                                ? 'bg-slate-900/30 border-slate-800/50 text-cyan-400/80 italic'
                                : isP2Winner
                                ? 'bg-emerald-950/60 border-emerald-500/60 text-white font-bold'
                                : match.winnerId && !isP2Winner
                                ? 'bg-slate-900/40 border-slate-800/60 text-slate-500 line-through'
                                : match.player2?.id === playerId
                                ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 font-bold'
                                : 'bg-slate-900/80 border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isP2Winner && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate">
                                {match.status === 'bye'
                                  ? 'PASE DIRECTO (BYE)'
                                  : match.player2
                                  ? match.player2.name
                                  : 'Por definir...'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {typeof match.liveStatus?.guestShipsAlive === 'number' &&
                                (match.status === 'in_progress' || match.status === 'finished') && (
                                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-0.5">
                                    {match.liveStatus.guestShipsAlive}
                                    <Anchor className="w-2.5 h-2.5" />
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* Match Card Footer Actions: Play or Spectate Live */}
                          {match.roomCode && (
                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                              {isMyMatch && !match.winnerId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playSonar();
                                    const role =
                                      match.player1?.id === playerId ? 'host' : 'guest';
                                    const alreadyReady =
                                      (role === 'host'
                                        ? Boolean(match.liveStatus?.hostReady)
                                        : Boolean(match.liveStatus?.guestReady)) ||
                                      match.liveStatus?.roomStatus === 'combat';
                                    onEnterMatch(
                                      match.roomCode!,
                                      playerId,
                                      role,
                                      playerName,
                                      alreadyReady
                                    );
                                  }}
                                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Swords className="w-3.5 h-3.5" />
                                  <span>
                                    {(match.player1?.id === playerId
                                      ? match.liveStatus?.hostReady
                                      : match.liveStatus?.guestReady) ||
                                    match.liveStatus?.roomStatus === 'combat'
                                      ? 'Reanudar mi Combate'
                                      : 'Entrar a mi Combate'}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playClick();
                                    setSpectatedRoomCode(
                                      isSpectatingThis ? null : match.roomCode!
                                    );
                                  }}
                                  className={`w-full py-1.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    isSpectatingThis
                                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                      : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700'
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>
                                    {isSpectatingThis
                                      ? 'Viendo Tableros en Vivo'
                                      : match.winnerId
                                      ? 'Ver Resultado de Tableros'
                                      : 'Espectar Tableros en Vivo'}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Final Champion Column */}
              <div className="w-64 flex flex-col justify-center shrink-0">
                <div className="mb-3 px-3.5 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 block">
                    Corona Naval
                  </span>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Campeón Gran Final
                  </h3>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div
                    className={`rounded-2xl border-2 p-5 text-center transition-all ${
                      tournament.champion
                        ? 'bg-gradient-to-b from-amber-950/80 to-slate-950 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-950/60 border-slate-800 border-dashed'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2.5 ${
                        tournament.champion
                          ? 'bg-amber-400/20 border border-amber-300 text-amber-300'
                          : 'bg-slate-900 border border-slate-800 text-slate-600'
                      }`}
                    >
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                      {tournament.champion ? '¡Campeón del Torneo!' : 'Por Coronar'}
                    </div>
                    <div className="text-base font-black text-white mt-1 truncate">
                      {tournament.champion ? tournament.champion.name : 'Esperando Gran Final'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================
              LIVE SPECTATOR DUAL-BOARD RADAR PANEL (for waiting/eliminated/projector)
              ================================================================= */}
          {spectatedRoomCode && spectatorView && (
            <div className="bg-slate-900/95 border-2 border-cyan-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-black text-[10px] uppercase">
                        MODO ESPECTADOR EN VIVO
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Sala {spectatorView.roomCode}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white mt-0.5">
                      {spectatorView.hostName}{' '}
                      <span className="text-cyan-400 font-mono">
                        ({spectatorView.hostShipsAlive}/5 ⚓)
                      </span>{' '}
                      vs {spectatorView.guestName}{' '}
                      <span className="text-cyan-400 font-mono">
                        ({spectatorView.guestShipsAlive}/5 ⚓)
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                    {spectatorView.status === 'placement' ? (
                      <span className="text-amber-300">
                        Ambos comandantes están desplegando su flota...
                      </span>
                    ) : spectatorView.status === 'combat' ? (
                      <span className="text-emerald-300">
                        Turno de fuego:{' '}
                        <strong>
                          {spectatorView.currentTurn === 'host'
                            ? spectatorView.hostName
                            : spectatorView.guestName}
                        </strong>
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold">
                        Ganador:{' '}
                        {spectatorView.winner === 'host'
                          ? spectatorView.hostName
                          : spectatorView.guestName}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSpectatedRoomCode(null)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Cerrar vista de espectador"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-2.5 mb-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Protección Antispoiler de Torneo:</strong> Los barcos intactos permanecen ocultos bajo el radar; se muestran en tiempo real todos los disparos, impactos en fuego y navíos hundidos.
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Board 1: Host Defense Grid (shots fired by Guest) */}
                <div className="flex flex-col items-center">
                  <BoardGrid
                    title={`Flota de ${spectatorView.hostName}`}
                    subtitle={`Barcos a flote: ${spectatorView.hostShipsAlive}/5 · Impactos recibidos: ${spectatorView.guestHits.length}`}
                    ships={spectatorView.hostSunkShips}
                    shots={spectatorView.guestShots}
                    hits={spectatorView.guestHits}
                    hideUndamagedShips={true}
                    interactive={false}
                    disabled={true}
                    compact={true}
                    showCoordinates={showCoordinates}
                    radarPulse={radarPulse && spectatorView.currentTurn === 'guest'}
                  />
                </div>

                {/* Board 2: Guest Defense Grid (shots fired by Host) */}
                <div className="flex flex-col items-center">
                  <BoardGrid
                    title={`Flota de ${spectatorView.guestName}`}
                    subtitle={`Barcos a flote: ${spectatorView.guestShipsAlive}/5 · Impactos recibidos: ${spectatorView.hostHits.length}`}
                    ships={spectatorView.guestSunkShips}
                    shots={spectatorView.hostShots}
                    hits={spectatorView.hostHits}
                    hideUndamagedShips={true}
                    interactive={false}
                    disabled={true}
                    compact={true}
                    showCoordinates={showCoordinates}
                    radarPulse={radarPulse && spectatorView.currentTurn === 'host'}
                  />
                </div>

                {/* Live Match Telemetry Log */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col h-full max-h-[420px]">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 pb-2 mb-2 border-b border-slate-800 flex items-center justify-between">
                    <span>Bitácora de Combate en Vivo</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {spectatorView.combatLogs.length} eventos
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                    {spectatorView.combatLogs.length === 0 ? (
                      <div className="text-slate-500 text-center py-8">
                        Esperando el primer disparo de artillería...
                      </div>
                    ) : (
                      spectatorView.combatLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-slate-200">
                              {log.shooter === 'host'
                                ? spectatorView.hostName
                                : log.shooter === 'guest'
                                ? spectatorView.guestName
                                : log.shooter}
                              :
                            </span>{' '}
                            <span className="text-slate-300">
                              {log.coordinate.row >= 0
                                ? `Disparo en ${formatCoordinate(log.coordinate)}`
                                : ''}{' '}
                              {log.shipName ? `— ${log.shipName}` : ''}
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                              log.result === 'sunk'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : log.result === 'hit'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {log.result === 'sunk'
                              ? 'HUNDIDO'
                              : log.result === 'hit'
                              ? 'IMPACTO'
                              : 'AGUA'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
