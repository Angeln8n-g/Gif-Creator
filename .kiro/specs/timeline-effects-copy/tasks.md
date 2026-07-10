# Implementation Plan: timeline-effects-copy

## Overview

Implement a copy-paste effects workflow inside the existing `TimelineEditor` / `TimelineItem` component tree. The feature introduces three new pieces of state (`effectClipboard`, `effectMask`, `targetFrameIds`), three new UI components (`CopyEffectsMenu`, `EffectsStatusBanner`, `PasteNotification`), and a set of pure helper functions (`hasEffect`, `applyEffectMask`) that keep all paste logic testable in isolation. An undo stack enables `Ctrl+Z` restoration of pasted frames.

---

## Tasks

- [x] 1. Set up test infrastructure and extend TypeScript types
  - [x] 1.1 Install test dependencies and configure Vitest
    - Add `vitest`, `@vitest/ui`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`, and `jsdom` to `devDependencies` in `package.json`
    - Create `vitest.config.ts` at the project root with `jsdom` environment and `globals: true`
    - Add a `"test"` script (`vitest --run`) to `package.json`
    - _Requirements: (infrastructure for all requirements)_

  - [x] 1.2 Add new TypeScript types to `src/types.ts`
    - Export `EffectCategory` union type: `'animation' | 'transition' | 'text' | 'stickers' | 'crop'`
    - Export `EffectClipboard` interface with `sourceFrameId: string` and `sourceEffects` snapshot fields
    - Export `EffectMask` type alias: `Set<EffectCategory>`
    - _Requirements: 1.1, 2.1, 3.2_

- [x] 2. Implement pure helper functions
  - [x] 2.1 Implement `hasEffect` in `src/utils/effectHelpers.ts`
    - Create `src/utils/effectHelpers.ts`
    - Implement `hasEffect(frame: FrameImage, cat: EffectCategory): boolean` using the five detection rules from the design (`animation !== 'none'`, `transition !== 'none'`, `text?.content` truthy, `stickers.length > 0`, `crop?.shape !== 'none'`)
    - _Requirements: 1.3_

  - [ ]* 2.2 Write property test for `hasEffect` (Property 2)
    - Create `src/utils/__tests__/effectHelpers.test.ts`
    - Use `fast-check` arbitraries from the design (`arbFrame`) to verify that `hasEffect` result matches the expected active/inactive state for each category
    - Tag: `// Feature: timeline-effects-copy, Property 2: Category active state matches frame effects`
    - **Property 2: Category active state matches frame effects**
    - **Validates: Requirements 1.3**

  - [x] 2.3 Implement `applyEffectMask` in `src/utils/effectHelpers.ts`
    - Implement `applyEffectMask(target: FrameImage, source: EffectClipboard['sourceEffects'], mask: EffectMask): FrameImage`
    - Spread `target`, then overwrite only the properties whose category is present in `mask`; deep-copy arrays and objects to avoid shared references
    - _Requirements: 3.2_

  - [ ]* 2.4 Write property tests for `applyEffectMask` (Properties 4, 5, 6, 7)
    - Add tests to `src/utils/__tests__/effectHelpers.test.ts`
    - **Property 4: Paste only modifies masked properties** — for any source, target, and mask, masked props equal source values and unmasked props equal original target values
    - **Property 5: Apply-to-all leaves source frame unchanged** — source frame is byte-for-byte identical after paste-to-all
    - **Property 6: Apply-to-selected excludes source even when included** — source frame unchanged; only non-source targets are updated; untouched frames unchanged
    - **Property 7: Paste-eligible set excludes source** — `canPaste === true` for all frames except source
    - Tag each test: `// Feature: timeline-effects-copy, Property N: <text>`
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.1**

- [ ] 3. Checkpoint — Ensure all helper tests pass
  - Run `npm test` and confirm all tests in `src/utils/__tests__/effectHelpers.test.ts` pass. Ask the user if questions arise.

