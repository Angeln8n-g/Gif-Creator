# Requirements Document

## Introduction

Esta funcionalidad permite al usuario copiar los efectos aplicados a un frame del timeline (animación, transición, texto superpuesto, stickers y recorte/crop) y aplicarlos de forma selectiva a uno o más frames del GIF Creator. El objetivo es agilizar la edición cuando se quiere mantener consistencia visual entre frames sin tener que configurar cada uno manualmente.

La funcionalidad se integra en los componentes `TimelineEditor` y `TimelineItem` del GIF Creator (React + TypeScript + Vite + Tailwind CSS), respetando la estructura de datos existente de `FrameImage`.

---

## Glossary

- **Timeline_Editor**: Componente `TimelineEditor.tsx` que gestiona la lista de frames, el inspector y el contexto de drag & drop.
- **Timeline_Item**: Componente `TimelineItem.tsx` que representa visualmente un frame individual en el timeline.
- **Frame_Inspector**: Componente `FrameInspector.tsx` que muestra y permite editar las propiedades del frame seleccionado.
- **FrameImage**: Tipo TypeScript que representa un frame con las propiedades `id`, `file`, `previewUrl`, `duration`, `animation`, `transition`, `transitionDuration`, `text`, `stickers` y `crop`.
- **Effect_Clipboard**: Estado temporal en memoria que almacena los efectos copiados de un frame fuente, junto con la máscara de efectos seleccionados para pegar.
- **Effect_Mask**: Conjunto de flags booleanos que indica qué categorías de efectos (`animation`, `transition`, `text`, `stickers`, `crop`) se incluirán al pegar.
- **Source_Frame**: Frame del que se copian los efectos.
- **Target_Frame**: Frame o conjunto de frames al que se aplican los efectos copiados.
- **Copy_Effects_Menu**: Menú contextual o panel que aparece al activar la acción de copiar efectos, permitiendo seleccionar la Effect_Mask.
- **Apply_Scope**: Alcance de la aplicación de efectos: frame seleccionado actualmente, frames marcados manualmente, o todos los frames.

---

## Requirements

### Requirement 1: Iniciar la copia de efectos desde un frame

**User Story:** Como usuario del GIF Creator, quiero poder iniciar la acción de copiar efectos desde cualquier frame del timeline, para luego aplicarlos a otros frames.

#### Acceptance Criteria

1. WHEN el usuario activa la acción "Copiar efectos" sobre un Timeline_Item, THE Timeline_Editor SHALL almacenar el `id` del Source_Frame en el Effect_Clipboard.
2. WHEN el usuario activa la acción "Copiar efectos" sobre un Timeline_Item, THE Timeline_Editor SHALL mostrar el Copy_Effects_Menu con las cinco categorías de efectos disponibles: `animation`, `transition`, `text`, `stickers` y `crop`.
3. THE Copy_Effects_Menu SHALL mostrar el estado activo o inactivo de cada categoría según si el Source_Frame tiene ese efecto configurado (distinto de su valor por defecto: `animation !== 'none'`, `transition !== 'none'`, `text` definido con contenido, `stickers.length > 0`, `crop` definido con `shape !== 'none'`).
4. WHEN el Source_Frame no tiene ningún efecto configurado (todos los valores son los predeterminados), THE Copy_Effects_Menu SHALL deshabilitar todas las categorías e informar al usuario que no hay efectos para copiar.
5. THE Timeline_Item SHALL mostrar un indicador visual persistente mientras su frame es el Source_Frame activo en el Effect_Clipboard.

---

### Requirement 2: Seleccionar qué efectos copiar (Effect_Mask)

**User Story:** Como usuario del GIF Creator, quiero elegir qué categorías de efectos copiar antes de pegarlos, para no sobreescribir propiedades que quiero conservar en los frames destino.

#### Acceptance Criteria

1. THE Copy_Effects_Menu SHALL permitir al usuario activar o desactivar de forma independiente cada una de las cinco categorías: `animation`, `transition`, `text`, `stickers` y `crop`.
2. WHEN el usuario confirma la selección en el Copy_Effects_Menu, THE Timeline_Editor SHALL actualizar la Effect_Mask con las categorías seleccionadas.
3. WHEN ninguna categoría está seleccionada en el Copy_Effects_Menu, THE Timeline_Editor SHALL deshabilitar la acción de confirmar y mostrar un mensaje indicando que se debe seleccionar al menos una categoría.
4. THE Copy_Effects_Menu SHALL ofrecer acciones rápidas "Seleccionar todo" y "Deseleccionar todo" para la Effect_Mask.
5. WHILE el Effect_Clipboard contiene un Source_Frame, THE Timeline_Editor SHALL mantener la Effect_Mask persistente hasta que el usuario cancele la operación o inicie una nueva copia desde un frame diferente, en cuyo caso la Effect_Mask se conserva para la nueva operación.

---

### Requirement 3: Aplicar efectos copiados a frames destino

**User Story:** Como usuario del GIF Creator, quiero aplicar los efectos copiados a uno o varios frames, para replicar rápidamente la configuración visual entre frames.

