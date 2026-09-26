/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlendshapeItem,
  CircumplexCoord,
  EmotionScore,
  NormalizedLandmark,
  PrimaryEmotionType,
  BiomechanicalMetrics,
  HeadPose,
} from '../types/face';

// Diccionario descriptivo en español de los principales blendshapes de FACS
export const BLENDSHAPE_TRANSLATIONS: Record<string, string> = {
  mouthSmileLeft: 'Elevador comisura izq. (AU12)',
  mouthSmileRight: 'Elevador comisura der. (AU12)',
  browDownLeft: 'Depresor de ceja izq. (AU4)',
  browDownRight: 'Depresor de ceja der. (AU4)',
  browInnerUp: 'Elevador medial de ceja (AU1)',
  browOuterUpLeft: 'Elevador lateral izq. (AU2)',
  browOuterUpRight: 'Elevador lateral der. (AU2)',
  eyeBlinkLeft: 'Oclusión párpado izq. (AU45)',
  eyeBlinkRight: 'Oclusión párpado der. (AU45)',
  eyeWideLeft: 'Apertura palpebral izq. (AU5)',
  eyeWideRight: 'Apertura palpebral der. (AU5)',
  eyeSquintLeft: 'Tensión orbicular izq. (AU7)',
  eyeSquintRight: 'Tensión orbicular der. (AU7)',
  jawOpen: 'Apertura mandibular (AU26/27)',
  mouthFrownLeft: 'Depresor comisura izq. (AU15)',
  mouthFrownRight: 'Depresor comisura der. (AU15)',
  noseSneerLeft: 'Arrugador nasal izq. (AU9)',
  noseSneerRight: 'Arrugador nasal der. (AU9)',
  cheekSquintLeft: 'Elevador malar izq. (AU6)',
  cheekSquintRight: 'Elevador malar der. (AU6)',
  mouthPressLeft: 'Compresión labial izq. (AU24)',
  mouthPressRight: 'Compresión labial der. (AU24)',
  mouthStretchLeft: 'Estiramiento labial izq. (AU20)',
  mouthStretchRight: 'Estiramiento labial der. (AU20)',
  mouthPucker: 'Protrusión orbicular (AU18)',
  mouthDimpleLeft: 'Buccinador izq. (AU14)',
  mouthDimpleRight: 'Buccinador der. (AU14)',
};

// Historial para cálculo de fatiga y parpadeo continuo
let blinkState = false;
let blinkCount = 0;
const blinkTimestamps: number[] = [];

/**
 * Normaliza las intensidades de emociones y aplica ponderación basada en FACS
 */
