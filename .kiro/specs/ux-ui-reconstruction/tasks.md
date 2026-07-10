# Implementation Plan: UX/UI Reconstruction — GifCreatorPro

## Overview

Refactor the GifCreatorPro UI by introducing a collapsible settings panel and a unified canvas workspace area. The implementation creates three new components (`CollapsibleSettingsPanel`, `CanvasWorkspace`, `PanelToggleButton`), one new hook (`useIsPanelOpen`), and refactors `App.tsx` to wire them together. No changes to business logic, types, or existing hooks.

## Tasks

- [x] 1. Create `useIsPanelOpen` hook
  - [x] 1.1 Implement `useIsPanelOpen` in `src/hooks/useIsPanelOpen.ts`
    - Read initial state from `localStorage` key `gifcreator-panel-open`; default to `true` if key is absent or `localStorage` throws
    - Wrap `localStorage` access in `try/catch` to handle unavailable storage (private mode, sandboxed iframe)
    - Return `[isPanelOpen: boolean, toggle: () => void]`
    - `toggle` must invert state and persist the new value to `localStorage`
    - _Requirements: 1.4, 1.5, 3.3_

  - [ ]* 1.2 Write property tests for `useIsPanelOpen`
    - **Property 2: Persistencia del toggle** — for any boolean `b`, after `localStorage.setItem('gifcreator-panel-open', String(b))` the hook initialises with `b`
    - **Validates: Requirements 1.4**
    - Use `fast-check` with `fc.boolean()` to generate arbitrary initial states
    - Test that calling `toggle` twice returns to the original state (idempotency)
    - _Requirements: 1.4, 1.5_

- [x] 2. Create `PanelToggleButton` component
  - [x] 2.1 Implement `PanelToggleButton` in `src/components/PanelToggleButton.tsx`
    - Accept `{ isOpen: boolean; onClick: () => void; className?: string }`
    - Render `ChevronLeft` from `lucide-react` when `isOpen === true`, `ChevronRight` when `false`
    - Apply `transition-transform duration-300` to the icon for smooth rotation
    - Set `aria-label` dynamically: `"Ocultar ajustes"` / `"Mostrar ajustes"`
    - Button must be keyboard-accessible (native `<button>` element)
    - _Requirements: 1.1, 1.6, 4.2_

  - [ ]* 2.2 Write property tests for `PanelToggleButton`
    - **Property 4: Accesibilidad del toggle** — for any boolean `isOpen`, the rendered button always has a non-empty `aria-label` and is present in the DOM
    - **Validates: Requirements 1.6**
    - Use `fast-check` with `fc.boolean()` and `@testing-library/react` to render and assert
    - _Requirements: 1.1, 1.6_

- [ ] 3. Create `CollapsibleSettingsPanel` component
  - [x] 3.1 Implement `CollapsibleSettingsPanel` in `src/components/CollapsibleSettingsPanel.tsx`
    - Accept the full `CollapsibleSettingsPanelProps` interface from the design
    - When `isOpen === true`: render `SettingsPanel` with full width and `PanelToggleButton` on the right edge
    - When `isOpen === false`: render only the narrow rail (~40px) containing `PanelToggleButton`
    - Apply CSS `transition` on width and opacity (300ms ease-in-out) for the panel container
    - Respect `prefers-reduced-motion: reduce` by disabling transitions when the media query matches
    - Add `aria-expanded={isOpen}` to the panel container
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.8, 4.1, 4.4_

  - [ ]* 3.2 Write property tests for `CollapsibleSettingsPanel`
    - **Property 3: Cobertura del layout** — for any boolean `isOpen`, the panel container and workspace together always cover 100% of the container (panel renders either full content or rail, never nothing)
    - **Validates: Requirements 1.8**
    - Use `fast-check` with `fc.boolean()` to assert the panel is always present in the DOM
    - _Requirements: 1.7, 1.8_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create `CanvasWorkspace` component
  - [x] 5.1 Implement `CanvasWorkspace` in `src/components/CanvasWorkspace.tsx`
    - Accept the full `CanvasWorkspaceProps` interface from the design
    - Implement the three mutually exclusive canvas states:
      - `frames.length === 0 && !isExtractingGif` → render empty drop zone with upload instructions
      - `isExtractingGif === true` → render spinner with "Remixando GIF..." message
      - `frames.length > 0 && !isExtractingGif` → render `PreviewPlayer` as main canvas element
    - Always render `Uploader` regardless of canvas state
    - Render `ResultBanner` (inline, not extracted to separate component) above the canvas when `resultUrl !== null`
    - Render `VideoTrimmer` modal when `selectedVideo !== null`
    - Render `TimelineEditor` below the canvas when `frames.length > 0`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 5.2 Write property tests for `CanvasWorkspace`
    - **Property 1: Exclusividad del estado del canvas** — for any combination of `{ frames: FrameImage[], isExtractingGif: boolean }`, exactly one of `{EmptyDropZone, ExtractionSpinner, PreviewPlayer}` is visible
    - **Validates: Requirements 2.4**
    - **Property 5: No regresión del Uploader** — for any combination of props, `Uploader` is always present in the rendered output
    - **Validates: Requirements 2.5**
    - Use `fast-check` with `fc.array(fc.record(...))` and `fc.boolean()` to generate arbitrary prop combinations
    - _Requirements: 2.4, 2.5_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Refactor `App.tsx` to use new components
  - [x] 7.1 Integrate `useIsPanelOpen`, `CollapsibleSettingsPanel`, and `CanvasWorkspace` into `App.tsx`
    - Add `const [isPanelOpen, togglePanel] = useIsPanelOpen()` to replace the inline panel state
    - Replace the left-column `<SettingsPanel>` with `<CollapsibleSettingsPanel isOpen={isPanelOpen} onToggle={togglePanel} ...>`
    - Replace the right-column content block with `<CanvasWorkspace ...>` passing all required props
    - Extract `handleDownload` helper for the `onResultDownload` prop
    - Switch the main content container from `grid grid-cols-12` to `flex gap-8` to support the dynamic panel width
    - Remove all JSX that is now encapsulated in `CanvasWorkspace` (ResultBanner, PreviewPlayer, Uploader, VideoTrimmer, TimelineEditor, empty state)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 7.2 Write integration tests for the refactored `App.tsx`
    - **Property 6: Animación no bloqueante** — verify the toggle button click updates `aria-expanded` and panel visibility without blocking workspace interaction
    - **Validates: Requirements 1.2, 1.3, 4.5**
    - Use `@testing-library/react` to render `App`, click the toggle button, and assert panel visibility changes
    - Verify `localStorage` is read on mount and written on toggle
    - _Requirements: 1.2, 1.3, 1.4, 3.4_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Run `npm test` (vitest --run) and confirm all tests pass. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design uses TypeScript throughout; all new files must be `.tsx` (components) or `.ts` (hooks/utilities)
- `src/types.ts` and existing hooks (`useFFmpeg`, `useGifExtractor`, `useBackgroundRemover`) must NOT be modified
- Property tests use `fast-check` (already installed at `^3.23.2`) and `@testing-library/react`
- The `ResultBanner` is not extracted to its own file — it stays inline in `CanvasWorkspace` as it was inline in `App.tsx`
- Tailwind CSS v4 is used; prefer utility classes over custom CSS; use `transition-[width,opacity]` for panel animation
- `prefers-reduced-motion` must be respected in `CollapsibleSettingsPanel` (Requirement 4.4)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "7.1"] },
    { "id": 5, "tasks": ["7.2"] }
  ]
}
```