#### Acceptance Criteria

1. WHEN el Effect_Clipboard contiene un Source_Frame con una Effect_Mask válida, THE Timeline_Editor SHALL habilitar la acción "Pegar efectos" en cada Timeline_Item distinto al Source_Frame.
2. WHEN el usuario activa "Pegar efectos" sobre un Timeline_Item individual, THE Timeline_Editor SHALL copiar únicamente las propiedades indicadas por la Effect_Mask del Source_Frame al Target_Frame, sin modificar las propiedades no incluidas en la Effect_Mask.
3. WHEN el usuario activa "Aplicar a todos los frames", THE Timeline_Editor SHALL aplicar la Effect_Mask del Source_Frame a todos los frames del timeline excepto al Source_Frame.
4. WHEN el usuario activa "Aplicar a frames seleccionados", THE Timeline_Editor SHALL aplicar la Effect_Mask del Source_Frame únicamente a los frames que el usuario haya marcado explícitamente como Target_Frame, excluyendo automáticamente el Source_Frame aunque esté entre los seleccionados.
5. WHEN el Apply_Scope incluye el Source_Frame entre los Target_Frames marcados, THE Timeline_Editor SHALL proceder con la operación excluyendo el Source_Frame y aplicando los efectos al resto de Target_Frames seleccionados.
6. WHEN la operación de pegado se completa, THE Timeline_Editor SHALL actualizar el estado de `frames` mediante `setFrames` con los nuevos valores de los Target_Frames afectados.

---

### Requirement 4: Selección múltiple de frames destino

**User Story:** Como usuario del GIF Creator, quiero marcar varios frames como destino antes de pegar efectos, para aplicar la configuración a un subconjunto específico del timeline.

#### Acceptance Criteria

1. WHEN el Effect_Clipboard está activo, THE Timeline_Editor SHALL habilitar un modo de selección múltiple en el que el usuario puede marcar o desmarcar Timeline_Items como Target_Frames.
2. WHEN el usuario marca un Timeline_Item como Target_Frame, THE Timeline_Item SHALL mostrar un indicador visual diferenciado del indicador de selección normal (frame inspeccionado).
3. WHILE el modo de selección múltiple está activo, THE Timeline_Editor SHALL mostrar el conteo de Target_Frames seleccionados.
4. THE Timeline_Editor SHALL ofrecer una acción "Seleccionar todos" que marque todos los frames excepto el Source_Frame como Target_Frames.
5. WHEN el usuario cancela la operación de copia o limpia el Effect_Clipboard, THE Timeline_Editor SHALL desactivar el modo de selección múltiple y limpiar todos los Target_Frames marcados.

---

### Requirement 5: Cancelar y limpiar el Effect_Clipboard

**User Story:** Como usuario del GIF Creator, quiero poder cancelar la operación de copiar/pegar efectos en cualquier momento, para volver al estado normal del timeline sin cambios no deseados.

#### Acceptance Criteria

1. WHEN el usuario activa la acción "Cancelar copia", THE Timeline_Editor SHALL limpiar el Effect_Clipboard, la Effect_Mask y los Target_Frames marcados.
2. WHEN el usuario inicia una nueva copia de efectos desde un frame diferente mientras el Effect_Clipboard ya contiene datos, THE Timeline_Editor SHALL reemplazar el Effect_Clipboard con los datos del nuevo Source_Frame y reiniciar la Effect_Mask.
3. WHEN el Source_Frame es eliminado del timeline mientras el Effect_Clipboard está activo, THE Timeline_Editor SHALL limpiar automáticamente el Effect_Clipboard y desactivar el modo de selección múltiple.
4. IF el usuario deshace (undo) una operación de pegado, THEN THE Timeline_Editor SHALL restaurar los valores previos de los Target_Frames afectados.

---

### Requirement 6: Retroalimentación visual del estado de copia

**User Story:** Como usuario del GIF Creator, quiero recibir retroalimentación visual clara sobre qué frame es la fuente, qué frames son destino y qué efectos se van a pegar, para evitar errores al aplicar efectos.

#### Acceptance Criteria

1. WHILE el Effect_Clipboard está activo, THE Timeline_Item correspondiente al Source_Frame SHALL mostrar un borde o indicador de color distinto al de la selección normal.
2. WHILE el modo de selección múltiple está activo, THE Timeline_Item de cada Target_Frame marcado SHALL mostrar un indicador visual de "destino seleccionado".
3. THE Timeline_Editor SHALL mostrar un banner o barra de estado persistente mientras el Effect_Clipboard está activo, indicando el nombre o índice del Source_Frame y las categorías de la Effect_Mask activa.
4. WHEN la operación de pegado se completa y al menos un frame fue modificado, THE Timeline_Editor SHALL mostrar una notificación breve (máximo 3 segundos) indicando cuántos frames fueron actualizados.
5. WHEN el usuario pasa el cursor sobre un Timeline_Item con "Pegar efectos" disponible, THE Timeline_Item SHALL mostrar un tooltip indicando las categorías de efectos que se van a aplicar.