- [ ] 4. Implement `CopyEffectsMenu` component
  - [ ] 4.1 Create `src/components/CopyEffectsMenu.tsx`
    - Accept props: `sourceFrame`, `mask`, `onToggleCategory`, `onSelectAll`, `onDeselectAll`, `onConfirm`, `onCancel`
    - Render all five category toggles; use `hasEffect` to show active/inactive badge per category
    - Disable all toggles and show "no hay efectos para copiar" message when source frame has no active effects (Requirement 1.4)
    - Disable the confirm button when `mask.size === 0` and show "selecciona al menos una categoría" hint (Requirement 2.3)
    - Render "Seleccionar todo" and "Deseleccionar todo" quick-action buttons (Requirement 2.4)
    - Use existing dark-card / `border-dark-border` / Tailwind styling consistent with the project
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.3, 2.4_

  - [ ]* 4.2 Write unit tests for `CopyEffectsMenu`
    - Create `src/components/__tests__/CopyEffectsMenu.test.tsx`
    - Test: renders all 5 category toggles
    - Test: confirm button disabled when no category selected
    - Test: select-all / deselect-all quick actions call the correct callbacks
    - Test: all toggles disabled and message shown when source frame has no effects
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.3, 2.4_

  - [ ]* 4.3 Write property test for `CopyEffectsMenu` mask confirmation (Property 3)
    - Add to `src/components/__tests__/CopyEffectsMenu.test.tsx` or a dedicated `effectClipboard.test.ts`
    - For any non-empty subset of the five categories, confirming that selection results in `effectMask` containing exactly those categories
    - Tag: `// Feature: timeline-effects-copy, Property 3: Effect_Mask reflects confirmed selection exactly`
    - **Property 3: Effect_Mask reflects confirmed selection exactly**
    - **Validates: Requirements 2.1, 2.2**

- [x] 5. Implement `EffectsStatusBanner` component
  - [x] 5.1 Create `src/components/EffectsStatusBanner.tsx`
    - Accept props: `sourceIndex`, `mask`, `targetCount`, `onPasteToSelected`, `onPasteToAll`, `onSelectAllTargets`, `onCancel`
    - Display source frame index (1-based), active mask category names, and target count (Requirement 6.3)
    - Disable paste buttons when `mask.size === 0`
    - Render "Seleccionar todos" action (Requirement 4.4)
    - Render "Cancelar" action (Requirement 5.1)
    - _Requirements: 4.3, 4.4, 5.1, 6.3_

  - [ ]* 5.2 Write property tests for `EffectsStatusBanner` (Properties 9, 12)
    - Create `src/components/__tests__/EffectsStatusBanner.test.tsx`
    - **Property 9: Target count equals size of targetFrameIds** — displayed count matches `targetFrameIds.size` for any subset
    - **Property 12: Status banner reflects active mask categories** — categories listed in banner equal exactly the categories in `effectMask`
    - Tag each test: `// Feature: timeline-effects-copy, Property N: <text>`
    - **Validates: Requirements 4.3, 6.3**

- [x] 6. Implement `PasteNotification` component
  - [x] 6.1 Create `src/components/PasteNotification.tsx`
    - Accept props: `count`, `onDismiss`
    - Display "N frames actualizados" message
    - Auto-dismiss after 3 seconds using `useEffect` + `setTimeout`; call `onDismiss` on timeout or manual close
    - _Requirements: 6.4_

  - [ ]* 6.2 Write unit test for `PasteNotification` auto-dismiss
    - Create `src/components/__tests__/PasteNotification.test.tsx`
    - Test: component calls `onDismiss` after 3 seconds (use `vi.useFakeTimers`)
    - _Requirements: 6.4_

- [x] 7. Extend `TimelineItem` with copy-paste props and visual indicators
  - [x] 7.1 Add new optional props to `TimelineItem`
    - Extend `TimelineItemProps` in `src/components/TimelineItem.tsx` with: `isSource?`, `isTarget?`, `canPaste?`, `effectMask?`, `onCopyEffects?`, `onPasteEffects?`, `onToggleTarget?`
    - _Requirements: 1.5, 3.1, 4.2, 6.1, 6.2_

  - [x] 7.2 Render source indicator on `TimelineItem`
    - When `isSource === true`, apply a distinct border/ring color (e.g. `ring-2 ring-amber-400`) different from the normal selection indicator
    - _Requirements: 1.5, 6.1_

  - [x] 7.3 Render target indicator and paste button on `TimelineItem`
    - When `isTarget === true`, show a "destino seleccionado" badge/indicator distinct from normal selection
    - When `canPaste === true`, render a "Pegar efectos" button/icon
    - When `canPaste === true` and user hovers, show a tooltip listing the categories in `effectMask` (Requirement 6.5)
    - When `canPaste === true`, clicking the frame body toggles `onToggleTarget`; clicking the paste button calls `onPasteEffects`
    - _Requirements: 3.1, 4.1, 4.2, 6.2, 6.5_

  - [ ]* 7.4 Write property test for paste-eligible set (Property 7)
    - Create `src/components/__tests__/TimelineItem.test.tsx`
    - For any list of frames and any source frame id, `canPaste === true` for all frames except the source
    - Tag: `// Feature: timeline-effects-copy, Property 7: Paste-eligible set excludes source`
    - **Property 7: Paste-eligible set excludes source**
    - **Validates: Requirements 3.1**

