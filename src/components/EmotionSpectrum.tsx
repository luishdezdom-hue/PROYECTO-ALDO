/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EmotionScore } from '../types/face';
import { Activity, Brain, ShieldAlert, Sparkles } from 'lucide-react';

interface EmotionSpectrumProps {
  emotions: EmotionScore[];
  dominantEmotion: EmotionScore | null;
}

const EMOTION_ICONS: Record<string, string> = {
  felicidad: '😊',
  neutral: '😐',
  sorpresa: '😲',
  ira: '😠',
  tristeza: '😢',
  miedo: '😨',
  asco: '🤢',
};

export const EmotionSpectrum: React.FC<EmotionSpectrumProps> = ({
  emotions,
  dominantEmotion,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      {/* Encabezado clínico */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-teal-400" />
          <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-200">
            Espectro Emocional de Ekman (FACS)
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          7 CANALES
        </span>
      </div>

      {/* Tarjeta heroica de emoción dominante */}
      {dominantEmotion && (
        <div
          className="rounded-lg p-3.5 mb-4 border transition-all duration-300 relative overflow-hidden"
          style={{
            backgroundColor: `${dominantEmotion.color}10`,
            borderColor: `${dominantEmotion.color}40`,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl filter drop-shadow-sm select-none">
                {EMOTION_ICONS[dominantEmotion.type] || '😐'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
                    Predominante
                  </span>
                  <span
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: dominantEmotion.color }}
                  />
                </div>
                <h3
                  className="text-xl font-bold uppercase tracking-tight font-sans"
                  style={{ color: dominantEmotion.color }}
                >
                  {dominantEmotion.label}
                </h3>
              </div>
            </div>

            {/* Puntuación grande de certeza */}
            <div className="text-right">
              <span
                className="text-2xl md:text-3xl font-mono font-extrabold"
                style={{ color: dominantEmotion.color }}
              >
                {dominantEmotion.score}%
              </span>
              <p className="text-[10px] font-mono text-slate-400">CERTEZA NEURAL</p>
            </div>
          </div>

          {/* Microdescripción científica FACS */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-teal-400" />
              {dominantEmotion.facsDescription}
            </span>
          </div>
        </div>
      )}

      {/* Desglose de barras de las 7 emociones */}
      <div className="space-y-2.5">
        {emotions.map((emotion) => {
          const isDominant = dominantEmotion?.type === emotion.type;

          return (
            <div key={emotion.type} className="group">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm select-none">
                    {EMOTION_ICONS[emotion.type] || '•'}
                  </span>
                  <span
                    className={`font-semibold transition-colors ${
                      isDominant ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {emotion.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-[11px]"
                    style={{ color: isDominant ? emotion.color : '#94a3b8' }}
                  >
                    {emotion.score}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso de laboratorio con marcas */}
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5 relative">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.max(3, emotion.score)}%`,
                    backgroundColor: emotion.color,
                    boxShadow: isDominant ? `0 0 10px ${emotion.color}60` : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota científica al pie */}
      <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>ESTÁNDAR: FACS (EKMAN & FRIESEN)</span>
        <span>MUESTREO: 60 HZ</span>
      </div>
    </div>
  );
};
