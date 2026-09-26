/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { NormalizedLandmark } from '../types/face';

class MediaPipeService {
  private landmarker: FaceLandmarker | null = null;
  private status: 'uninitialized' | 'loading' | 'ready' | 'error' = 'uninitialized';
  private errorMessage: string | null = null;
  private initPromise: Promise<boolean> | null = null;

  public getStatus() {
    return this.status;
  }

  public getErrorMessage() {
    return this.errorMessage;
  }

  public isReady() {
    return this.status === 'ready' && this.landmarker !== null;
  }

  /**
   * Inicializa el modelo MediaPipe Face Landmarker con delegado GPU (con fallback a CPU)
   */
  public async initialize(forceReload = false): Promise<boolean> {
    if (this.status === 'ready' && this.landmarker && !forceReload) {
      return true;
    }

    if (this.initPromise && !forceReload) {
      return this.initPromise;
    }

    this.status = 'loading';
    this.errorMessage = null;

    this.initPromise = (async () => {
      try {
        // Cargar los archivos Wasm de Vision Tasks desde el CDN oficial
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );

        const modelUrl =
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

        // Intento 1: Con aceleración por hardware WebGL/GPU
        try {
          this.landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: modelUrl,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuError) {
          console.warn('Fallo GPU delegate en MediaPipe, intentando CPU fallback...', gpuError);
          // Intento 2: Fallback a CPU en caso de que el navegador tenga restricciones WebGL
          this.landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: modelUrl,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        this.status = 'ready';
        return true;
      } catch (err: unknown) {
        console.error('Error inicializando MediaPipe Face Landmarker:', err);
        this.status = 'error';
        this.errorMessage =
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el modelo neural de MediaPipe en el navegador.';
        return false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Ejecuta la inferencia en tiempo real sobre el fotograma del video
   */
  public detect(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult | null {
    if (!this.landmarker || this.status !== 'ready') return null;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
      return this.landmarker.detectForVideo(video, timestamp);
    } catch (e) {
      console.error('Error durante inferencia de fotograma:', e);
      return null;
    }
  }

  /**
   * Generador de datos biomédicos simulados para modo demo/laboratorio o testing
   */
  public generateSimulatedData(
    activePreset: string,
    elapsedMs: number,
  ): {
    landmarks: NormalizedLandmark[];
    blendshapes: Record<string, number>;
  } {
    const t = elapsedMs / 1000;
    const wave = Math.sin(t * 2) * 0.1;

    const blendshapes: Record<string, number> = {
      mouthSmileLeft: 0,
      mouthSmileRight: 0,
      browDownLeft: 0,
      browDownRight: 0,
      browInnerUp: 0,
      browOuterUpLeft: 0,
      browOuterUpRight: 0,
      eyeBlinkLeft: Math.sin(t * 1.5) > 0.94 ? 0.95 : 0.05,
      eyeBlinkRight: Math.sin(t * 1.5) > 0.94 ? 0.95 : 0.05,
      eyeWideLeft: 0.05,
      eyeWideRight: 0.05,
      eyeSquintLeft: 0,
      eyeSquintRight: 0,
      jawOpen: 0.02,
      mouthFrownLeft: 0,
      mouthFrownRight: 0,
      noseSneerLeft: 0,
      noseSneerRight: 0,
      cheekSquintLeft: 0,
      cheekSquintRight: 0,
      mouthPressLeft: 0,
      mouthPressRight: 0,
      mouthStretchLeft: 0,
      mouthStretchRight: 0,
      mouthPucker: 0,
      mouthDimpleLeft: 0,
      mouthDimpleRight: 0,
      mouthUpperUpLeft: 0,
      mouthUpperUpRight: 0,
      mouthRollLower: 0,
    };

    switch (activePreset) {
      case 'felicidad':
        blendshapes.mouthSmileLeft = 0.88 + wave;
        blendshapes.mouthSmileRight = 0.86 + wave;
        blendshapes.cheekSquintLeft = 0.65;
        blendshapes.cheekSquintRight = 0.62;
        blendshapes.mouthDimpleLeft = 0.45;
        blendshapes.mouthDimpleRight = 0.42;
        break;
      case 'sorpresa':
        blendshapes.jawOpen = 0.72 + wave;
        blendshapes.eyeWideLeft = 0.82;
        blendshapes.eyeWideRight = 0.85;
        blendshapes.browInnerUp = 0.78;
        blendshapes.browOuterUpLeft = 0.74;
        blendshapes.browOuterUpRight = 0.72;
        break;
      case 'ira':
        blendshapes.browDownLeft = 0.85 + wave;
        blendshapes.browDownRight = 0.88 + wave;
        blendshapes.eyeSquintLeft = 0.72;
        blendshapes.eyeSquintRight = 0.75;
        blendshapes.mouthPressLeft = 0.65;
        blendshapes.mouthPressRight = 0.68;
        blendshapes.noseSneerLeft = 0.45;
        blendshapes.noseSneerRight = 0.48;
        break;
      case 'tristeza':
        blendshapes.mouthFrownLeft = 0.78 + wave;
        blendshapes.mouthFrownRight = 0.76 + wave;
        blendshapes.browInnerUp = 0.82;
        blendshapes.mouthRollLower = 0.42;
        break;
      case 'miedo':
        blendshapes.browInnerUp = 0.85;
        blendshapes.eyeWideLeft = 0.78;
        blendshapes.eyeWideRight = 0.8;
        blendshapes.mouthStretchLeft = 0.65 + wave;
        blendshapes.mouthStretchRight = 0.68 + wave;
        blendshapes.jawOpen = 0.35;
        break;
      case 'asco':
        blendshapes.noseSneerLeft = 0.85 + wave;
        blendshapes.noseSneerRight = 0.88 + wave;
        blendshapes.mouthUpperUpLeft = 0.72;
        blendshapes.mouthUpperUpRight = 0.74;
        blendshapes.mouthFrownLeft = 0.42;
        break;
      case 'neutral':
      default:
        blendshapes.mouthSmileLeft = 0.04;
        blendshapes.mouthSmileRight = 0.04;
        blendshapes.jawOpen = 0.03;
        break;
    }

    // Generar malla base de 478 puntos elipsoidales sintéticos
    const landmarks: NormalizedLandmark[] = [];
    const centerX = 0.5 + Math.sin(t * 0.8) * 0.02;
    const centerY = 0.48 + Math.cos(t * 0.6) * 0.015;

    for (let i = 0; i < 478; i++) {
      const angle = (i / 478) * Math.PI * 2 * 12;
      const radius = 0.18 + (i % 5) * 0.02;
      landmarks.push({
        x: centerX + Math.cos(angle) * radius * 0.75,
        y: centerY + Math.sin(angle) * radius,
        z: (Math.sin(angle) * 0.05),
      });
    }

    // Puntos anatómicos específicos
    landmarks[1] = { x: centerX, y: centerY + 0.04, z: -0.05 }; // Nariz
    landmarks[152] = { x: centerX, y: centerY + 0.22, z: 0 };   // Mentón
    landmarks[10] = { x: centerX, y: centerY - 0.22, z: 0 };    // Frente
    landmarks[234] = { x: centerX - 0.18, y: centerY + 0.02, z: 0.02 }; // Mejilla izq
    landmarks[454] = { x: centerX + 0.18, y: centerY + 0.02, z: 0.02 }; // Mejilla der
    landmarks[33] = { x: centerX - 0.09, y: centerY - 0.06, z: 0 };     // Ojo izq
    landmarks[263] = { x: centerX + 0.09, y: centerY - 0.06, z: 0 };    // Ojo der
    landmarks[61] = { x: centerX - 0.07, y: centerY + 0.13, z: 0 };     // Comisura izq
    landmarks[291] = { x: centerX + 0.07, y: centerY + 0.13, z: 0 };    // Comisura der

    return { landmarks, blendshapes };
  }
}

export const mediapipeService = new MediaPipeService();
