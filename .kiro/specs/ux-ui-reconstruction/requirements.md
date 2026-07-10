# Requirements Document

## Introduction

Este documento define los requisitos funcionales y no funcionales para la reconstrucción UX/UI de GifCreatorPro. Los cambios principales son: (1) un panel lateral de ajustes colapsable y (2) un área de canvas como espacio de trabajo principal. Ambas mejoras son puramente de presentación y no alteran la lógica de negocio existente (renderizado FFmpeg, extracción de GIF, eliminación de fondo).

---

## Requirements

### Requirement 1: Panel de Ajustes Colapsable

**User Story:** Como usuario, quiero poder ocultar el panel de ajustes para maximizar el espacio de trabajo del canvas, y volver a mostrarlo cuando necesite cambiar la configuración de exportación.

#### Acceptance Criteria

1. La interfaz DEBE mostrar un botón de toggle (icono `ChevronLeft` / `ChevronRight`) en el borde del panel de ajustes en todo momento, independientemente del estado abierto/cerrado del panel.

2. Cuando el usuario hace clic en el botón de toggle con el panel abierto, el panel de ajustes DEBE ocultarse con una animación de transición de 300ms, y el área de trabajo DEBE expandirse para ocupar el espacio liberado.

3. Cuando el usuario hace clic en el botón de toggle con el panel cerrado, el panel de ajustes DEBE mostrarse con una animación de transición de 300ms, y el área de trabajo DEBE reducirse al ancho correspondiente.

4. El estado abierto/cerrado del panel DEBE persistirse en `localStorage` bajo la clave `gifcreator-panel-open`, de modo que al recargar la página el panel mantenga su último estado.

5. Si `localStorage` no está disponible (modo privado estricto, iframe sandboxed), el panel DEBE iniciar en estado abierto sin lanzar errores.

6. El botón de toggle DEBE tener un atributo `aria-label` dinámico: `"Ocultar ajustes"` cuando el panel está abierto y `"Mostrar ajustes"` cuando está cerrado. DEBE ser alcanzable por teclado (Tab + Enter/Space).

7. Cuando el panel está cerrado, DEBE mostrarse un rail estrecho (~40px) que contenga únicamente el botón de toggle, manteniendo la posición visual del botón consistente.

8. En todo momento, la suma del ancho del panel (o rail) más el ancho del área de trabajo DEBE cubrir el 100% del contenedor principal, sin espacios vacíos ni desbordamiento.

---

### Requirement 2: Canvas como Área de Trabajo Principal

**User Story:** Como usuario, quiero tener un área de trabajo central tipo canvas donde pueda ver y editar los frames de mi GIF, con una experiencia visual clara que distinga el estado vacío del estado con contenido.

#### Acceptance Criteria

1. Cuando no hay frames cargados y no se está extrayendo un GIF, el área de canvas DEBE mostrar una zona de drop prominente con instrucciones claras para subir imágenes, video o GIF.

2. Cuando `isExtractingGif === true`, el área de canvas DEBE mostrar un spinner de carga con el mensaje "Remixando GIF..." en lugar de la zona de drop o el reproductor.

3. Cuando hay al menos un frame cargado, el área de canvas DEBE mostrar el `PreviewPlayer` como elemento principal del canvas, con controles de reproducción visibles.

4. En cualquier momento, exactamente uno de los tres estados del canvas (vacío, extrayendo, con frames) DEBE estar activo y visible. No pueden coexistir dos estados simultáneamente.

5. El componente `Uploader` (zona de drop para añadir más archivos) DEBE estar siempre visible en el `CanvasWorkspace`, independientemente del estado actual del canvas.

6. Cuando `resultUrl !== null`, el `CanvasWorkspace` DEBE mostrar el `ResultBanner` en la parte superior del área de trabajo, por encima del canvas principal.

7. Cuando hay frames cargados, el `TimelineEditor` DEBE mostrarse debajo del canvas principal dentro del `CanvasWorkspace`.