export function classifyEmotions(blendshapes: Record<string, number>): {
  emotions: EmotionScore[];
  dominantEmotion: EmotionScore;
  circumplex: CircumplexCoord;
} {
  const b = (key: string) => blendshapes[key] || 0;

  // 1. Felicidad (Joy / AU6 + AU12)
  const smile = (b('mouthSmileLeft') + b('mouthSmileRight')) / 2;
  const cheek = (b('cheekSquintLeft') + b('cheekSquintRight')) / 2;
  const dimple = (b('mouthDimpleLeft') + b('mouthDimpleRight')) / 2;
  const rawHappiness = smile * 0.75 + cheek * 0.2 + dimple * 0.05;

  // 2. Sorpresa (Surprise / AU1 + AU2 + AU5 + AU26)
  const browsUp = (b('browInnerUp') + b('browOuterUpLeft') + b('browOuterUpRight')) / 3;
  const eyesWide = (b('eyeWideLeft') + b('eyeWideRight')) / 2;
  const jaw = b('jawOpen');
  const rawSurprise = browsUp * 0.35 + eyesWide * 0.35 + jaw * 0.3;

  // 3. Ira (Anger / AU4 + AU7 + AU23/24)
  const browsDown = (b('browDownLeft') + b('browDownRight')) / 2;
  const eyesSquint = (b('eyeSquintLeft') + b('eyeSquintRight')) / 2;
  const mouthPress = (b('mouthPressLeft') + b('mouthPressRight')) / 2;
  const sneer = (b('noseSneerLeft') + b('noseSneerRight')) / 2;
  const rawAnger = browsDown * 0.45 + eyesSquint * 0.25 + mouthPress * 0.15 + sneer * 0.15;

  // 4. Tristeza (Sadness / AU1 + AU4 + AU15)
  const frown = (b('mouthFrownLeft') + b('mouthFrownRight')) / 2;
  const innerBrow = b('browInnerUp');
  const lowerLip = b('mouthRollLower');
  const rawSadness = frown * 0.5 + innerBrow * 0.35 + lowerLip * 0.15;

  // 5. Miedo (Fear / AU1 + AU2 + AU4 + AU5 + AU20)
  const mouthStretch = (b('mouthStretchLeft') + b('mouthStretchRight')) / 2;
  const rawFear = innerBrow * 0.3 + eyesWide * 0.3 + mouthStretch * 0.25 + jaw * 0.15;

  // 6. Asco (Disgust / AU9 + AU10 + AU15)
  const upperLip = (b('mouthUpperUpLeft') + b('mouthUpperUpRight')) / 2;
  const rawDisgust = sneer * 0.55 + upperLip * 0.3 + frown * 0.15;

  // 7. Neutral
  // Se calcula inversamente proporcional al total de las otras expresiones activadas
  const totalActivity =
    rawHappiness * 1.2 +
    rawSurprise * 1.1 +
    rawAnger * 1.2 +
    rawSadness * 1.1 +
    rawFear * 1.1 +
    rawDisgust * 1.1;
  const rawNeutral = Math.max(0, 0.95 - totalActivity);

  // Normalizar y escalar a porcentajes
  const sumRaw =
    rawHappiness + rawSurprise + rawAnger + rawSadness + rawFear + rawDisgust + rawNeutral || 1;

  const scoreMap: Record<PrimaryEmotionType, number> = {
    felicidad: Math.min(100, Math.round((rawHappiness / sumRaw) * 100)),
    sorpresa: Math.min(100, Math.round((rawSurprise / sumRaw) * 100)),
    ira: Math.min(100, Math.round((rawAnger / sumRaw) * 100)),
    tristeza: Math.min(100, Math.round((rawSadness / sumRaw) * 100)),
    miedo: Math.min(100, Math.round((rawFear / sumRaw) * 100)),
    asco: Math.min(100, Math.round((rawDisgust / sumRaw) * 100)),
    neutral: Math.min(100, Math.round((rawNeutral / sumRaw) * 100)),
  };

  const emotions: EmotionScore[] = [
    {
      type: 'felicidad',
      label: 'Felicidad',
      score: scoreMap.felicidad,
      color: '#10b981', // esmeralda
      facsDescription: 'Activación Cigomático Mayor y Orbicular (AU6+AU12)',
    },
    {
      type: 'neutral',
      label: 'Neutral',
      score: scoreMap.neutral,
      color: '#64748b', // pizarra neutra
      facsDescription: 'Tono muscular basal relajado sin contracción tónica',
    },
    {
      type: 'sorpresa',
      label: 'Sorpresa',
      score: scoreMap.sorpresa,
      color: '#06b6d4', // cian
      facsDescription: 'Elevación frontal y apertura palpebral (AU1+AU2+AU5+AU26)',
    },
    {
      type: 'ira',
      label: 'Ira',
      score: scoreMap.ira,
      color: '#ef4444', // rojo
      facsDescription: 'Depresión corrugadora y compresión labial (AU4+AU7+AU24)',
    },
    {
      type: 'tristeza',
      label: 'Tristeza',
      score: scoreMap.tristeza,
      color: '#6366f1', // índigo
      facsDescription: 'Tensión superciliar medial y descenso comisural (AU1+AU15)',
    },
    {
      type: 'miedo',
      label: 'Miedo',
      score: scoreMap.miedo,
      color: '#f59e0b', // ámbar
      facsDescription: 'Retracción palpebral y tensión transversal (AU1+AU5+AU20)',
    },
    {
      type: 'asco',
      label: 'Asco',
      score: scoreMap.asco,
      color: '#d946ef', // fucsia
      facsDescription: 'Contracción piramidal nasal y elevador labio sup. (AU9+AU10)',
    },
  ];

  // Ordenar para encontrar dominante
  const sorted = [...emotions].sort((a, b) => b.score - a.score);
  const dominantEmotion = sorted[0];

  // Modelo Circumplex de Russell: Valencia (-1.0 a +1.0) y Arousal (-1.0 a +1.0)
  // Valencia: Placer vs Displacer
  const valence = Math.max(
    -1,
    Math.min(
      1,
      (scoreMap.felicidad * 1.0 -
        scoreMap.ira * 0.7 -
        scoreMap.tristeza * 0.85 -
        scoreMap.asco * 0.75 -
        scoreMap.miedo * 0.7) /
        100,
    ),
  );

  // Arousal: Nivel de Activación/Excitación neurofisiológica
  const arousal = Math.max(
    -1,
    Math.min(
      1,
      (scoreMap.sorpresa * 0.85 +
        scoreMap.miedo * 0.8 +
        scoreMap.ira * 0.75 +
        scoreMap.felicidad * 0.45 -
        scoreMap.tristeza * 0.4 -
        scoreMap.neutral * 0.6) /
        100,
    ),
  );

  return {
    emotions,
    dominantEmotion,
    circumplex: { valence, arousal },
  };
}

/**
 * Calcula la orientación tridimensional de la cabeza (Pitch, Yaw, Roll)
 * a partir de puntos de referencia 3D de MediaPipe (478 landmarks)
 */
