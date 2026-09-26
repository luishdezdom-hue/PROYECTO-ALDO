/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BiomechanicalMetrics, BlendshapeItem } from '../types/face';
import {
  Compass,
  Eye,
  Gauge,
  Percent,
  Scale,
  Sparkles,
  Zap,
} from 'lucide-react';

interface BiomechanicalTelemetryProps {
  biomechanics: BiomechanicalMetrics;
  topBlendshapes: BlendshapeItem[];
}

export const BiomechanicalTelemetry: React.FC<BiomechanicalTelemetryProps> = ({
  biomechanics,
  topBlendshapes,
}) => {
  const { headPose, facialSymmetryScore, attentionScore, fatigueRisk } = biomechanics;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-teal-400" />
          <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-200">
            Biometría y Dinámica Muscular
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          52 BLENDSHAPES ARKIT
        </span>
      </div>

      <div className="space-y-4">
        {/* Métricas clave en tarjetas compactas */}
        <div className="grid grid-cols-2 gap-2 font-mono">
          {/* Simetría Facial */}
          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Scale className="w-3 h-3 text-teal-400" />
                SIMETRÍA FACIAL
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-100">
                {facialSymmetryScore}%
              </span>
              <span
                className={`text-[10px] px-1 rounded ${
                  facialSymmetryScore > 85
                    ? 'text-emerald-400 bg-emerald-950/60'
                    : facialSymmetryScore > 70
                    ? 'text-amber-400 bg-amber-950/60'
                    : 'text-rose-400 bg-rose-950/60'
                }`}
              >
                {facialSymmetryScore > 85 ? 'ÓPTIMA' : 'ASIMÉTRICA'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-teal-400 h-full transition-all duration-300"
                style={{ width: `${facialSymmetryScore}%` }}
              />
            </div>
          </div>

          {/* Nivel de Atención */}
          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                VIGILANCIA / FOCO
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-100">{attentionScore}%</span>
              <span
                className={`text-[10px] px-1 rounded ${
                  attentionScore > 75
                    ? 'text-emerald-400 bg-emerald-950/60'
                    : attentionScore > 50
                    ? 'text-amber-400 bg-amber-950/60'
                    : 'text-rose-400 bg-rose-950/60'
                }`}
              >
                {attentionScore > 75 ? 'ALTO' : 'DISPERSO'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${attentionScore}%` }}
              />
            </div>
          </div>

          {/* Ojos y Parpadeo */}
          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-indigo-400" />
                PARPADEO (BPM)
              </span>
              <span className="text-slate-500">EAR {biomechanics.eyeAspectRatioLeft}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-100">
                {biomechanics.blinksPerMinute}{' '}
                <span className="text-xs font-normal text-slate-400">/min</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  fatigueRisk === 'Bajo'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : fatigueRisk === 'Moderado'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                    : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                }`}
              >
                Fatiga: {fatigueRisk}
              </span>
            </div>
          </div>

          {/* Apertura Bucal */}
          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-amber-400" />
                APERTURA MANDIBULAR
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-100">
                {biomechanics.mouthOpenRatio}%
              </span>
              <span className="text-[10px] text-slate-400">
                {biomechanics.mouthOpenRatio > 35 ? 'Abierta' : 'Cerrada'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${biomechanics.mouthOpenRatio}%` }}
              />
            </div>
          </div>
        </div>

        {/* Orientación Craneal 3D (Gimbal Readings) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              POSTURA CEFÁLICA (HEAD POSE)
            </span>
            <span className="text-slate-500 text-[10px]">GRADOS ANGULARES</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">YAW (GIRO)</div>
              <div className="text-sm font-bold text-emerald-400">
                {headPose.yaw > 0 ? `+${headPose.yaw}°` : `${headPose.yaw}°`}
              </div>
            </div>

            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">PITCH (INCLIN.)</div>
              <div className="text-sm font-bold text-cyan-400">
                {headPose.pitch > 0 ? `+${headPose.pitch}°` : `${headPose.pitch}°`}
              </div>
            </div>

            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">ROLL (LATERAL)</div>
              <div className="text-sm font-bold text-amber-400">
                {headPose.roll > 0 ? `+${headPose.roll}°` : `${headPose.roll}°`}
              </div>
            </div>
          </div>
        </div>

        {/* Top Blendshapes Activos (Microexpresiones) */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              TOP ACTIVACIONES FACIALES
            </span>
            <span className="text-[10px] text-slate-500">MÁX 1.000</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {topBlendshapes.slice(0, 5).map((bs) => (
              <div
                key={bs.categoryName}
                className="bg-slate-950/70 border border-slate-800/80 px-2.5 py-1.5 rounded flex items-center justify-between"
              >
                <div className="truncate max-w-[170px]" title={bs.displayName}>
                  <span className="text-slate-300 text-[11px]">{bs.displayName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, bs.score * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-teal-300 w-10 text-right">
                    {bs.score.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
