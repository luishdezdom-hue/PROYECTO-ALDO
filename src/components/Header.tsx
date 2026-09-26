/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Camera,
  Cpu,
  Download,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { EmotionScore } from '../types/face';

interface HeaderProps {
  status: 'uninitialized' | 'loading' | 'ready' | 'error';
  fps: number;
  inferenceMs: number;
  dominantEmotion: EmotionScore | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetSession: () => void;
  onTakeSnapshot: () => void;
  onExportReport: () => void;
  isSimulatorMode: boolean;
  onToggleSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  fps,
  inferenceMs,
  dominantEmotion,
  soundEnabled,
  onToggleSound,
  onResetSession,
  onTakeSnapshot,
  onExportReport,
  isSimulatorMode,
  onToggleSimulator,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Marca e identificación de laboratorio */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base md:text-lg tracking-tight font-sans text-slate-100">
                NeuroFace<span className="text-teal-400 font-mono text-sm ml-1 px-1.5 py-0.5 rounded bg-teal-950/70 border border-teal-800/60">LAB v2.4</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === 'ready'
                      ? 'bg-emerald-400 animate-ping'
                      : status === 'loading'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                {status === 'ready'
                  ? isSimulatorMode
                    ? 'SIMULADOR BIOMÉDICO'
                    : 'MOTOR TFLite ONLINE'
                  : status === 'loading'
                  ? 'COMPILANDO RED TFLite...'
                  : 'OFFLINE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono hidden md:block">
              Telemetría Facial de 52 Blendshapes • MediaPipe Face Landmarker 3D
            </p>
          </div>
        </div>

        {/* Telemetría en tiempo real: Latencia y FPS */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span>LATENCIA:</span>
            <span
              className={`font-semibold ${
                inferenceMs < 25 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {inferenceMs > 0 ? `${inferenceMs.toFixed(1)}ms` : '--'}
            </span>
          </div>

          <div className="w-px h-3.5 bg-slate-800" />

          <div className="flex items-center gap-1.5 text-slate-400">
            <span>FPS:</span>
            <span
              className={`font-semibold ${
                fps >= 30 ? 'text-emerald-400' : fps > 15 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {fps > 0 ? fps : '--'}
            </span>
          </div>

          {dominantEmotion && (
            <>
              <div className="w-px h-3.5 bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">ESTADO:</span>
                <span
                  className="font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-[11px]"
                  style={{
                    backgroundColor: `${dominantEmotion.color}20`,
                    color: dominantEmotion.color,
                    border: `1px solid ${dominantEmotion.color}50`,
                  }}
                >
                  {dominantEmotion.label} ({dominantEmotion.score}%)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Botones de acción clínica */}
        <div className="flex items-center gap-2">
          {/* Alternar Sonido */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Silenciar alertas acústicas' : 'Activar tono de cambio de estado'}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/80 text-xs"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-teal-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Alternar modo simulación / cámara */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
              isSimulatorMode
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Alternar entre cámara en directo y generador sintético"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {isSimulatorMode ? 'Modo Sintético' : 'Simulador'}
            </span>
          </button>

          {/* Tomar instantánea de diagnóstico */}
          <button
            onClick={onTakeSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white font-mono shadow-sm transition-all active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Instantánea</span>
          </button>

          {/* Exportar reporte */}
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono transition-colors"
            title="Exportar telemetría en JSON/CSV"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Reiniciar sesión */}
          <button
            onClick={onResetSession}
            title="Reiniciar métricas acumuladas"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors border border-slate-700/80"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