export function estimateHeadPose(landmarks: NormalizedLandmark[]): HeadPose {
  if (!landmarks || landmarks.length < 468) {
    return { pitch: 0, yaw: 0, roll: 0 };
  }

  // Puntos clave de referencia anatómica
  const nose = landmarks[1];          // Punta de la nariz
  const chin = landmarks[152];        // Mentón
  const forehead = landmarks[10];      // Frente media
  const leftCheek = landmarks[234];    // Zona cigomática izquierda
  const rightCheek = landmarks[454];   // Zona cigomática derecha

  // Yaw: Giro horizontal (desplazamiento de nariz relativo a mejillas)
  const eyeMidX = (leftCheek.x + rightCheek.x) / 2;
  const eyeSpanX = Math.abs(rightCheek.x - leftCheek.x) || 0.1;
  const yaw = Math.round(((nose.x - eyeMidX) / eyeSpanX) * 90);

  // Pitch: Inclinación vertical (distancia nariz-frente vs nariz-mentón)
  const faceMidY = (forehead.y + chin.y) / 2;
  const faceHeight = Math.abs(chin.y - forehead.y) || 0.1;
  const pitch = Math.round(((nose.y - faceMidY) / faceHeight) * -90);

  // Roll: Rotación lateral en el plano 2D (ángulo entre las mejillas)
  const deltaX = rightCheek.x - leftCheek.x;
  const deltaY = rightCheek.y - leftCheek.y;
  const roll = Math.round((Math.atan2(deltaY, deltaX) * (180 / Math.PI)));

  return {
    pitch: Math.max(-60, Math.min(60, pitch)),
    yaw: Math.max(-60, Math.min(60, yaw)),
    roll: Math.max(-60, Math.min(60, roll)),
  };
}

/**
 * Calcula métricas biomecánicas: simetría, parpadeos, ratio de apertura de boca y fatiga
 */
export function calculateBiomechanics(
  blendshapes: Record<string, number>,
  landmarks: NormalizedLandmark[],
  headPose: HeadPose,
): BiomechanicalMetrics {
  const now = Date.now();
  const b = (key: string) => blendshapes[key] || 0;

  // Eye Aspect Ratio (aproximado por oclusión palpebral)
  const blinkL = b('eyeBlinkLeft');
  const blinkR = b('eyeBlinkRight');
  const earLeft = Math.max(0, 1 - blinkL);
  const earRight = Math.max(0, 1 - blinkR);

  // Detección de parpadeo
  const currentBlinkState = blinkL > 0.55 && blinkR > 0.55;
  if (currentBlinkState && !blinkState) {
    blinkCount++;
    blinkTimestamps.push(now);
  }
  blinkState = currentBlinkState;

  // Limpiar parpadeos de más de 60 segundos
  const oneMinuteAgo = now - 60000;
  while (blinkTimestamps.length > 0 && blinkTimestamps[0] < oneMinuteAgo) {
    blinkTimestamps.shift();
  }
  const blinksPerMinute = blinkTimestamps.length;

  // Apertura bucal
  const mouthOpenRatio = Math.round(b('jawOpen') * 100);

  // Cálculo de simetría facial (diferencias absolutas entre músculos izq y der)
  const asymmetry =
    Math.abs(b('mouthSmileLeft') - b('mouthSmileRight')) +
    Math.abs(b('browDownLeft') - b('browDownRight')) +
    Math.abs(b('eyeBlinkLeft') - b('eyeBlinkRight')) +
    Math.abs(b('cheekSquintLeft') - b('cheekSquintRight')) +
    Math.abs(b('mouthFrownLeft') - b('mouthFrownRight'));

  const facialSymmetryScore = Math.max(0, Math.round(100 - asymmetry * 50));

  // Índice de fatiga (parpadeos atípicos + cierre prolongado de ojos)
  let fatigueRisk: 'Bajo' | 'Moderado' | 'Elevado' = 'Bajo';
  if (blinksPerMinute > 28 || (blinkL > 0.4 && blinkR > 0.4)) {
    fatigueRisk = 'Elevado';
  } else if (blinksPerMinute > 20 || (blinkL > 0.3 && blinkR > 0.3)) {
    fatigueRisk = 'Moderado';
  }

  // Puntuación de atención (basada en orientación centrada y mirada sostenida)
  const posePenalty = (Math.abs(headPose.yaw) + Math.abs(headPose.pitch)) * 0.6;
  const eyePenalty = (blinkL + blinkR) * 20;
  const attentionScore = Math.max(10, Math.round(100 - posePenalty - eyePenalty));

  return {
    eyeAspectRatioLeft: Number(earLeft.toFixed(2)),
    eyeAspectRatioRight: Number(earRight.toFixed(2)),
    isBlinking: currentBlinkState,
    blinkCount,
    blinksPerMinute,
    mouthOpenRatio,
    facialSymmetryScore,
    attentionScore,
    fatigueRisk,
    headPose,
  };
}

/**
 * Obtiene los 8 blendshapes más activos en el instante
 */
export function getTopBlendshapes(blendshapes: Record<string, number>): BlendshapeItem[] {
  return Object.entries(blendshapes)
    .filter(([key]) => key !== '_neutral' && !key.startsWith('_'))
    .map(([categoryName, score]) => ({
      categoryName,
      displayName: BLENDSHAPE_TRANSLATIONS[categoryName] || categoryName,
      score: Number(score.toFixed(3)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
