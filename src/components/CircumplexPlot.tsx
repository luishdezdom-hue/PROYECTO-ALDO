/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { CircumplexCoord, EmotionScore } from '../types/face';
import { Compass, Target } from 'lucide-react';

interface CircumplexPlotProps {
  coord: CircumplexCoord;
  dominantEmotion: EmotionScore | null;
}

export const CircumplexPlot: React.FC<CircumplexPlotProps> = ({
  coord,
  dominantEmotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Array<{ x: number; y: number; alpha: number }>>([]);

  // Interpretar cuadrante afectivo clínico
  const getQuadrantInfo = (val: number, aro: number) => {
    if (val >= 0 && aro >= 0) {
      return {
        name: 'Activación Positiva',
        states: 'Entusiasmo, Euforia, Alegría',
        quadrant: 'Q1',
        color: '#10b981',
      };
    } else if (val < 0 && aro >= 0) {
      return {
        name: 'Activación Negativa',
        states: 'Tensión, Alarma, Ira, Ansiedad',
        quadrant: 'Q2',
        color: '#ef4444',
      };
    } else if (val < 0 && aro < 0) {
      return {
        name: 'Desactivación Negativa',
        states: 'Tristeza, Apatía, Fatiga',
        quadrant: 'Q3',
        color: '#6366f1',
      };
    } else {
      return {
        name: 'Desactivación Positiva',
        states: 'Serenidad, Calma, Relajación',
        quadrant: 'Q4',
        color: '#06b6d4',
      };
    }
  };

  const quad = getQuadrantInfo(coord.valence, coord.arousal);

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

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 22;

    // 1. Fondos sutiles de los 4 cuadrantes
    // Q1 (arriba der)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
    ctx.fillRect(centerX, centerY - radius, radius, radius);

    // Q2 (arriba izq)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
    ctx.fillRect(centerX - radius, centerY - radius, radius, radius);

    // Q3 (abajo izq)
    ctx.fillStyle = 'rgba(99, 102, 241, 0.04)';
    ctx.fillRect(centerX - radius, centerY, radius, radius);

    // Q4 (abajo der)
    ctx.fillStyle = 'rgba(6, 182, 212, 0.04)';
    ctx.fillRect(centerX, centerY, radius, radius);

    // 2. Círculos concéntricos de referencia
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * ratio, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // 3. Ejes Cartesianos
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    // Eje X (Valencia)
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Eje Y (Arousal)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // 4. Etiquetas de los Ejes
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('+ ACTIVACIÓN', centerX, centerY - radius + 10);
    ctx.fillText('- ACTIVACIÓN', centerX, centerY + radius - 4);
    ctx.textAlign = 'left';
    ctx.fillText('+ VALENCIA', centerX + radius - 55, centerY - 6);
    ctx.textAlign = 'right';
    ctx.fillText('- VALENCIA', centerX - radius + 55, centerY - 6);

    // 5. Historial de estela (trail)
    const currentX = centerX + coord.valence * (radius * 0.88);
    const currentY = centerY - coord.arousal * (radius * 0.88); // invertido porque Y crece hacia abajo

    trailRef.current.push({ x: currentX, y: currentY, alpha: 1.0 });
    if (trailRef.current.length > 18) {
      trailRef.current.shift();
    }

    trailRef.current.forEach((pt, idx) => {
      pt.alpha *= 0.88;
      ctx.fillStyle = `rgba(6, 182, 212, ${pt.alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2 + (idx / 18) * 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 6. Retícula y punto actual del sujeto
    const markerColor = dominantEmotion?.color || '#06b6d4';

    // Líneas guía hacia los ejes
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.beginPath();
    ctx.moveTo(currentX, centerY);
    ctx.lineTo(currentX, currentY);
    ctx.lineTo(centerX, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Anillo de pulso exterior
    ctx.strokeStyle = markerColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 9, 0, 2 * Math.PI);
    ctx.stroke();

    // Punto central
    ctx.fillStyle = markerColor;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Retículo en cruz
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(currentX - 5, currentY);
    ctx.lineTo(currentX + 5, currentY);
    ctx.moveTo(currentX, currentY - 5);
    ctx.lineTo(currentX, currentY + 5);
    ctx.stroke();
  }, [coord, dominantEmotion]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-teal-400" />
          <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-200">
            Modelo Circumplex de Russell (2D)
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          AFECTO BIDIMENSIONAL
        </span>
      </div>

      {/* Canvas del plano cartesiano */}
      <div className="relative aspect-square w-full max-w-[280px] mx-auto my-1 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Lecturas numéricas de coordenadas y cuadrante */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2.5 font-mono text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">CUADRANTE:</span>
          <span
            className="font-bold text-[11px] px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${quad.color}15`,
              color: quad.color,
              border: `1px solid ${quad.color}40`,
            }}
          >
            {quad.quadrant} • {quad.name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
          <div>
            <span className="text-slate-500">VALENCIA: </span>
            <span className={`font-semibold ${coord.valence >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {coord.valence > 0 ? `+${coord.valence.toFixed(2)}` : coord.valence.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">ACTIVACIÓN: </span>
            <span className={`font-semibold ${coord.arousal >= 0 ? 'text-cyan-400' : 'text-indigo-400'}`}>
              {coord.arousal > 0 ? `+${coord.arousal.toFixed(2)}` : coord.arousal.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 pt-0.5">
          <span className="text-slate-500">ESTADOS: </span>
          <span className="text-slate-300">{quad.states}</span>
        </div>
      </div>
    </div>
  );
};
