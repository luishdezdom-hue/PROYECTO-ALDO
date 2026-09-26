/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  Layers,
  RefreshCw,
  Sliders,
  Sparkles,
  SwitchCamera,
  Video,
  VideoOff,
  AlertCircle,
  Eye,
  Maximize2,
} from 'lucide-react';
import { EmotionScore, HeadPose, NormalizedLandmark } from '../types/face';
import { drawFacialHUD, RenderOptions } from '../utils/faceMeshRenderer';
import { mediapipeService } from '../services/mediapipeService';

interface CameraFeedProps {
  onFrameProcessed: (data: {
    landmarks: NormalizedLandmark[];
    blendshapes: Record<string, number>;
    inferenceTimeMs: number;
    fps: number;
    videoElement: HTMLVideoElement | null;
  }) => void;
  dominantEmotion: EmotionScore | null;
  headPose: HeadPose | null;
  isSimulatorMode: boolean;
  onSnapshotRequested: (imageUrl: string) => void;
  snapshotTriggered: boolean;
  onSnapshotCompleted: () => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  onFrameProcessed,
  dominantEmotion,
  headPose,
  isSimulatorMode,
  onSnapshotRequested,
  snapshotTriggered,
  onSnapshotCompleted,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estados de cámara
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mirror, setMirror] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string>('neutral');

  // Opciones de renderizado HUD
  const [hudOptions, setHudOptions] = useState<RenderOptions>({
    showMesh: true,
    showContours: true,
    showBoundingBox: true,
    showPoseAxis: true,
    showLandmarks: true,
  });

  const [showControls, setShowControls] = useState<boolean>(false);

  // Métricas de FPS y latencia locales
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const animationFrameIdRef = useRef<number | null>(null);
  const currentLandmarksRef = useRef<NormalizedLandmark[]>([]);

  // 1. Inicializar MediaPipe
  useEffect(() => {
    mediapipeService.initialize();
  }, []);

  // 2. Control del flujo de cámara web
  const startCamera = useCallback(async () => {
    if (isSimulatorMode) return;
    setCameraError(null);

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: unknown) {
      console.warn('No se pudo acceder a la cámara web:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Permiso de cámara no concedido o dispositivo ocupado.';
      setCameraError(msg);
      setStreamActive(false);
    }
  }, [facingMode, isSimulatorMode]);

  // Detener cámara al desmontar
  useEffect(() => {
    if (!isSimulatorMode) {
      startCamera();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [startCamera, isSimulatorMode]);

  // Manejar captura de instantánea
  useEffect(() => {
    if (snapshotTriggered && canvasRef.current && videoRef.current) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = canvasRef.current.width || 640;
      snapCanvas.height = canvasRef.current.height || 480;
      const snapCtx = snapCanvas.getContext('2d');
      if (snapCtx) {
        if (!isSimulatorMode && streamActive) {
          snapCtx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
        } else {
          // Fondo oscuro simulado
          snapCtx.fillStyle = '#0f172a';
          snapCtx.fillRect(0, 0, snapCanvas.width, snapCanvas.height);
        }
        // Superponer HUD actual
        snapCtx.drawImage(canvasRef.current, 0, 0);
        const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.92);
        onSnapshotRequested(dataUrl);
      }
      onSnapshotCompleted();
    }
  }, [snapshotTriggered, isSimulatorMode, streamActive, onSnapshotRequested, onSnapshotCompleted]);

  // 3. Ciclo de procesamiento en tiempo real con requestAnimationFrame
  useEffect(() => {
    let isRunning = true;

    const processLoop = () => {
      if (!isRunning) return;

      const now = performance.now();
      frameCountRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Ajustar resolución del canvas para nitidez
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          ctx.clearRect(0, 0, width, height);

          // MODO 1: Cámara en vivo con modelo de visión MediaPipe
          if (!isSimulatorMode && streamActive && video && video.readyState >= 2) {
            const startInfer = performance.now();
            const result = mediapipeService.detect(video, startInfer);
            const inferMs = performance.now() - startInfer;

            if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
              const landmarks = result.faceLandmarks[0];
              currentLandmarksRef.current = landmarks;

              // Extraer blendshapes en diccionario
              const blendDict: Record<string, number> = {};
              if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
                for (const cat of result.faceBlendshapes[0].categories) {
                  blendDict[cat.categoryName] = cat.score;
                }
              }

              // Dibujar sobre canvas
              drawFacialHUD(
                ctx,
                landmarks,
                width,
                height,
                dominantEmotion,
                headPose,
                hudOptions,
              );

              onFrameProcessed({
                landmarks,
                blendshapes: blendDict,
                inferenceTimeMs: inferMs,
                fps: fpsRef.current,
                videoElement: video,
              });
            } else {
              // Sin rostro en cuadro actual
              currentLandmarksRef.current = [];
              onFrameProcessed({
                landmarks: [],
                blendshapes: {},
                inferenceTimeMs: inferMs,
                fps: fpsRef.current,
                videoElement: video,
              });
            }
          }
          // MODO 2: Modo simulador o cuando la cámara no está activa
          else if (isSimulatorMode || !streamActive) {
            const sim = mediapipeService.generateSimulatedData(activePreset, now);
            currentLandmarksRef.current = sim.landmarks;

            // Dibujar fondo clínico de escaneo sintético
            ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
            ctx.fillRect(0, 0, width, height);

            // Líneas de cuadrícula médica
            ctx.strokeStyle = 'rgba(15, 118, 110, 0.15)';
            ctx.lineWidth = 1;
            const gridSize = 40;
            for (let x = 0; x < width; x += gridSize) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }

            drawFacialHUD(
              ctx,
              sim.landmarks,
              width,
              height,
              dominantEmotion,
              headPose,
              hudOptions,
            );

            onFrameProcessed({
              landmarks: sim.landmarks,
              blendshapes: sim.blendshapes,
              inferenceTimeMs: 8.5,
              fps: fpsRef.current,
              videoElement: null,
            });
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(processLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(processLoop);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [
    isSimulatorMode,
    streamActive,
    dominantEmotion,
    headPose,
    hudOptions,
    activePreset,
    onFrameProcessed,
  ]);

  return (
    <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* Barra superior de visor HUD */}
      <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-slate-300 font-semibold tracking-wider">
            OPTIC-FEED: {isSimulatorMode ? 'SIMULADOR 3D' : streamActive ? 'CÁMARA VIVO' : 'SIN SEÑAL'}
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline text-[11px]">ID: SUB-0492</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Alternar capas HUD */}
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-1.5 rounded text-xs transition-colors border ${
              showControls
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Capas del HUD"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Giro de cámara */}
          {!isSimulatorMode && (
            <button
              onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
              className="p-1.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 text-xs transition-colors"
              title="Cambiar a cámara frontal/trasera"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Efecto espejo */}
          <button
            onClick={() => setMirror(!mirror)}
            className={`p-1.5 rounded text-xs transition-colors border ${
              mirror
                ? 'bg-slate-800 text-teal-400 border-slate-700'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title="Modo espejo"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Reintentar cámara */}
          {!isSimulatorMode && !streamActive && (
            <button
              onClick={startCamera}
              className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-mono text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reconectar
            </button>
          )}
        </div>
      </div>

      {/* Controles flotantes de capas HUD */}
      {showControls && (
        <div className="absolute top-11 right-3 z-30 bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 text-xs shadow-2xl backdrop-blur-md w-60">
          <p className="font-mono text-[11px] text-slate-400 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-teal-400" />
            Capas Biométricas
          </p>
          <div className="space-y-1.5 font-mono text-slate-300">
            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Malla 478 pts</span>
              <input
                type="checkbox"
                checked={hudOptions.showMesh}
                onChange={(e) =>
                  setHudOptions((prev) => ({ ...prev, showMesh: e.target.checked }))
                }
                className="accent-teal-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Contornos Anatómicos</span>
              <input
                type="checkbox"
                checked={hudOptions.showContours}
                onChange={(e) =>
                  setHudOptions((prev) => ({ ...prev, showContours: e.target.checked }))
                }
                className="accent-teal-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Caja Delimitadora</span>
              <input
                type="checkbox"
                checked={hudOptions.showBoundingBox}
                onChange={(e) =>
                  setHudOptions((prev) => ({ ...prev, showBoundingBox: e.target.checked }))
                }
                className="accent-teal-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Eje 3D (Gimbal)</span>
              <input
                type="checkbox"
                checked={hudOptions.showPoseAxis}
                onChange={(e) =>
                  setHudOptions((prev) => ({ ...prev, showPoseAxis: e.target.checked }))
                }
                className="accent-teal-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Landmarks Clave</span>
              <input
                type="checkbox"
                checked={hudOptions.showLandmarks}
                onChange={(e) =>
                  setHudOptions((prev) => ({ ...prev, showLandmarks: e.target.checked }))
                }
                className="accent-teal-500 rounded"
              />
            </label>
          </div>
        </div>
      )}

      {/* Área del visor de video + Canvas HUD */}
      <div className="relative aspect-video sm:aspect-4/3 md:aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Elemento de video oculto que procesa la cámara */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${
            mirror ? 'scale-x-[-1]' : ''
          } ${!streamActive || isSimulatorMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        />

        {/* Canvas de renderizado HUD en tiempo real */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full z-10 ${mirror ? 'scale-x-[-1]' : ''}`}
        />

        {/* Retícula médica de esquina sobre el visor */}
        <div className="absolute inset-0 pointer-events-none z-20 p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start font-mono text-[10px] text-teal-400/80">
            <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-teal-500/30">
              FRAME TFLite Float16
            </span>
            <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-teal-500/30">
              478 LANDMARKS • 52 SHAPES
            </span>
          </div>

          <div className="flex justify-between items-end font-mono text-[10px] text-slate-400">
            <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700/60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>LOCK: {dominantEmotion ? dominantEmotion.label.toUpperCase() : 'BUSCANDO'}</span>
            </div>
            <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700/60">
              POSE: {headPose ? `Y:${headPose.yaw}° P:${headPose.pitch}° R:${headPose.roll}°` : '--'}
            </div>
          </div>
        </div>

        {/* Mensaje de cámara inactiva / sin permisos */}
        {!streamActive && !isSimulatorMode && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-teal-400 mb-3">
              <VideoOff className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1 font-sans">
              Acceso a la Cámara Requerido
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {cameraError ||
                'Permite el acceso a la cámara web en el navegador para iniciar la detección facial y análisis de microexpresiones en tiempo real.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-mono text-xs font-semibold rounded-lg flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Video className="w-4 h-4" />
                Permitir y Activar Cámara
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barra de prueba interactiva de expresiones para modo simulador o análisis rápido */}
      {isSimulatorMode && (
        <div className="bg-slate-900 px-3 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Sintético:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'felicidad', label: 'Felicidad', color: 'hover:bg-emerald-500/20' },
              { id: 'sorpresa', label: 'Sorpresa', color: 'hover:bg-cyan-500/20' },
              { id: 'ira', label: 'Ira', color: 'hover:bg-rose-500/20' },
              { id: 'tristeza', label: 'Tristeza', color: 'hover:bg-indigo-500/20' },
              { id: 'miedo', label: 'Miedo', color: 'hover:bg-amber-500/20' },
              { id: 'asco', label: 'Asco', color: 'hover:bg-fuchsia-500/20' },
              { id: 'neutral', label: 'Neutral', color: 'hover:bg-slate-500/20' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePreset(p.id)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors border ${
                  activePreset === p.id
                    ? 'bg-teal-600 text-white border-teal-400 font-bold'
                    : `bg-slate-800 text-slate-300 border-slate-700 ${p.color}`
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