- [ ] 8. Checkpoint — Ensure all component tests pass
  - Run `npm test` and confirm all component tests pass. Ask the user if questions arise.

- [x] 9. Implement clipboard state and paste logic in `TimelineEditor`
  - [x] 9.1 Add clipboard state to `TimelineEditor`
    - Add `useState` for `effectClipboard: EffectClipboard | null`, `effectMask: EffectMask`, `targetFrameIds: Set<string>`, `undoStack: FrameImage[][]`, and `pasteNotificationCount: number | null`
    - _Requirements: 1.1, 2.1, 5.4_

  - [x] 9.2 Implement `copyEffects` callback
    - Snapshot source frame's effects into `EffectClipboard`; store `sourceFrameId`
    - If clipboard already active, replace it and reset `targetFrameIds` but preserve `effectMask` (Requirement 5.2)
    - Open `CopyEffectsMenu` by setting a `showCopyMenu` flag
    - _Requirements: 1.1, 1.2, 5.2_

  - [ ]* 9.3 Write property test for `copyEffects` (Properties 1, 10)
    - Create `src/utils/__tests__/effectClipboard.test.ts`
    - **Property 1: Copy stores the correct source frame id** — `effectClipboard.sourceFrameId === frameId` after `copyEffects(frameId)`
    - **Property 10: New copy replaces clipboard source** — after `copyEffects(A)` then `copyEffects(B)`, `sourceFrameId === B`
    - Tag each test: `// Feature: timeline-effects-copy, Property N: <text>`
    - **Validates: Requirements 1.1, 5.2**

  - [x] 9.4 Implement `toggleCategory`, `selectAll`, `deselectAll` callbacks
    - `toggleCategory(cat)`: add/remove category from `effectMask`
    - `selectAll()`: set `effectMask` to all five categories
    - `deselectAll()`: clear `effectMask`
    - _Requirements: 2.1, 2.4_

  - [x] 9.5 Implement `toggleTargetFrame` and `selectAllTargets` callbacks
    - `toggleTargetFrame(id)`: add/remove frame id from `targetFrameIds` (source frame id is never added)
    - `selectAllTargets()`: set `targetFrameIds` to all frame ids except `sourceFrameId`
    - _Requirements: 4.1, 4.4_

  - [ ]* 9.6 Write property tests for target selection (Properties 8, 9)
    - Create `src/utils/__tests__/targetSelection.test.ts`
    - **Property 8: Select-all targets marks all frames except source** — `targetFrameIds` contains every frame id except source after `selectAllTargets`
    - **Property 9: Target count equals size of targetFrameIds** — `targetFrameIds.size` matches the count passed to `EffectsStatusBanner`
    - Tag each test: `// Feature: timeline-effects-copy, Property N: <text>`
    - **Validates: Requirements 4.3, 4.4**

  - [x] 9.7 Implement `pasteToFrame`, `pasteToSelected`, `pasteToAll` callbacks
    - Before each paste, push current `frames` snapshot onto `undoStack`
    - `pasteToFrame(id)`: apply `applyEffectMask` to the single target frame; skip if `id === sourceFrameId`
    - `pasteToAll()`: apply `applyEffectMask` to every frame except source; call `setFrames`
    - `pasteToSelected()`: apply `applyEffectMask` to frames in `targetFrameIds` excluding source; no-op if result set is empty (no undo snapshot pushed, no notification shown)
    - After a successful paste, set `pasteNotificationCount` to the number of modified frames (Requirement 6.4)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4_

  - [x] 9.8 Implement `clearClipboard` and `cancelCopy` callbacks
    - `clearClipboard()`: reset `effectClipboard`, `effectMask`, `targetFrameIds`, `undoStack`, `showCopyMenu`
    - `cancelCopy()`: call `clearClipboard()` (Requirement 5.1)
    - _Requirements: 5.1_

  - [x] 9.9 Implement undo handler (`Ctrl+Z`)
    - Add `useEffect` that listens for `keydown` with `ctrlKey + z`
    - Pop top of `undoStack`, call `setFrames` with the snapshot (Requirement 5.4)
    - _Requirements: 5.4_

  - [x] 9.10 Implement source-frame-deleted guard
    - Add `useEffect` watching `[frames, effectClipboard]`
    - If `effectClipboard` is set and `sourceFrameId` is no longer in `frames`, call `clearClipboard()` (Requirement 5.3)
    - _Requirements: 5.3_

