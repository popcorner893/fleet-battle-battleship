import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tactical Interface caught ErrorBoundary exception:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-xl mx-auto my-12 p-6 rounded-2xl bg-slate-900 border border-rose-900/80 shadow-2xl text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            {this.props.fallbackTitle || 'Interrupción Táctica en el Puesto de Mando'}
          </h2>
          <p className="text-xs text-slate-300 mb-4 max-w-md mx-auto">
            Se detectó una discrepancia en el flujo de telemetría de combate. La vista se ha protegido para evitar pérdida de datos del radar.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restablecer Radar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Volver al Inicio</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
