/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export type PrimaryEmotionType =
  | 'felicidad'
  | 'tristeza'
  | 'sorpresa'
  | 'ira'
  | 'miedo'
  | 'asco'
  | 'neutral';

export interface EmotionScore {
  type: PrimaryEmotionType;
  label: string;
  score: number; // 0 to 100
  color: string;
  facsDescription: string;
}

export interface HeadPose {
  pitch: number; // Inclinación arriba/abajo (-90 a 90)
  yaw: number;   // Giro izquierda/derecha (-90 a 90)
  roll: number;  // Inclinación lateral (-90 a 90)
}

export interface BiomechanicalMetrics {
  eyeAspectRatioLeft: number;
  eyeAspectRatioRight: number;
  isBlinking: boolean;
  blinkCount: number;
  blinksPerMinute: number;
  mouthOpenRatio: number;
  facialSymmetryScore: number; // 0 a 100 (100 = simetría perfecta)
  attentionScore: number;       // 0 a 100
  fatigueRisk: 'Bajo' | 'Moderado' | 'Elevado';
  headPose: HeadPose;
}

export interface CircumplexCoord {
  valence: number; // -1.0 (Muy negativo / Desagradable) a +1.0 (Muy positivo / Placentero)
  arousal: number; // -1.0 (Baja energía / Somnoliento) a +1.0 (Alta energía / Excitado)
}

export interface BlendshapeItem {
  categoryName: string;
  displayName: string;
  score: number; // 0.0 to 1.0
}

export interface FaceAnalysisResult {
  detected: boolean;
  landmarks: NormalizedLandmark[];
  blendshapes: Record<string, number>;
  topBlendshapes: BlendshapeItem[];
  emotions: EmotionScore[];
  dominantEmotion: EmotionScore;
  circumplex: CircumplexCoord;
  biomechanics: BiomechanicalMetrics;
  inferenceTimeMs: number;
  fps: number;
  timestamp: number;
}

export interface TelemetryDataPoint {
  timeFormatted: string;
  timestamp: number;
  dominantEmotion: PrimaryEmotionType;
  confidence: number;
  valence: number;
  arousal: number;
  attention: number;
}

export interface ClinicalSnapshot {
  id: string;
  timestamp: string;
  imageUrl: string;
  dominantEmotion: EmotionScore;
  emotions: EmotionScore[];
  circumplex: CircumplexCoord;
  biomechanics: BiomechanicalMetrics;
  topBlendshapes: BlendshapeItem[];
}