8. Cuando `selectedVideo !== null`, el `VideoTrimmer` DEBE renderizarse dentro del `CanvasWorkspace` como un modal superpuesto.

---

### Requirement 3: Refactorización del Layout en App.tsx

**User Story:** Como desarrollador, quiero que `App.tsx` delegue la lógica de layout a componentes especializados para mantener el código limpio y mantenible.

#### Acceptance Criteria

1. DEBE crearse un componente `CollapsibleSettingsPanel` en `src/components/CollapsibleSettingsPanel.tsx` que encapsule el `SettingsPanel` existente junto con la lógica de colapso/expansión.

2. DEBE crearse un componente `CanvasWorkspace` en `src/components/CanvasWorkspace.tsx` que consolide el `PreviewPlayer`, `Uploader`, `ResultBanner`, `VideoTrimmer`, y `TimelineEditor`.

3. DEBE crearse un hook `useIsPanelOpen` en `src/hooks/useIsPanelOpen.ts` que gestione el estado del panel con persistencia en `localStorage`.

4. Tras la refactorización, `App.tsx` DEBE usar `CollapsibleSettingsPanel` y `CanvasWorkspace` en lugar de los componentes individuales actuales, reduciendo significativamente su JSX.

5. Los tipos en `src/types.ts` NO DEBEN modificarse. Los cambios son exclusivamente de presentación.

6. Los hooks `useFFmpeg`, `useGifExtractor`, `useBackgroundRemover` NO DEBEN modificarse.

---

### Requirement 4: Animaciones y Transiciones

**User Story:** Como usuario, quiero que las transiciones de la interfaz sean suaves y no interrumpan mi flujo de trabajo.

#### Acceptance Criteria

1. La animación de colapso/expansión del panel DEBE durar exactamente 300ms con easing `ease-in-out`.

2. El icono del botón de toggle DEBE rotar suavemente (transform) al cambiar de estado, con una transición de 300ms.

3. El área de trabajo DEBE expandirse/contraerse suavemente al mismo tiempo que el panel, usando `transition` CSS en las propiedades de ancho/flex.

4. Si el usuario tiene activada la preferencia de sistema `prefers-reduced-motion: reduce`, todas las animaciones de la feature DEBEN desactivarse o reducirse a cambios instantáneos.

5. Las transiciones NO DEBEN causar reflow del contenido del canvas (`PreviewPlayer`) ni del `TimelineEditor` durante la animación del panel.

---

### Requirement 5: Responsividad

**User Story:** Como usuario en dispositivo móvil o tablet, quiero que la interfaz se adapte correctamente al tamaño de mi pantalla.

#### Acceptance Criteria

1. En pantallas menores a 768px, el layout DEBE apilarse verticalmente (`flex-col`). El panel de ajustes DEBE mostrarse encima del área de trabajo. El botón de toggle DEBE ocultarse o convertirse en un botón de menú flotante.

2. En pantallas de 768px a 1023px, el comportamiento DEBE ser equivalente al mobile (layout vertical).

3. En pantallas de 1024px o más, el layout de dos columnas (panel + workspace) DEBE activarse. El botón de toggle DEBE ser visible y funcional.

4. En ningún breakpoint DEBE aparecer scroll horizontal en el layout principal.

---

## Glossary

| Término | Definición |
|---------|------------|
| **Panel de ajustes** | El panel lateral izquierdo que contiene `SettingsPanel` con opciones de formato, resolución, velocidad y optimización |
| **Canvas / Área de trabajo** | La zona principal derecha donde se visualiza el `PreviewPlayer` y se gestionan los frames |
| **Rail colapsado** | La franja estrecha (~40px) que permanece visible cuando el panel está cerrado, conteniendo solo el botón de toggle |
| **Toggle** | El botón que alterna el estado abierto/cerrado del panel de ajustes |
| **Frame** | Una imagen individual dentro de la secuencia del GIF, representada por el tipo `FrameImage` |
| **ResultBanner** | El banner que aparece tras un renderizado exitoso, mostrando el GIF/video generado con opción de descarga |
