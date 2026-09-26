/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClinicalSnapshot } from '../types/face';
import { BLENDSHAPE_TRANSLATIONS } from '../utils/emotionClassifier';
import {
  Activity,
  CheckCircle,
  Copy,
  Download,
  FileText,
  Search,
  Sliders,
  X,
} from 'lucide-react';

interface DiagnosticSnapshotModalProps {
  snapshot: ClinicalSnapshot | null;
  onClose: () => void;
}

export const DiagnosticSnapshotModal: React.FC<DiagnosticSnapshotModalProps> = ({
  snapshot,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  if (!snapshot) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSnapshotImage = () => {
    const link = document.createElement('a');
    link.href = snapshot.imageUrl;
    link.download = `neuroface-diagnostico-${snapshot.id}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera del informe modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm md:text-base font-sans flex items-center gap-2">
                Informe Diagnóstico Facial y Biomecánico
                <span className="font-mono text-xs text-teal-400 font-normal px-2 py-0.5 rounded bg-teal-950 border border-teal-800">
                  REF: {snapshot.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Capturado: {snapshot.timestamp} • Modelo: MediaPipe FaceLandmarker Float16
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del informe */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fotograma Capturado con overlay */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                Fotograma Inmovilizado con Capas Biométricas
              </h4>
              <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video bg-slate-950 shadow-inner">
                <img
                  src={snapshot.imageUrl}
                  alt="Instantánea Biométrica"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Conclusiones de diagnóstico clínico */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-400 pb-1.5 border-b border-slate-800/80">
                  <span>ESTADO PREDOMINANTE:</span>
                  <span
                    className="font-bold uppercase px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${snapshot.dominantEmotion.color}20`,
                      color: snapshot.dominantEmotion.color,
                      border: `1px solid ${snapshot.dominantEmotion.color}40`,
                    }}
                  >
                    {snapshot.dominantEmotion.label} ({snapshot.dominantEmotion.score}%)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>
                    <span>VALENCIA: </span>
                    <span className="text-slate-200 font-semibold">
                      {snapshot.circumplex.valence > 0
                        ? `+${snapshot.circumplex.valence.toFixed(2)}`
                        : snapshot.circumplex.valence.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span>ACTIVACIÓN: </span>
                    <span className="text-slate-200 font-semibold">
                      {snapshot.circumplex.arousal > 0
                        ? `+${snapshot.circumplex.arousal.toFixed(2)}`
                        : snapshot.circumplex.arousal.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span>SIMETRÍA: </span>
                    <span className="text-slate-200 font-semibold">
                      {snapshot.biomechanics.facialSymmetryScore}%
                    </span>
                  </div>
                  <div>
                    <span>FATIGA: </span>
                    <span className="text-slate-200 font-semibold">
                      {snapshot.biomechanics.fatigueRisk}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 leading-relaxed">
                  <span className="text-teal-400">UNIDAD DE ACCIÓN (FACS): </span>
                  {snapshot.dominantEmotion.facsDescription}
                </p>
              </div>
            </div>

            {/* Desglose de Emociones y Top Blendshapes */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400 mb-2">
                  Espectro de 7 Emociones Primarias
                </h4>
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {snapshot.emotions.map((e) => (
                    <div key={e.type} className="font-mono text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-300">{e.label}</span>
                        <span className="font-bold" style={{ color: e.color }}>
                          {e.score}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${e.score}%`, backgroundColor: e.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Microactivaciones Musculares Top */}
              <div>
                <h4 className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400 mb-2">
                  Activaciones Musculares Clave Detectadas
                </h4>
                <div className="space-y-1.5 font-mono text-xs">
                  {snapshot.topBlendshapes.map((bs) => (
                    <div
                      key={bs.categoryName}
                      className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center justify-between"
                    >
                      <span className="text-slate-300 text-xs">{bs.displayName}</span>
                      <span className="font-bold text-teal-400">{bs.score.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de modal con botones de exportación */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-500">
            CONFIDENCIAL • USO INVESTIGATIVO Y CLÍNICO
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar JSON
                </>
              )}
            </button>

            <button
              onClick={handleDownloadSnapshotImage}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Imagen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
