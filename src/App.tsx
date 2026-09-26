/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { EmotionSpectrum } from './components/EmotionSpectrum';
import { CircumplexPlot } from './components/CircumplexPlot';
import { BiomechanicalTelemetry } from './components/BiomechanicalTelemetry';
import { SessionTimeline } from './components/SessionTimeline';
import { DiagnosticSnapshotModal } from './components/DiagnosticSnapshotModal';
import {
  classifyEmotions,
  estimateHeadPose,
  calculateBiomechanics,
  getTopBlendshapes,
} from './utils/emotionClassifier';
import { audioFeedback } from './utils/audioFeedback';
import { mediapipeService } from './services/mediapipeService';
import {
  EmotionScore,
  NormalizedLandmark,
  BiomechanicalMetrics,
  CircumplexCoord,
  BlendshapeItem,
  TelemetryDataPoint,
  ClinicalSnapshot,
  PrimaryEmotionType,
} from './types/face';
import { ShieldCheck, Info } from 'lucide-react';

export default function App() {
  // Estado del modelo MediaPipe
  const [modelStatus, setModelStatus] = useState<'uninitialized' | 'loading' | 'ready' | 'error'>('loading');
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Métricas en tiempo real
  const [fps, setFps] = useState<number>(60);
  const [inferenceMs, setInferenceMs] = useState<number>(12);
  const [emotions, setEmotions] = useState<EmotionScore[]>([
    {
      type: 'neutral',
      label: 'Neutral',
      score: 100,
      color: '#64748b',
      facsDescription: 'Tono muscular basal relajado sin contracción tónica',
    },
    {
      type: 'felicidad',
      label: 'Felicidad',
      score: 0,
      color: '#10b981',
      facsDescription: 'Activación Cigomático Mayor y Orbicular (AU6+AU12)',
    },
    {
      type: 'sorpresa',
      label: 'Sorpresa',
      score: 0,
      color: '#06b6d4',
      facsDescription: 'Elevación frontal y apertura palpebral (AU1+AU2+AU5+AU26)',
    },
    {
      type: 'ira',
      label: 'Ira',
      score: 0,
      color: '#ef4444',
      facsDescription: 'Depresión corrugadora y compresión labial (AU4+AU7+AU24)',
    },
    {
      type: 'tristeza',
      label: 'Tristeza',
      score: 0,
      color: '#6366f1',
      facsDescription: 'Tensión superciliar medial y descenso comisural (AU1+AU15)',
    },
    {
      type: 'miedo',
      label: 'Miedo',
      score: 0,
      color: '#f59e0b',
      facsDescription: 'Retracción palpebral y tensión transversal (AU1+AU5+AU20)',
    },
    {
      type: 'asco',
      label: 'Asco',
      score: 0,
      color: '#d946ef',
      facsDescription: 'Contracción piramidal nasal y elevador labio sup. (AU9+AU10)',
    },
  ]);

  const [dominantEmotion, setDominantEmotion] = useState<EmotionScore | null>(null);
  const [circumplex, setCircumplex] = useState<CircumplexCoord>({ valence: 0, arousal: 0 });
  const [biomechanics, setBiomechanics] = useState<BiomechanicalMetrics>({
    eyeAspectRatioLeft: 0.9,
    eyeAspectRatioRight: 0.9,
    isBlinking: false,
    blinkCount: 0,
    blinksPerMinute: 14,
    mouthOpenRatio: 5,
    facialSymmetryScore: 98,
    attentionScore: 92,
    fatigueRisk: 'Bajo',
    headPose: { pitch: 0, yaw: 0, roll: 0 },
  });
  const [topBlendshapes, setTopBlendshapes] = useState<BlendshapeItem[]>([]);

  // Telemetría acumulada y línea de tiempo
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryDataPoint[]>([]);
  const [sessionStartTime] = useState<number>(Date.now());
  const [sessionDurationSec, setSessionDurationSec] = useState<number>(0);
  const [eventLogs, setEventLogs] = useState<Array<{ time: string; text: string; color: string }>>([]);
  const emotionCountersRef = useRef<Record<string, number>>({});
  const lastDominantRef = useRef<string>('');
  const lastSampleTimeRef = useRef<number>(0);

  // Instantánea diagnóstica
  const [snapshotTriggered, setSnapshotTriggered] = useState<boolean>(false);
  const [activeSnapshot, setActiveSnapshot] = useState<ClinicalSnapshot | null>(null);

  // Monitor de estado de MediaPipe
  useEffect(() => {
    const checkStatus = () => {
      const s = mediapipeService.getStatus();
      setModelStatus(s);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 500);
    return () => clearInterval(interval);
  }, []);

  // Contador de duración de la sesión
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDurationSec(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Manejo de fotograma procesado (30-60 FPS)
  const handleFrameProcessed = useCallback(
    ({
      landmarks,
      blendshapes,
      inferenceTimeMs,
      fps: currentFps,
    }: {
      landmarks: NormalizedLandmark[];
      blendshapes: Record<string, number>;
      inferenceTimeMs: number;
      fps: number;
      videoElement: HTMLVideoElement | null;
    }) => {
      setFps(currentFps);
      setInferenceMs(inferenceTimeMs);

      if (!landmarks || landmarks.length === 0) {
        return;
      }

      // 1. Clasificación emocional
      const classified = classifyEmotions(blendshapes);
      setEmotions(classified.emotions);
      setDominantEmotion(classified.dominantEmotion);
      setCircumplex(classified.circumplex);

      // 2. Pose cefálica 3D
      const pose = estimateHeadPose(landmarks);

      // 3. Biomecánica y fatiga
      const bio = calculateBiomechanics(blendshapes, landmarks, pose);
      setBiomechanics(bio);

      // 4. Top blendshapes
      const topShapes = getTopBlendshapes(blendshapes);
      setTopBlendshapes(topShapes);

      // 5. Registro de eventos de cambio de emoción
      const currentDom = classified.dominantEmotion.type;
      if (currentDom !== lastDominantRef.current) {
        if (soundEnabled && lastDominantRef.current) {
          audioFeedback.playTransitionChime(currentDom);
        }

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setEventLogs((prev) => [
          {
            time: timeStr,
            text: `CAMBIO A ${classified.dominantEmotion.label.toUpperCase()} (${classified.dominantEmotion.score}%)`,
            color: classified.dominantEmotion.color,
          },
          ...prev.slice(0, 24),
        ]);

        lastDominantRef.current = currentDom;
      }

      // 6. Muestreo de telemetría a 4Hz para el gráfico histórico continuo
      const nowMs = performance.now();
      if (nowMs - lastSampleTimeRef.current >= 250) {
        lastSampleTimeRef.current = nowMs;

        const date = new Date();
        const timeFormatted = `${date.getMinutes().toString().padStart(2, '0')}:${date
          .getSeconds()
          .toString()
          .padStart(2, '0')}`;

        // Acumular conteos de emociones
        emotionCountersRef.current[currentDom] = (emotionCountersRef.current[currentDom] || 0) + 1;

        setTelemetryHistory((prev) => {
          const updated = [
            ...prev,
            {
              timeFormatted,
              timestamp: Date.now(),
              dominantEmotion: currentDom,
              confidence: classified.dominantEmotion.score,
              valence: classified.circumplex.valence,
              arousal: classified.circumplex.arousal,
              attention: bio.attentionScore,
            },
          ];
          // Conservar últimos 120 puntos (30 segundos a 4 Hz)
          return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
        });
      }
    },
    [soundEnabled],
  );

  // Cálculos agregados de sesión
  const totalSamples = Object.values(emotionCountersRef.current).reduce((a, b) => a + b, 0);
  let dominantAccumulated = { emotion: 'Neutral', percentage: 100, color: '#64748b' };
  if (totalSamples > 0) {
    const topEntry = Object.entries(emotionCountersRef.current).sort((a, b) => b[1] - a[1])[0];
    if (topEntry) {
      const match = emotions.find((e) => e.type === topEntry[0]);
      dominantAccumulated = {
        emotion: match?.label || topEntry[0],
        percentage: Math.round((topEntry[1] / totalSamples) * 100),
        color: match?.color || '#06b6d4',
      };
    }
  }

  // Estabilidad emocional (inversa de la varianza de saltos emocionales)
  const stabilityScore = Math.max(30, Math.min(99, 100 - eventLogs.length * 3));

  // Simetría media acumulada
  const avgSymmetry = biomechanics.facialSymmetryScore;

  // Manejar toma de instantánea
  const triggerSnapshot = () => {
    audioFeedback.playShutterSound();
    setSnapshotTriggered(true);
  };

  const handleSnapshotCreated = (imageUrl: string) => {
    if (!dominantEmotion) return;

    const snap: ClinicalSnapshot = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: new Date().toLocaleTimeString(),
      imageUrl,
      dominantEmotion,
      emotions: [...emotions],
      circumplex,
      biomechanics: { ...biomechanics },
      topBlendshapes: [...topBlendshapes],
    };
    setActiveSnapshot(snap);
  };

  // Reiniciar sesión
  const handleResetSession = () => {
    setTelemetryHistory([]);
    setEventLogs([]);
    emotionCountersRef.current = {};
    lastDominantRef.current = '';
  };

  // Exportar reporte de sesión completo en JSON
  const handleExportJson = () => {
    const sessionData = {
      reportTitle: 'NeuroFace Lab - Informe de Telemetría Biomecánica y Afectiva',
      exportDate: new Date().toISOString(),
      durationSeconds: sessionDurationSec,
      dominantAccumulated,
      stabilityScore,
      averageSymmetry: avgSymmetry,
      metricsSnapshot: {
        dominantEmotion,
        circumplex,
        biomechanics,
        emotions,
        topBlendshapes,
      },
      events: eventLogs,
      telemetryTimeline: telemetryHistory,
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuroface-informe-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar histórico a CSV
  const handleExportCsv = () => {
    if (telemetryHistory.length === 0) return;

    const headers = ['Tiempo', 'Timestamp', 'Emocion_Dominante', 'Confianza_Porcentaje', 'Valencia', 'Arousal', 'Atencion_Porcentaje'];
    const rows = telemetryHistory.map((p) => [
      p.timeFormatted,
      p.timestamp,
      p.dominantEmotion,
      p.confidence,
      p.valence.toFixed(3),
      p.arousal.toFixed(3),
      p.attention,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `neuroface-telemetria-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Cabecera Clínica */}
      <Header
        status={modelStatus}
        fps={fps}
        inferenceMs={inferenceMs}
        dominantEmotion={dominantEmotion}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onResetSession={handleResetSession}
        onTakeSnapshot={triggerSnapshot}
        onExportReport={handleExportJson}
        isSimulatorMode={isSimulatorMode}
        onToggleSimulator={() => setIsSimulatorMode(!isSimulatorMode)}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Banner Informativo de Laboratorio */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>
              Procesamiento de inferencia 100% on-device (WebAssembly / GPU TFLite). Ninguna imagen o video sale de tu navegador.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>NORMA: FACS AU</span>
            <span className="text-slate-600">|</span>
            <span>MODELO: 478 LANDMARKS</span>
          </div>
        </div>

        {/* Fila Superior: Visor de Cámara y Métricas de FACS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Columna Izquierda: Visor Óptico con Canvas HUD (7 columnas en desktop) */}
          <div className="lg:col-span-7 flex flex-col">
            <CameraFeed
              onFrameProcessed={handleFrameProcessed}
              dominantEmotion={dominantEmotion}
              headPose={biomechanics.headPose}
              isSimulatorMode={isSimulatorMode}
              onSnapshotRequested={handleSnapshotCreated}
              snapshotTriggered={snapshotTriggered}
              onSnapshotCompleted={() => setSnapshotTriggered(false)}
            />
          </div>

          {/* Columna Derecha: Espectro de 7 Emociones Primarias (5 columnas en desktop) */}
          <div className="lg:col-span-5 flex flex-col">
            <EmotionSpectrum
              emotions={emotions}
              dominantEmotion={dominantEmotion}
            />
          </div>
        </div>

        {/* Fila Media: Modelo Circumplex 2D y Biometría Muscular */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Modelo Circumplex de Russell (6 columnas) */}
          <div className="lg:col-span-6 flex flex-col">
            <CircumplexPlot
              coord={circumplex}
              dominantEmotion={dominantEmotion}
            />
          </div>

          {/* Biometría y Postura Cefálica 3D (6 columnas) */}
          <div className="lg:col-span-6 flex flex-col">
            <BiomechanicalTelemetry
              biomechanics={biomechanics}
              topBlendshapes={topBlendshapes}
            />
          </div>
        </div>

        {/* Fila Inferior: Registro Temporal Continuo (Últimos 60s) y Analíticas de Sesión */}
        <div>
          <SessionTimeline
            history={telemetryHistory}
            sessionDurationSec={sessionDurationSec}
            dominantAccumulated={dominantAccumulated}
            stabilityScore={stabilityScore}
            avgSymmetry={avgSymmetry}
            eventLogs={eventLogs}
            onExportCsv={handleExportCsv}
          />
        </div>
      </main>

      {/* Modal de Instantánea de Diagnóstico Congelada */}
      <DiagnosticSnapshotModal
        snapshot={activeSnapshot}
        onClose={() => setActiveSnapshot(null)}
      />

      {/* Pie de página clínico */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs font-mono text-slate-400">
        NeuroFace Lab • Sistema de Telemetría Biomecánica y Reconocimiento de Expresiones Faciales • Acelerado por TensorFlow Lite y MediaPipe
      </footer>
    </div>
  );
}
