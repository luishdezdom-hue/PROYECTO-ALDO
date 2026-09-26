/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NormalizedLandmark, EmotionScore, HeadPose } from '../types/face';

// Índices clave de contorno facial anatómico en MediaPipe 468/478 Face Mesh
export const CONTOURS = {
  // Mandíbula y barbilla
  jaw: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
  // Ceja izquierda
  leftEyebrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  // Ceja derecha
  rightEyebrow: [336, 296, 334, 293, 300, 276, 283, 282, 295, 285],
  // Ojo izquierdo
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
  // Ojo derecho
  rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362],
  // Labios exteriores
  lipsOuter: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61],
  // Labios interiores
  lipsInner: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78],
  // Puente y alas nasales
  nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2],
};

export interface RenderOptions {
  showMesh: boolean;
  showContours: boolean;
  showBoundingBox: boolean;
  showPoseAxis: boolean;
  showLandmarks: boolean;
}

/**
 * Dibuja la visualización de grado clínico sobre el canvas
 */
export function drawFacialHUD(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  dominantEmotion: EmotionScore | null,
  headPose: HeadPose | null,
  options: RenderOptions,
) {
  if (!landmarks || landmarks.length === 0) return;

  ctx.save();

  // Calcular caja delimitadora del rostro
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  // Añadir margen del 12% a la caja delimitadora
  const padX = (maxX - minX) * 0.12;
  const padY = (maxY - minY) * 0.12;
  const boxX = Math.max(0, (minX - padX) * width);
  const boxY = Math.max(0, (minY - padY) * height);
  const boxW = Math.min(width - boxX, (maxX - minX + padX * 2) * width);
  const boxH = Math.min(height - boxY, (maxY - minY + padY * 2) * height);

  // 1. DIBUJAR PUNTOS DE MALLA (MESH WIREFRAME / PARTICLES)
  if (options.showMesh) {
    ctx.fillStyle = 'rgba(6, 182, 212, 0.45)'; // cian translúcido
    const step = 4; // muestreo de rendimiento óptimo
    for (let i = 0; i < landmarks.length; i += step) {
      const pt = landmarks[i];
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 1.2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // 2. DIBUJAR CONTORNOS ANATÓMICOS
  if (options.showContours) {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.85)'; // teal clinical
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawPath = (indices: number[], close = false) => {
      ctx.beginPath();
      for (let i = 0; i < indices.length; i++) {
        const pt = landmarks[indices[i]];
        if (!pt) continue;
        const x = pt.x * width;
        const y = pt.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (close) ctx.closePath();
      ctx.stroke();
    };

    drawPath(CONTOURS.jaw);
    drawPath(CONTOURS.leftEyebrow);
    drawPath(CONTOURS.rightEyebrow);
    drawPath(CONTOURS.leftEye, true);
    drawPath(CONTOURS.rightEye, true);
    drawPath(CONTOURS.lipsOuter, true);
    drawPath(CONTOURS.lipsInner, true);
    drawPath(CONTOURS.nose);
  }

  // 3. DIBUJAR LANDMARKS DESTACADOS (Puntos de referencia biomédica)
  if (options.showLandmarks) {
    const keyIndices = [1, 33, 263, 61, 291, 10, 152]; // nariz, comisuras de ojos y labios, frente, mentón
    ctx.fillStyle = '#f59e0b'; // ámbar
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;

    keyIndices.forEach((idx) => {
      const pt = landmarks[idx];
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 2.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  }

  // 4. CAJA DELIMITADORA DE GRADO BIOMÉTRICO (Esquinas quirúrgicas)
  if (options.showBoundingBox) {
    const cornerSize = Math.min(26, boxW * 0.18);
    ctx.strokeStyle = dominantEmotion?.color || '#06b6d4';
    ctx.lineWidth = 2;

    // Superior Izquierda
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + cornerSize);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + cornerSize, boxY);
    ctx.stroke();

    // Superior Derecha
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - cornerSize, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + cornerSize);
    ctx.stroke();

    // Inferior Izquierda
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH - cornerSize);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + cornerSize, boxY + boxH);
    ctx.stroke();

    // Inferior Derecha
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - cornerSize, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - cornerSize);
    ctx.stroke();

    // Etiqueta médica flotante superior
    if (dominantEmotion) {
      const tagText = `${dominantEmotion.label.toUpperCase()} ${dominantEmotion.score}%`;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(tagText).width;

      // Fondo etiqueta
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(boxX, Math.max(0, boxY - 24), textWidth + 16, 20);

      // Borde de etiqueta
      ctx.strokeStyle = dominantEmotion.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, Math.max(0, boxY - 24), textWidth + 16, 20);

      // Texto de etiqueta
      ctx.fillStyle = dominantEmotion.color;
      ctx.fillText(tagText, boxX + 8, Math.max(14, boxY - 10));
    }
  }

  // 5. VECTOR DE ORIENTACIÓN ESPACIAL 3D (Gimbal Reticle en nariz)
  if (options.showPoseAxis && headPose) {
    const nose = landmarks[1];
    if (nose) {
      const originX = nose.x * width;
      const originY = nose.y * height;
      const axisLen = 38;

      // Ángulos en radianes
      const yawRad = (headPose.yaw * Math.PI) / 180;
      const pitchRad = (headPose.pitch * Math.PI) / 180;

      // Eje X (Rojo - Yaw lateral)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + Math.cos(yawRad) * axisLen, originY + Math.sin(pitchRad) * 12);
      ctx.stroke();

      // Eje Y (Verde - Pitch vertical)
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, originY - Math.cos(pitchRad) * axisLen);
      ctx.stroke();

      // Eje Z (Azul - Centro)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(originX, originY, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  ctx.restore();
}
