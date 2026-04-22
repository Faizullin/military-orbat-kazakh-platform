# Scenario authoring — step-by-step

How to build a two-sided tactical scenario in the editor, place symbols, scrub the timeline, wire up events, and optionally play it back as a story.

This walks the actual editor UI in [apps/web](../apps/web). Nothing here assumes features we haven't shipped — the last phase (Story Mode) links a button that is planned in [TODO.md](TODO.md); treat that phase as "what authoring looks like once the port lands."

---

## Phase 1 — Create the scenario

**Goal:** start a new, empty ORBAT with two sides: one friendly (the side you're "playing"), one hostile.

1. **Open the landing page**, click **"New scenario"**.
2. In the form:
   - **Name**: a short title — e.g. `Operation Bravo`.
   - **Description**: one or two lines of framing (optional).
   - **Start time + time zone**: pick the in-world H-hour. Everything on the timeline is anchored here.
   - **Symbology standard**: `APP-6` (NATO) or `MIL-STD-2525D` (US). Picks glyph shapes; doesn't change behavior.
3. **Sides — leave the two defaults, rename them:**
   - **Side 1**: keep **Standard Identity = Friend** → rename to **"Blue" (we)**. This is the side you'll be defining tactics for.
   - **Side 2**: keep **Standard Identity = Hostile** → rename to **"Red" (attacker)** or **"Red (defender)"** depending on who you're modeling the attack against.
   - For each side leave one root unit called `HQ` with echelon `Division` (18) and icon `Infantry` / `Combined Arms` / etc. The root unit becomes the ORBAT tree's top node.
4. Click **Create**. The editor opens on the map at the scenario's start time.

> **Convention used throughout this doc:** "we" = Blue = Friend. "they" = Red = Hostile. When adding events later, annotate them from Blue's perspective ("Red armor advances to Phase Line Alpha") so the narration reads consistently.

---

## Phase 2 — Build the ORBAT

**Goal:** flesh out each side's tree so you have units to place on the map.

The left sidebar shows the **ORBAT panel** (`OrbatPanel.vue`). It's a tree:

```
Blue (side)
 └─ Group 1 (side group — a division/formation bucket)
     └─ HQ (unit)
Red (side)
 └─ Group 1
     └─ HQ
```

### Add sub-units

1. Right-click a unit (or click its three-dots menu) → **Add sub-unit**.
2. In the dialog, pick:
   - **Name** (e.g. `1st Battalion`).
   - **Echelon** (Battalion, Company, Platoon…). Changes the bars above the symbol.
   - **Icon** (Infantry / Armor / Artillery / Mechanized / etc.).
3. Repeat. A realistic two-sided scenario wants ~3–6 maneuver units per side, plus artillery and/or a recon element.

### Reorder / re-parent

- Drag units in the ORBAT tree to re-parent them.
- **Undo/Redo** on the top toolbar (or `Ctrl+Z` / `Ctrl+Y`) — every add/move/delete is reversible.

### Copy one side's structure to the other

If Blue and Red are symmetric forces, build Blue first, then right-click the side → **Duplicate** — rename the copy to Red and flip its Standard Identity.

---

## Phase 3 — Place symbols on the map

**Goal:** position each unit geographically. By default units have no location; they won't render on the map until placed.

### Option A — from the ORBAT tree (precise)

1. Right-click a unit → **Edit location**, or select the unit and click the map with the crosshair cursor.
2. Click the map where the unit should be at **the current scenario time**.

### Option B — from the main toolbar (fast)

The bottom-center map toolbar (`MapEditorMainToolbar.vue`) has an **Add symbol** popover:

1. Click the **"+"** icon in the toolbar, or press the keyboard shortcut shown on hover.
2. The **SymbolPickerPopover** opens with four tabs: **Land**, **Sea**, **Air**, and **My Library** (your custom DB symbols).
3. Click a symbol → the cursor becomes a crosshair → click the map to drop.
4. The popover closes; the new unit is added under the currently selected side/group.

### Option C — drag from ORBAT tree

Drag a unit from the ORBAT panel directly onto the map.

### Moving an existing unit

- **Select** the unit on the map → drag it. This records a **state change** at the current scenario time (see Phase 4).
- Or right-click → **Edit location** for precise lat/lon entry.

### Symbol appearance

- Blue (Friendly) renders as a **blue rectangle** frame (APP-6) or **cyan** (2525D).
- Red (Hostile) renders as a **red diamond**.
- To customize colors globally: **Settings → Symbol color settings**.

---

## Phase 4 — Move units through time (timeline)

**Goal:** show what happens between T0 and T+N. The timeline turns static symbols into a time-aware ORBAT.

### What the timeline is

- The bottom strip (`ScenarioTimeline.vue`) shows a time axis with:
  - A **playhead** at `currentTime`.
  - **Tick marks** (hours/days, depending on zoom).
  - **Event markers** (triangles — added in Phase 5).
  - A **histogram** of unit state changes per bucket.
- **Drag the playhead** to scrub. Units will jump/interpolate to their position at that time.
- **Zoom**: `+`/`-` buttons on the timeline, or scroll over it. Zoom out to see the whole operation, in to place sub-hour actions.

### Record a movement

The editor can record positions automatically as you scrub + drag:

1. **Set `currentTime`** to the moment the action happens (drag the playhead, or click a time in the header).
2. **Drag the unit** on the map to its new location.
3. The move is recorded as a **unit state change** at that timestamp — visible as a pin on the timeline when the unit is selected.

### Recording mode (optional, for back-to-back moves)

Toggle the **Recording** toggle (top toolbar, circular dot icon). While on, every unit move auto-commits as a state change at `currentTime`. Useful for blocking out a phase line advance across several units.

### Set a unit's initial position

The very first time you place a unit, its state is written **at the scenario start time**. To change its origin, scrub to start time, then drag it.

### Playback

The **PlaybackMenu** (toolbar) offers Play/Pause + speed (1×, 2×, 5×, 10×). Hit Play and the playhead advances; units animate between state points.

---

## Phase 5 — Author events (narration)

**Goal:** attach human-readable beats to specific moments — "Red crosses LD", "Blue artillery fires", "H+4 objective secured". These are first-class `ScenarioEvent` objects persisted with the scenario.

### Where events live in the UI

- **Left sidebar → Events tab** (`ScenarioEventsPanel.vue`). A vertical list of all events, oldest → newest.
- **Timeline**: each event renders as a small triangle marker at its timestamp.
- **Right details panel** (`ScenarioEventDetails.vue`): opens when you click an event.

### Add an event

1. Scrub the playhead to the moment (or skip this — the dialog lets you set time manually).
2. In the Events panel, click **"+ Add event"**. The editor drops in a placeholder titled `Event <day>` at the current time.
3. Click the new event → the details panel opens on the right.
4. Fill in:
   - **Title**: short — e.g. `Red armor at PL Alpha`.
   - **Sub-title**: optional context — e.g. `H+2:15`.
   - **Description**: markdown — this is the narration body. Multi-paragraph is fine.
   - **External URL**: optional link to a source (Wikipedia, after-action report).
   - **Media**: image / caption — shown above the narration.
5. **Link the event to the map** via the "Where" field:
   - **Units** → pick one or more (e.g. "Red 1st Armor Bn") — the map will zoom/fit to those units.
   - **Geometry** → draw a region — the map will fit to it.
   - Optional `maxZoom` to cap the zoom-in.

### Replay an event

- Click the event in the panel → `goToScenarioEvent` fires:
  - `currentTime` jumps to `event.startTime`.
  - The map animates via `flyTo` to the event's `where` target.
- Same thing happens when you click the event's triangle on the timeline.

### Pacing suggestion (two-sided attack)

For a clean attack/defense story, typical events:

1. **T0** — "Initial dispositions" (Where: both sides' root HQs).
2. **T+X** — "Red LD" (Where: Red lead maneuver unit).
3. **T+X** — "Blue observes Red advance" (Where: Blue forward observation element).
4. **T+Y** — "Blue artillery salvo" (Where: geometry — the target impact box).
5. **T+Z** — "Red reaches objective / Red culminates" (Where: relevant Red unit).
6. **T+end** — "Endstate" (Where: geometry covering the final frontage).

Ten events is plenty for a briefing-length scenario.

---

## Phase 6 — Optional: play the scenario as a Story

**Status today:** in the legacy `apps/web-source` editor, Story Mode exists but is **not linked from the scenario page** — it's a standalone `/storymode` route that plays a hardcoded demo. See [TODO.md](TODO.md) for the planned port.

**Once the port lands, the flow will be:**

1. In the scenario editor top bar, click **"Play story"**.
2. You're routed to `/scenario/:scenarioId/story`.
3. A `NarrationOverlay` appears at the bottom of the map. It walks your `ScenarioEvent`s in chronological order.
4. Each step:
   - Renders `event.title` + markdown `event.description` + `event.media`.
   - Fires `goToScenarioEvent(event)` → sets `currentTime`, animates the map to the event's `where`.
5. Controls: **Prev** / **Play** (auto-advance if durations set) / **Next** / progress dots.
6. If your scenario has **zero events**, the route falls back to the legacy Scrollama demo so the `/storymode` landing-page link still works.

### No extra data model

You **don't** author separate "story steps" — the `ScenarioEvent`s you already wrote in Phase 5 *are* the story. Story Mode is a different renderer on top of the same events. This is why pacing in Phase 5 matters: the order and granularity of events becomes the tempo of the narration.

### Tips for narration-ready events

- Make `description` a complete sentence or short paragraph, not a tag. It's read aloud in someone's head (or literally, once voiceover lands).
- Prefer **units** over **geometry** in `where` when a specific formation is "doing" the thing — the viewer follows the actor.
- Set `maxZoom` on tight events so the map doesn't zoom all the way to a single platoon icon.

---

## Quick reference — keyboard

| Action | Shortcut |
| --- | --- |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` |
| Select tool | `V` |
| Move tool | `M` |
| Add symbol (open picker) | `A` |
| Draw tool | `D` |
| Measurement | `R` |
| Play / pause playback | `Space` |
| Next / previous event | `]` / `[` |

(Some bindings live in `KeyboardScenarioActions.vue` — verify in-app if a shortcut doesn't fire.)

---

## Checklist before declaring a scenario "done"

- [ ] Two sides, correctly flagged Friend vs. Hostile.
- [ ] Each side has at least an HQ + 2–3 maneuver units on the map at T0.
- [ ] Timeline scrub from T0 → T+end shows units moving (not all snapping at the same time).
- [ ] Events cover the major beats; each has a `where` target.
- [ ] Clicking any event in the panel flies the map to the right place and resets the time.
- [ ] (Once shipped) Play story walks all events in order without a broken image or blank description.
