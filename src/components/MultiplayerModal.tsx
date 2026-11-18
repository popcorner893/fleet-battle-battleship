import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Play,
  ArrowRight,
  ShieldCheck,
  Radio,
  Wifi,
  Loader2,
  AlertCircle,
  ClipboardPaste,
  Sparkles,
} from 'lucide-react';
import { sound } from '../services/audio';
import { multiplayerService, normalizeRoomCode } from '../services/multiplayer';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterLobby: (roomCode: string, playerId: string, role: 'host' | 'guest', playerName: string) => void;
  initialRoomCode?: string | null;
}

async function copySafely(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  onEnterLobby,
  initialRoomCode,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('Comandante');
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [createdPlayerId, setCreatedPlayerId] = useState<string | null>(null);
  const [guestConnected, setGuestConnected] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedUrlRoom, setDetectedUrlRoom] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  // On open, detect if a room code was passed via URL or props
  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    let codeToUse = initialRoomCode || null;
    if (!codeToUse && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      codeToUse = params.get('room');
    }

    if (codeToUse) {
      const clean = normalizeRoomCode(codeToUse);
      setDetectedUrlRoom(clean);
      setJoinCode(clean);
      setTab('join');
    }
  }, [isOpen, initialRoomCode]);

  // Host lobby live polling: check if a rival connected while host is looking at the room code
  useEffect(() => {
    if (createdRoomCode && createdPlayerId) {
      const checkRoom = async () => {
        try {
          const room = await multiplayerService.getRoom(createdRoomCode, createdPlayerId);
          if (room && room.guestName && !guestConnected) {
            setGuestConnected(room.guestName);
            sound.playSonar();
          }
        } catch {
          // ignore transient poll errors
        }
      };

      checkRoom();
      pollIntervalRef.current = window.setInterval(checkRoom, 1500);

      const unsubscribe = multiplayerService.subscribeLocalTabs(createdRoomCode, () => {
        checkRoom();
      });

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        unsubscribe();
      };
    }
  }, [createdRoomCode, createdPlayerId, guestConnected]);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      sound.playClick();
      const res = await multiplayerService.createRoom(playerName);
      setCreatedRoomCode(res.roomCode);
      setCreatedPlayerId(res.playerId);
      setGuestConnected(null);
      sound.playSonar();
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo generar la sala.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartHostPlacement = () => {
    if (!createdRoomCode || !createdPlayerId) return;
    sound.playClick();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    onEnterLobby(createdRoomCode, createdPlayerId, 'host', playerName);
  };

  const handleJoinRoom = async () => {
    const cleanCode = normalizeRoomCode(joinCode);
    if (!cleanCode) {
      setErrorMsg('Por favor introduce el código de sala (ej. NAV-842 o 842).');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      sound.playClick();
      const res = await multiplayerService.joinRoom(cleanCode, playerName);
      sound.playSonar();
      onEnterLobby(res.roomCode, res.playerId, 'guest', playerName);
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          'No se pudo conectar a la sala. Verifica que el código sea correcto y que el rival haya creado la sala.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInputChange = (raw: string) => {
    setErrorMsg(null);
    // If user pasted a full URL or query string, automatically extract the room
    if (raw.includes('room=')) {
      const match = raw.match(/[?&]room=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        setJoinCode(normalizeRoomCode(match[1]));
        return;
      }
    }
    setJoinCode(raw.toUpperCase().trim());
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleCodeInputChange(text);
          sound.playClick();
        }
      }
    } catch {
      // clipboard read permission may be denied
    }
  };

  const handleCopyCode = async () => {
    if (!createdRoomCode) return;
    sound.playClick();
    const success = await copySafely(createdRoomCode);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  const handleCopyLink = async () => {
    if (!createdRoomCode) return;
    sound.playClick();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const directUrl = `${origin}${pathname}?room=${createdRoomCode}`;
    const success = await copySafely(directUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 id="mp-modal-title" className="text-base font-bold text-white tracking-tight">
                Combate Naval Multijugador en Red
              </h3>
              <p className="text-[11px] text-slate-400">
                Sincronización táctica en tiempo real entre 2 dispositivos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        {!createdRoomCode && (
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/70 border-b border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('create');
                setErrorMsg(null);
                sound.playClick();
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                tab === 'create'
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Crear Nueva Sala
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('join');
                setErrorMsg(null);
                sound.playClick();
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                tab === 'join'
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unirse con Código
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <span className="font-semibold block mb-0.5">Error de conexión</span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Commander Name Input */}
          {!createdRoomCode && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Tu Rango y Nombre Naval
              </label>
              <input
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Comandante..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-xs font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* TAB 1: CREATE ROOM */}
          {tab === 'create' && !createdRoomCode && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <Wifi className="w-4 h-4" />
                  <span>Conexión Directa entre Dispositivos</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Al crear una sala se generará un código táctico único (ej. <strong className="text-cyan-300 font-mono">NAV-842</strong>).
                  Compártelo con tu contrincante para que ingrese desde cualquier navegador, móvil u ordenador.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Protocolo persistente y Anti-Cheat SHA-256 habilitado.</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleCreateRoom}
                className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Estableciendo Frecuencia Naval Segura...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>Crear Sala de Combate</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ROOM CREATED SCREEN */}
          {createdRoomCode && (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/50 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-950/80">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                  Código de Sala Naval Activo
                </span>
                <div className="mt-1 text-3xl sm:text-4xl font-extrabold font-mono tracking-wider text-white select-all">
                  {createdRoomCode}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Tu rival puede unirse con el código completo <strong className="text-slate-200 font-mono">{createdRoomCode}</strong> o solo con los últimos dígitos <strong className="text-cyan-300 font-mono">{createdRoomCode.replace('NAV-', '')}</strong>.
                </p>
              </div>

              {/* Readonly clickable input for manual selection */}
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={createdRoomCode}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  title="Haz clic para seleccionar todo el código"
                  className="w-full py-2 px-3 text-center rounded-xl bg-slate-950/80 border border-slate-800 text-cyan-300 font-mono text-sm tracking-widest cursor-pointer hover:border-cyan-500/60 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Action Buttons for Code & Link */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? '¡Código Copiado!' : 'Copiar Código'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                </button>
              </div>

              {/* Live Rival Connection Status Indicator */}
              {guestConnected ? (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-center gap-2 animate-fade-in shadow-md">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    ¡Rival Conectado! ({guestConnected} está en la sala)
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-400 text-[11px] flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Esperando a que tu rival ingrese el código...</span>
                </div>
              )}

              {/* Enter placement */}
              <button
                type="button"
                onClick={handleStartHostPlacement}
                className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <span>Desplegar Mi Flota Naval</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 2: JOIN ROOM */}
          {tab === 'join' && !createdRoomCode && (
            <div className="space-y-4">
              {detectedUrlRoom && (
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs flex items-center gap-2 animate-fade-in">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-[11px]">
                    Invitación detectada en enlace: <strong>{detectedUrlRoom}</strong>
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Introduce el Código de Sala o Enlace
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={128}
                    value={joinCode}
                    onChange={(e) => handleCodeInputChange(e.target.value)}
                    placeholder="NAV-XXX o solo XXX"
                    className="flex-1 px-3.5 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-cyan-300 font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    title="Pegar del portapapeles"
                    className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span className="hidden sm:inline">Pegar</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Acepta tanto el código completo (<span className="text-slate-300 font-mono">NAV-842</span>), solo los 3 caracteres (<span className="text-slate-300 font-mono">842</span>) o el enlace completo.
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading || !joinCode.trim()}
                onClick={handleJoinRoom}
                className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Estableciendo Enlace de Red...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Conectar y Desplegar Flota</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

