# Plan de Implementación: Sistema de Telemetría y Reconocimiento de Expresiones Faciales

Sistema clínico e interactivo de análisis facial en tiempo real impulsado por **MediaPipe Face Landmarker** (acelerado con WebAssembly / GPU TFLite), detección de **52 blendshapes faciales**, clasificación de emociones primarias de Paul Ekman y modelo dimensional circumplex (Valencia / Arousal), presentado en una interfaz de laboratorio analítico y telemetría de grado científico.

---

## 1. Arquitectura y Tecnologías Clave

- **Visión y Aprendizaje Profundo On-Device:**
  - `@mediapipe/tasks-vision` con modelo Face Landmarker optimizado para web/móvil (TFLite empaquetado para Wasm/WebGL).
  - Extracción de **478 puntos de referencia faciales 3D** con mapeo de malla y estimación de orientación de cabeza (Pitch, Yaw, Roll).
  - Inferencia de **52 blendshapes ARKit estándar** (`mouthSmileLeft`, `browDownLeft`, `jawOpen`, `eyeBlinkLeft`, etc.) a 30-60 FPS con latencia menor a 15ms.
  - Módulo matemático para computar:
    - **7 Emociones Universales (Ekman):** Felicidad, Tristeza, Sorpresa, Ira, Miedo, Asco y Neutralidad.
    - **Métricas Fisiológicas/Atencionales:** Nivel de atención, fatiga/parpadeo (Eye Aspect Ratio), simetría muscular facial.
    - **Modelo Circumplex de Russell:** Coordenadas bidimensionales de Valencia (positiva/negativa) y Arousal (activación/calma).

- **Diseño Visual de Laboratorio Clínico:**
  - Paleta pulcra y precisa: fondos neutros de laboratorio (`slate-50` / `zinc-900`), acentos cian/teal de bioinstrumentación médica, tipografía monoespaciada para lecturas numéricas.
  - Superposición gráfica en lienzo (Canvas HUD) con selector de visualización: malla facial wireframe, contornos anatómicos, puntos clave de ojos/boca o vista limpia.
  - Gráficos y telemetría interactiva en vivo:
    - Monitor de espectro emocional y velocímetro de certeza.
    - Radar de micromovimientos musculares.
    - Diagrama cartesiano 2D de Valencia vs Arousal.
    - Histograma temporal continuo de estados emocionales.
    - Estadísticas de sesión: tiempo de atención, emoción predominante, variabilidad expresiva y exportación de informe clínico en formato JSON/CSV.

- **Resiliencia y Flexibilidad de Cámara:**
  - Selector de cámara frontal/trasera, ajuste de resolución (720p / 1080p).
  - Modo de simulación/demo interactivo con caras de prueba para pruebas inmediatas si la cámara no está conectada o mientras se otorgan permisos.
  - Captura de instantáneas diagnósticas con análisis detallado congelado.

---

## 2. Fases de Desarrollo

### Fase 1: Configuración de Dependencias y Modelos
- Instalar `@mediapipe/tasks-vision` y librerías de soporte.
- Configurar el cargador singleton de MediaPipe FilesetResolver (`wasm`) y el bundle `face_landmarker.task`.
- Preparar motor de fallback con video demo y simulación biomecánica por si el usuario no tiene cámara habilitada.

### Fase 2: Motor de Detección y Análisis Emocional
- Implementar `faceAnalyzer.ts`:
  - Cálculo de emociones a partir de pesos de blendshapes normalizados.
  - Extracción de orientación 3D (Roll, Pitch, Yaw).
  - Métrica de fatiga visual (Eye Aspect Ratio & Blink Rate).
  - Mapeo de Valencia y Arousal.

### Fase 3: Lienzo HUD y Cámara en Tiempo Real
- Componente de captura de video fluido con `requestAnimationFrame`.
- Dibujo en canvas de alta precisión:
  - Malla facial estilizada con shaders/líneas clínicas sutiles.
  - Indicadores biométricos sobre la frente y contorno ocular.
  - Detección de FPS en tiempo real y latencia de inferencia en milisegundos.

### Fase 4: Panel de Telemetría Clínica y Analíticas
- **Panel Lateral Izquierdo / Superior:** Visor de cámara HUD, controles de sensor, interruptores de capa visual (Mesh, Landmarks, Bounding Box).
- **Panel Central / Telemetría Principal:**
  - Medidor de emoción predominante con barra de confianza (%).
  - Desglose de las 7 emociones en tiempo real.
  - Cuadrante 2D Circumplex (Valencia vs Activación).
- **Panel Inferior / Historial de Sesión:**
  - Gráfico de línea temporal de emociones de los últimos 60 segundos.
  - Registro de microexpresiones detectadas.
  - Herramienta de instantánea diagnóstica y descarga de informe clínico.

### Fase 5: Verificación y Optimización
- Verificación de renderizado en dispositivos móviles y de escritorio.
- Comprobación de tipos TypeScript y compilación con `compile_applet`.
- Verificación de metadatos y manifiesto.
