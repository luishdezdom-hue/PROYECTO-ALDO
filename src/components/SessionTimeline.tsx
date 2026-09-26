/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { TelemetryDataPoint, EmotionScore, BiomechanicalMetrics } from '../types/face';
import { History, TrendingUp, Clock, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface SessionTimelineProps {
  history: TelemetryDataPoint[];
  sessionDurationSec: number;
  dominantAccumulated: { emotion: string; percentage: number; color: string };
  stabilityScore: number;
  avgSymmetry: number;
  eventLogs: Array<{ time: string; text: string; color: string }>;
  onExportCsv: () => void;
}

export const SessionTimeline: React.FC<SessionTimelineProps> = ({
  history,
  sessionDurationSec,
  dominantAccumulated,
  stabilityScore,
  avgSymmetry,
  eventLogs,
  onExportCsv,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Formato mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Renderizar gráfico de ondas multi-canal en Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // Fondo y cuadrícula
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Líneas horizontales de referencia
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.lineWidth = 1;
    const midY = height / 2;

    // Línea central (cero)
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Líneas guías superior e inferior
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.2);
    ctx.lineTo(width, height * 0.2);
    ctx.moveTo(0, height * 0.8);
    ctx.lineTo(width, height * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);

    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Recopilando telemetría temporal continua...', width / 2, height / 2 + 4);
      return;
    }

    const stepX = width / Math.max(30, history.length - 1);

    // 1. Dibujar Curva de Valencia (-1 a +1 mapeado a altura)
    ctx.strokeStyle = '#10b981'; // esmeralda
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((point, idx) => {
      const x = idx * stepX;
      // valencia: -1 abajo (height * 0.9), 0 en midY, +1 arriba (height * 0.1)
      const y = midY - point.valence * (height * 0.38);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Dibujar Curva de Activación/Arousal (-1 a +1)
    ctx.strokeStyle = '#06b6d4'; // cian
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    history.forEach((point, idx) => {
      const x = idx * stepX;
      const y = midY - point.arousal * (height * 0.38);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 3. Dibujar Curva de Certeza/Confianza (0 a 100%)
    ctx.strokeStyle = '#f59e0b'; // ámbar
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    history.forEach((point, idx) => {
      const x = idx * stepX;
      const y = height - (point.confidence / 100) * (height * 0.85);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }, [history]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      {/* Encabezado y controles de exportación */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-teal-400" />
          <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-200">
            Registro Temporal Continuo (Últimos 60s)
          </h2>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Valencia
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 text-[11px]">
              <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Arousal
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 text-[11px]">
              <span className="w-2.5 h-0.5 bg-amber-400 border-dashed inline-block" /> Confianza
            </span>
          </div>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-[11px] transition-colors"
            title="Descargar conjunto de datos en CSV"
          >
            <FileSpreadsheet className="w-3 h-3 text-teal-400" />
            <span>CSV Dataset</span>
          </button>
        </div>
      </div>

      {/* Gráfico y panel de eventos lado a lado en pantallas grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico Canvas 60s */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div className="relative h-44 w-full rounded-lg overflow-hidden border border-slate-800/80">
            <canvas ref={canvasRef} className="w-full h-full" />

            <div className="absolute top-2 left-2 pointer-events-none font-mono text-[10px] text-slate-500">
              VALENCIA / ACTIVACIÓN AFECTIVA
            </div>
            <div className="absolute bottom-2 right-2 pointer-events-none font-mono text-[10px] text-slate-500">
              T - 0s (VIVO)
            </div>
          </div>

          {/* Estadísticas de sesión */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 font-mono text-xs">
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">DURACIÓN SESIÓN</span>
              <span className="text-sm font-bold text-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-teal-400" />
                {formatTime(sessionDurationSec)}
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">ESTABILIDAD</span>
              <span className="text-sm font-bold text-emerald-400">
                {stabilityScore}%
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">SIMETRÍA MEDIA</span>
              <span className="text-sm font-bold text-cyan-400">
                {avgSymmetry}%
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">PREDOMINIO GLOBAL</span>
              <span
                className="text-xs font-bold uppercase truncate block"
                style={{ color: dominantAccumulated.color }}
              >
                {dominantAccumulated.emotion} ({dominantAccumulated.percentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Registro de transiciones y microexpresiones */}
        <div className="bg-slate-950 rounded-lg border border-slate-800/80 p-3 flex flex-col h-full max-h-56">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-300">TRANSICIONES AFECTIVAS</span>
            <span className="text-[10px] text-slate-500">EVENT LOG</span>
          </div>

          <div className="overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] flex-1">
            {eventLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-xs">
                Iniciando monitorización de microexpresiones...
              </p>
            ) : (
              eventLogs.slice(0, 10).map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between py-1 px-1.5 rounded bg-slate-900/60 border border-slate-800/40"
                >
                  <span className="text-slate-500 text-[10px] mr-2">{log.time}</span>
                  <span
                    className="font-medium flex-1 truncate text-right"
                    style={{ color: log.color }}
                  >
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
