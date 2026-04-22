# TODO

Open work items tracked outside of active chat sessions. Items ordered P0 → P2.

---

## P0 — Story Mode: wire legacy demo to real scenarios

### What legacy Vue (`apps/web-source`) actually does

- [StoryModeWrapper.vue](apps/web-source/src/modules/storymode/StoryModeWrapper.vue) — always calls `loadDemoScenario("falkland82")` unless `?load=<id>` is present. No real entry point from the editor.
- [StoryModeView.vue](apps/web-source/src/modules/storymode/StoryModeView.vue) — imports `chapter, actions, content` from [testStory.ts](apps/web-source/src/testdata/testStory.ts) (hardcoded demo markdown + `{time?, view?}` tuples). Uses an amber "Test" banner.
- [StoryModeContent.vue](apps/web-source/src/modules/storymode/StoryModeContent.vue) — scrollama splits the markdown on `::: scroll-step` fences; each step index emits `actions[index]` → parent sets current time + `flyTo(view)`.
- **Persistence: none story-specific.** The scenario itself is the only persisted artifact; story narration is hardcoded in a test data file.

### What scenarios already persist (the key insight)

The scenario data model **already has a first-class narration-capable event type** — no new schema needed.

- [scenarioModels.ts](apps/web-source/src/types/scenarioModels.ts) — `Scenario.events: ScenarioEvent[]` where `ScenarioEvent` has `title`, `subTitle`, `description` (markdown-capable), `media[]`, `externalUrl`, `startTime`, `uiActions[]`, and `where: UnitsWhere | GeometryWhere` (target units or geometry).
- [ScenarioEventsPanel.vue](apps/web-source/src/modules/scenarioeditor/ScenarioEventsPanel.vue) — full CRUD already wired: `addScenarioEvent`, `updateScenarioEvent`, `deleteScenarioEvent`, `goToScenarioEvent`.
- [scenarioEvents.ts](apps/web-source/src/modules/scenarioeditor/scenarioEvents.ts) — `onGoToScenarioEventEvent` already does `geoStore.zoomToUnits(units)` / `zoomToGeometry(geometry)` on dispatch.
- Our platform persists the whole scenario JSON in `Scenario.data: Json` (Prisma). `events` roundtrips as-is — **no new table, no migration**.

### Plan: reuse `ScenarioEvent` as the story-step primitive

Scrap the `StoryStep` interface from the old plan. Each `ScenarioEvent` IS the step.

1. **Route** — new `/scenario/:scenarioId/story` that loads the user's actual scenario (same loader the editor uses). Drop `loadDemoScenario("falkland82")` fallback when a real id is present; keep it only as an unauthenticated marketing demo.
2. **Entry point** — "Play story" button in the scenario editor top bar → `router.push({ name: STORY_MODE_ROUTE, params: { scenarioId } })`.
3. **Remove the amber "Test" banner** when loaded with a real scenario id.
4. **Playback composable** — `src/features/storymode/usePlayback.ts`: walks `store.state.events` (already chronologically sortable by `startTime`). `currentStepIndex`, `play/pause/next/prev/goTo`. On step enter: `setCurrentTime(event.startTime)` + `goToScenarioEvent(event)` (which already animates the map via existing `zoomToUnits`/`zoomToGeometry`).
5. **NarrationOverlay** — `src/features/storymode/NarrationOverlay.vue`: bottom-center card showing `event.title`, `event.subTitle`, markdown-rendered `event.description`, `event.media`. Prev/Play/Next + progress dots. Replaces the scrollama path.
6. **Fallback** — if `state.events.length === 0`, render the existing Scrollama+testdata path so the demo/landing page still works.
7. **Auto-advance** — optional per-event `durationMs` stored inside `event.description` frontmatter or a new optional field. Keep out of scope for MVP; manual Next is fine.
8. **Resume** — `sessionStorage[scenarioId]` stores last step index.

### Authoring

The existing [ScenarioEventsPanel.vue](apps/web-source/src/modules/scenarioeditor/ScenarioEventsPanel.vue) is already the authoring UI — no new editor needed for MVP. Users add events with `title`/`description`/`where` there; Story Mode plays them back.

Optional later: a "Story view" toggle on the panel that scopes visible events to a `storyOrder` flag, so narration events don't mix with combat events.

---

## P1 — Nice-to-have around Story Mode

### Voiceover

- `src/features/storymode/useSpeech.ts` wraps `window.speechSynthesis`. Auto-advance awaits `onend` or `durationMs`, whichever is longer. Mute + rate controls in `localStorage`.

### Story-only event filter

- If users want narration events that don't appear in the combat timeline, add `ScenarioEvent.presentation?: "story" | "combat" | "both"` (defaults to `"both"`). Filter the events panel and Story Mode independently. Small additive field in `Scenario.data.events[]`.

### AI features follow-up

- Ship path + size knobs in the AI dialog (currently hardcoded `board.width/height` from the model). Let the user pin board size.
- Cache last-used `provider` in `localStorage`.
- Detection when the selected provider's API key is missing server-side → show actionable error instead of raw 500.

---

## P2 — Parking lot

### SVG export from Konva

- Only if infinite-zoom map rendering is ever demanded. Current PNG @ 2× pixelRatio is sufficient for fixed-size map icons.

### Branching stories

- Out of MVP. If pursued, `ScenarioEvent.branches?: { label; targetEventId }[]` + gating logic. Defer until a real use case shows up.