- [ ] 10. Checkpoint — Ensure all state logic tests pass
  - Run `npm test` and confirm all tests pass. Ask the user if questions arise.

- [ ] 11. Implement undo stack property tests
  - [ ]* 11.1 Write property test for undo (Property 11)
    - Create `src/utils/__tests__/undoStack.test.ts`
    - For any paste operation (any source, any target set, any mask), after paste then undo, every modified frame has its exact pre-paste values restored and unaffected frames remain unchanged
    - Tag: `// Feature: timeline-effects-copy, Property 11: Undo restores all affected frames`
    - **Property 11: Undo restores all affected frames**
    - **Validates: Requirements 5.4**

- [x] 12. Wire new components into `TimelineEditor`
  - [x] 12.1 Render `CopyEffectsMenu` inside `TimelineEditor`
    - Conditionally render `CopyEffectsMenu` below the timeline strip when `showCopyMenu === true`
    - Pass all required callbacks (`onToggleCategory`, `onSelectAll`, `onDeselectAll`, `onConfirm`, `onCancel`)
    - _Requirements: 1.2, 2.1, 2.3, 2.4_

  - [x] 12.2 Render `EffectsStatusBanner` inside `TimelineEditor`
    - Conditionally render `EffectsStatusBanner` when `effectClipboard !== null`
    - Compute `sourceIndex` as 1-based position of source frame in `frames`
    - Pass `targetCount`, `mask`, and all action callbacks
    - _Requirements: 4.3, 4.4, 5.1, 6.3_

  - [x] 12.3 Render `PasteNotification` inside `TimelineEditor`
    - Conditionally render `PasteNotification` when `pasteNotificationCount !== null`
    - Pass `count` and `onDismiss` (sets `pasteNotificationCount` back to `null`)
    - _Requirements: 6.4_

  - [x] 12.4 Pass copy-paste props to each `TimelineItem`
    - For each frame, compute and pass: `isSource`, `isTarget`, `canPaste`, `effectMask`, `onCopyEffects`, `onPasteEffects`, `onToggleTarget`
    - Add "Copiar efectos" trigger (button or context menu item) to `TimelineItem` that calls `onCopyEffects(id)`
    - _Requirements: 1.1, 1.5, 3.1, 4.1, 4.2, 6.1, 6.2, 6.5_

  - [ ]* 12.5 Write property test for status banner tooltip (Property 13)
    - Create `src/utils/__tests__/statusBanner.test.ts`
    - For any `EffectMask`, the tooltip on paste-eligible `TimelineItem` components contains exactly the names of the categories present in the mask
    - Tag: `// Feature: timeline-effects-copy, Property 13: Paste tooltip lists active mask categories`
    - **Property 13: Paste tooltip lists active mask categories**
    - **Validates: Requirements 6.5**

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Run `npm test` and confirm the full test suite passes. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests use `fast-check` with a minimum of 100 iterations each
- Unit tests cover specific scenarios and edge cases complementary to property tests
- All paste logic lives in pure functions (`hasEffect`, `applyEffectMask`) for easy isolation
- The undo stack is cleared when the clipboard is cleared to avoid stale snapshots

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "4.1", "5.1", "6.1", "7.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.2", "6.2", "7.2", "7.3"] },
    { "id": 4, "tasks": ["7.4", "9.1"] },
    { "id": 5, "tasks": ["9.2", "9.4", "9.5"] },
    { "id": 6, "tasks": ["9.3", "9.6", "9.7", "9.8", "9.9", "9.10"] },
    { "id": 7, "tasks": ["11.1", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 8, "tasks": ["12.5"] }
  ]
}
```
