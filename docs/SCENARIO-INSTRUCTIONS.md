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

1. Right-click a unit (or click its three-dots menu) → **Create subordinate** (keyboard: `c` on the active unit).
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

The bottom-center map toolbar (`MapEditorMainToolbar.vue`) has an icon picker popover (`SymbolPickerPopover.vue`):

1. Click the **chevron-up (▲)** "Select icons" button on the toolbar.
2. The popover opens with **three** tabs: **Land**, **Sea**, **Air**. Each tab shows a small grid of common icons for that domain plus a custom slot. The "⋮" (DotsMenu) lets you "Add symbol to panel" — i.e. pin an arbitrary symbol into the grid via the full SIDC modal.
3. Click an icon → it's added under the currently selected side/group at the active position. There is no keyboard shortcut bound for opening this popover.

> The full **My Library / custom DB symbols** browser lives in the standalone Symbol Browser route, not in this popover.

### Option C — drag from ORBAT tree

Drag a unit from the ORBAT panel directly onto the map.

### Moving an existing unit

- **Select** the unit on the map → switch to the **Move tool** → drag it. This records a **state change** at the current scenario time **only when location recording is on** (see Phase 4 — the toggle lives in the ORBAT panel footer; the Move tool is disabled otherwise).
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

### Enable recording first

Recording is gated by **two independent toggles** at the bottom of the ORBAT panel (`OrbatPanelFooterToolbar.vue`), each shown as a labeled switch that turns red when active:

- **Unit position** (`isRecordingLocation`) — required to drag units around on the map. The Move tool in the main toolbar is **disabled** until this is on.
- **Hierarchy** (`isRecordingHierarchy`) — required to commit re-parenting / structural changes from drag operations in the ORBAT tree.

Neither toggle lives in the top toolbar.

### Record a movement

With **Unit position** recording on:

1. **Set `currentTime`** to the moment the action happens (drag the playhead, or click a time in the header).
2. Switch to the **Move tool** in the bottom-center toolbar.
3. **Drag the unit** on the map to its new location.
4. The move is recorded as a **unit state change** at that timestamp — visible as a pin on the timeline when the unit is selected.

If recording is **off** the unit drag is rejected (Move tool is grayed out with a tooltip explaining the gate).

### Set a unit's initial position

The very first time you place a unit, its state is written **at the scenario start time**. To change its origin, scrub to start time, then drag it.

### Playback

The **PlaybackMenu** (toolbar) offers:

- **Play / Pause** — keyboard `k` or `Alt+P`. Default speed advances scenario time by 30 minutes per real second.
- **Speed up** (`>`) / **Slow down** (`<`) — there are no fixed multiplier presets; each press **doubles or halves** the current rate.
- **Loop playback** — checkbox; replays from start when the end is reached.
- **Markers** — `Add marker` stores the current scenario time; up to two markers (start + end) bound a sub-range; `Clear markers` resets them.

---

## Phase 5 — Author events (narration)

**Goal:** attach human-readable beats to specific moments — "Red crosses LD", "Blue artillery fires", "H+4 objective secured". These are first-class `ScenarioEvent` objects persisted with the scenario.

### Where events live in the UI

- **Left sidebar → Events tab** (`ScenarioEventsPanel.vue`). A vertical list of all events, oldest → newest.
- **Timeline**: each event renders as a small triangle marker at its timestamp.
- **Right details panel** (`ScenarioEventDetails.vue`): opens when you click an event.

### Add an event

1. Scrub the playhead to the moment (or skip this — the dialog lets you set time manually).
2. In the Events panel, click **"Add scenario event"** (button at the bottom of the panel). The editor drops in a placeholder titled `Event <day>` at the current time.
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

Bindings live in `KeyboardScenarioActions.vue` (global) plus a few timeline-local handlers. Verified against the source — if a shortcut here doesn't fire, check that no input/popover is focused.

| Action | Shortcut |
| --- | --- |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` |
| Create subordinate of active unit | `c` |
| Duplicate active unit | `d` |
| Toggle Move tool (requires location recording on) | `m` |
| Zoom map to selection | `z` |
| Pan map to selection | `p` |
| Locate active unit (select without zoom) | `l` |
| Play / pause playback | `k` or `Alt+P` |
| Speed up / slow down playback | `>` / `<` |
| Delete selected unit state / feature / waypoint | `Delete` |
| Clear selection / dismiss | `Esc` |

> Note: `V` (select tool), `A` (open symbol picker), `R` (measurement), `Space` (play/pause), and `[` / `]` (event next/prev) are **not** bound. Use the on-screen toolbar buttons.

---

## Checklist before declaring a scenario "done"

- [ ] Two sides, correctly flagged Friend vs. Hostile.
- [ ] Each side has at least an HQ + 2–3 maneuver units on the map at T0.
- [ ] Timeline scrub from T0 → T+end shows units moving (not all snapping at the same time).
- [ ] Events cover the major beats; each has a `where` target.
- [ ] Clicking any event in the panel flies the map to the right place and resets the time.
- [ ] (Once shipped) Play story walks all events in order without a broken image or blank description.

---

## Appendix — Worked example: «Оборона на подступах к Астане»

End-to-end walkthrough mirroring **Phases 1–6** of the main guide, but with every value to enter into the editor given **in Russian** (Soviet/Kazakh military convention). The example builds a one-company defense blocking an M-class highway leading to Astana, with a battalion-sized Blue (синие — противник) attack rolling in from the north.

> **Side colors recap.** This document follows Soviet convention in the *narrative* (красные = мы, синие = противник). The editor's APP-6 renderer paints Friend = blue and Hostile = red, so the visual colors on the map will be **inverted** relative to the prose — that's expected. If you need the rendered map to actually look red-for-us / blue-for-them, swap each side's Standard Identity and accept that the editor will then label "us" as Hostile internally.

> **All form values below are what you literally type into the editor.** The field labels themselves are still English (the UI is not localized).

---

### Phase 1 — Создание сценария (Create the scenario)

Open the landing page → **New scenario**, then fill the form:

| Field (English UI) | Value to enter (Russian) |
| --- | --- |
| Name | `Оборона на подступах к Астане` |
| Description | `Блокирование шоссе М-36 силами 7-й мотострелковой роты. Противник — мотострелковый батальон с танковой ротой, наступает с севера.` |
| Start time | `00:00` (use exact zero so T+ values map 1:1 to scenario time) |
| Time zone | `Asia/Almaty` (UTC+5) |
| Symbology standard | `APP-6` |

Two sides — **rename the defaults**:

| Default | Standard Identity | Rename to | Root unit name | Root echelon | Icon |
| --- | --- | --- | --- | --- | --- |
| Side 1 | **Friend** | `Красные (мы)` | `7 мср` | `Company` (echelon code 16) | `Mechanized Infantry` |
| Side 2 | **Hostile** | `Синие (противник)` | `ТГр "Север"` | `Battalion` (echelon code 17) | `Mechanized Infantry` |

Click **Create**. The editor opens at scenario time `00:00`.

---

### Phase 2 — Построение боевого порядка (Build the ORBAT)

Open the ORBAT panel on the left. For each unit below, right-click the parent → **Create subordinate** (keyboard `c` works on the active unit). Use only **basic icons** — Infantry, Mechanized, Armor, ATGM, Artillery, Recon, Engineer.

#### Красная сторона — мы (defender, root: `7 мср`)

| Name (Russian) | Echelon | Icon | Notes |
| --- | --- | --- | --- |
| `1 МСВ` | Platoon | Mechanized Infantry | Forward, left of road |
| `2 МСВ` | Platoon | Mechanized Infantry | Forward, right of road |
| `3 МСВ` | Platoon | Mechanized Infantry | Depth — counter-attack reserve |
| `ТВ` | Platoon | Armor | Танковый взвод, в глубине |
| `ПТУР` | Section | ATGM | Расчёт ПТУР на гребне |
| `АРТ (придана)` | Battery | Artillery | Артиллерийская батарея на вызов (off-map) |
| `Инж. отд.` | Section | Engineer | Сапёры — установка заграждений |

#### Синяя сторона — противник (attacker, root: `ТГр "Север"`)

| Name (Russian) | Echelon | Icon | Notes |
| --- | --- | --- | --- |
| `Развед. дозор` | Section | Recon | БРМ-3К ×2, ведёт впереди |
| `1 МСР` | Company | Mechanized Infantry | Главные силы, левее шоссе |
| `2 МСР` | Company | Mechanized Infantry | Главные силы, правее шоссе |
| `ТР` | Company | Armor | Танковая рота, по шоссе |
| `Инж. взвод` | Platoon | Engineer | Группа разграждения |
| `Артдн` | Battalion | Artillery | Артдивизион (off-map) |

---

### Phase 3 — Расстановка подразделений (Place units on the map)

Pan the map to the M-36 highway approach to Astana. Pick a chokepoint where the road crosses a low ridge or culvert — that's your **Опорный пункт «Астана-1»**.

**Before you drag anything, turn on `Unit position` recording** (ORBAT panel footer toggle — turns red). The Move tool stays disabled until this is on.

Then with the **Draw tool**, lay down these named geometries first — you'll snap waypoints to them in Phase 4:

| Geometry name (Russian) | Type | Where |
| --- | --- | --- |
| `Ор.1 — мост (550 м)` | Point | At the bridge / culvert on the highway, in front of the strongpoint |
| `Ор.2 — овраг (450 м)` | Point | Ravine to the side of the road |
| `Ор.3 — памятник (850 м)` | Point | Roadside monument / km-marker |
| `Ор.4 — камни (800 м)` | Point | Boulder field flanking the road |
| `Ор.5 — выс. "Лысая" (1500 м)` | Point | Bald hilltop |
| `Ор.6 — угол леса (2500 м)` | Point | Edge of forest, far approach |
| `Минное поле + ров` | Polygon | Obstacle belt across the highway at Ор.1 |
| `Рубеж "Тюльпан" (развёртывания)` | Line | Across the highway, ~4 km from Ор.1 |
| `Рубеж огня — ПТУР (2500 м)` | Arc | Outer engagement arc, centered on strongpoint |
| `Рубеж огня — танки (1200 м)` | Arc | Middle engagement arc |
| `Рубеж огня — БМП (500 м)` | Arc | Inner engagement arc |
| `СО 1 МСВ` | Polygon (wedge) | From 1 МСВ position to Ор.5 |
| `СО 2 МСВ` | Polygon (wedge) | From 2 МСВ position to Ор.4 |
| `СО 3 МСВ` | Polygon (wedge) | From 3 МСВ position to Ор.1 |
| `СО ТВ` | Polygon (wedge) | From ТВ position to Ор.3 |
| `Стрелка наступления противника` | Arrow | Wide blue arrow down the highway from north |

Now place each Red unit at scenario time `00:00` (drag from ORBAT tree onto the map):

| Unit | Position |
| --- | --- |
| `7 мср` (HQ) | Centered on the strongpoint |
| `1 МСВ` | ~300 m left of road, just behind crest |
| `2 МСВ` | ~300 m right of road, just behind crest |
| `3 МСВ` | ~600 m behind 1 МСВ/2 МСВ, astride road |
| `ТВ` | In defilade, 500 m behind 3 МСВ |
| `ПТУР` | On the ridge crest, ~500 m left of road, with line-of-sight to Ор.5/Ор.6 |
| `Инж. отд.` | At the obstacle belt (Ор.1) |

Place each Blue unit at scenario time `00:00` at the **исходный район (assembly area)** ~25 km north of Ор.1 along the highway:

| Unit | Position |
| --- | --- |
| `ТГр "Север"` (HQ) | AA «Север», 25 км по шоссе |
| `Развед. дозор` | 3 km south of HQ (already screening forward) |
| `1 МСР` | Lead in column, on road |
| `2 МСР` | Behind 1 МСР, on road |
| `ТР` | Center of column |
| `Инж. взвод` | With 1 МСР |
| `Артдн` | 8 km behind HQ (off-map fires only) |

---

### Phase 4 — Запись движения по времени (Record movement on the timeline)

This is the heart of the example. Confirm `Unit position` recording is **on**, switch to the **Move tool**, then for each Blue unit scrub the playhead to each T+ time below and drag the unit to the listed waypoint. Each drag commits one **unit state change**.

> **Tip — manual time entry.** Dragging the playhead won't hit minute precision; click the time field above the timeline and type the time directly (`00:01:30`).

#### Movement phases at a glance

```
                   25 км               4 км   2.5 км   1.2 км   500 м   0
   КОЛОННА ─────────────────► РАЗВЁРТЫВАНИЕ ─► ПТУР ──► ТАНКИ ──► БМП ──► ЗАГРАЖДЕНИЕ
   (T+0:00)                    (T+1:30)     (T+2:00) (T+2:30) (T+3:00)  (T+3:15)
                                            рубеж    рубеж    рубеж     зона
                                            ПТУР     танков   БМП       поражения
```

#### Detailed schedule — главные силы синих

| T+ | Дальность до Ор.1 | Метка позиции | Подразделение | Действие |
| --- | --- | --- | --- | --- |
| **0:00** | 25 км | **Исх. район «Север»** | ТГр "Север" (Б-) | Переход в наступление, построение в колонну |
| 0:15 | 22 км | **КПП «Альфа»** | Развед. дозор | Разведка ведёт в 3 км впереди главных сил |
| 0:35 | 18 км | **КПП «Браво»** (мост) | 1 МСР | Колонна по шоссе |
| 1:00 | 12 км | **КПП «Чарли»** (перекрёсток) | ТР (центр колонны) | Подтягивание, разведка докладывает «чисто» |
| 1:15 | 8 км | **Рубеж «Жёлтый»** | Развед. дозор | Контакт с НП красных, отход на доклад |
| **1:30** | 4 км | **Рубеж «Тюльпан» (развёртывания)** | Весь батальон | **Развёртывание начинается** — колонна → линия, две роты в первом эшелоне |
| 1:45 | 3.2 км | Рубеж «Зелёный» — слева | 1 МСР | Развёртывание левее шоссе, фронт ~1 км |
| 1:45 | 3.2 км | Рубеж «Зелёный» — справа | 2 МСР | Развёртывание правее шоссе, фронт ~1 км |
| 1:45 | 3.5 км | Рубеж «Зелёный» — центр | ТР | По шоссе как ударный элемент прямой наводки |
| **2:00** | 2.5 км | **Рубеж «Красный» — рубеж ПТУР (Ор.6 / Ор.5)** | Передовые элементы | Пересечение внешнего рубежа — ПТУР красных открывают огонь с гребня |
| 2:10 | 2.2 км | Рубеж «Красный» — слева | 1 МСР | Подавление гребня бортовыми пушками + дымы |
| 2:15 | 2.0 км | Рубеж «Красный» — центр | Артдн (off-map) | Огневой налёт по позициям ПТУР |
| **2:30** | 1.2 км | **Рубеж «Оранжевый» — рубеж танков (Ор.3 / Ор.4)** | ТР | Пересечение среднего рубежа — ТВ красных открывает огонь из глубины |
| 2:40 | 1.0 км | Рубеж «Оранжевый» — слева | 1 МСР | Перекаты повзводно, подготовка спешивания |
| 2:45 | 800 м | Рубеж «Оранжевый» — справа | 2 МСР | Перекаты повзводно |
| **3:00** | 500 м | **Рубеж «Чёрный» — рубеж БМП (Ор.1 / Ор.2)** | Головные взводы | Пересечение внутреннего рубежа — 1/2 МСВ красных ведут заградительный огонь |
| 3:05 | 400 м | **Объект «Ворота»** (заграждение) | Инж. взвод + головной взвод 1 МСР | Попытка проделывания прохода в минном поле / противотанковом рву |
| 3:15 | 200 м | Объект «Ворота» | Головной взвод | В зоне поражения — большие потери |
| **3:30** | 300–500 м | **Рубеж «Чёрный» (предельная линия)** | Батальон | **Атака захлебнулась** — подразделения подавлены |
| 3:45 | ≥ 800 м | Рубеж «Оранжевый» (отход) | Б- (без головного взвода) | Отход за рубеж досягаемости БМП-огня, перегруппировка для второго эшелона |

#### Why the spread happens at T+1:30 / 4 km

Колонна на шоссе — одна большая цель. Доктринальный момент **развёртывания** — *вне* дальности самого дальнобойного оружия обороны прямой наводкой, т.е. на один рубеж раньше дальности ПТУР (~2.5 км). Поэтому батальон расходится из колонны шириной 2 машины во фронт ~2 км в интервале **T+1:30 → T+2:00**. Это самый зрелищный момент воспроизведения — обязательно отдельное событие («**Развёртывание из колонны во фронт**», `where` = рубеж «Тюльпан»).

#### Per-unit waypoint sets (drag list)

Every line below is one state change. Time = scenario time. Place a state at **both endpoints** of each leg — the editor interpolates linearly, so a missing intermediate state will look like a teleport.

**`1 МСР` (головная, левее шоссе)**
- T+0:00 → Исх. район «Север» (25 км, на шоссе)
- T+1:00 → КПП «Чарли» (12 км, на шоссе)
- T+1:30 → Рубеж «Тюльпан» (4 км, на шоссе)
- T+1:45 → Рубеж «Зелёный» — слева (3.2 км, ~800 м левее шоссе)
- T+2:30 → Рубеж «Оранжевый» — слева (1.0 км, 1 км левее шоссе)
- T+3:00 → Подход к объекту «Ворота» (400 м, на шоссе)
- T+3:30 → Рубеж культминации (500 м, чуть назад)

**`2 МСР` (правее шоссе)**
- T+0:00 → Исх. район «Север»
- T+1:30 → Рубеж «Тюльпан»
- T+1:45 → Рубеж «Зелёный» — справа (3.2 км, ~800 м правее шоссе)
- T+2:45 → Рубеж «Оранжевый» — справа (800 м, 1 км правее шоссе)
- T+3:30 → Рубеж культминации (правее шоссе)

**`ТР` (центр, ударный элемент)**
- T+0:00 → Исх. район «Север»
- T+1:00 → КПП «Чарли»
- T+1:30 → Рубеж «Тюльпан»
- T+2:30 → Рубеж «Оранжевый» — центр (1.2 км, по шоссе)
- T+3:30 → Откат к рубежу «Оранжевый»

**`Развед. дозор` (передовое охранение)**
- T+0:00 → Исх. район «Север»
- T+0:15 → КПП «Альфа»
- T+1:15 → Рубеж «Жёлтый» (8 км, контакт)
- T+1:30 → За боевыми порядками 1 МСР

**`Инж. взвод` (разграждение)**
- T+0:00 → Исх. район «Север»
- T+1:30 → Рубеж «Тюльпан»
- T+3:00 → Объект «Ворота» (группа разграждения)

---

### Phase 5 — Боевые события (Author the events)

Open the Events panel → click **Add scenario event** for each beat below. The placeholder appears as `Event 1`; rename via the right-side details panel. Field-by-field values:

#### Event 1 — переход синих в наступление

| Field (English UI) | Russian value |
| --- | --- |
| Title | `Переход синих в наступление` |
| Sub-title | `T+0:00` |
| Description | `Тактическая группа «Север» (мсб без одной мср, с танковой ротой) переходит в наступление по шоссе М-36, в 25 км севернее опорного пункта 7 мср. Колонна сформирована, разведка ведёт в 3 км впереди главных сил.` |
| Where | `Развед. дозор` (units) |
| External URL | *(оставить пустым)* |

#### Event 2 — развёртывание из колонны во фронт

| Field | Value |
| --- | --- |
| Title | `Развёртывание из колонны во фронт` |
| Sub-title | `T+1:30 — рубеж «Тюльпан», 4 км` |
| Description | `На рубеже «Тюльпан» (4 км до заграждения) батальон разворачивается из походной колонны в боевой порядок: 1 МСР — слева от шоссе, 2 МСР — справа, танковая рота сохраняет положение по шоссе как ударный элемент. Фронт развёртывания ~2 км.` |
| Where | `Рубеж «Тюльпан»` (geometry) |

#### Event 3 — рубеж огня ПТУР открыт

| Field | Value |
| --- | --- |
| Title | `Рубеж огня ПТУР открыт` |
| Sub-title | `T+2:00 — 2.5 км` |
| Description | `Передовые элементы синих пересекают внешний рубеж открытия огня (~2.5 км). Расчёт ПТУР красных открывает огонь с гребня по ориентирам 5 и 6. Это — внешний из трёх советских рубежей открытия огня.` |
| Where | `ПТУР` (units) |

#### Event 4 — танки красных вступают в бой

| Field | Value |
| --- | --- |
| Title | `Танки красных вступают в бой` |
| Sub-title | `T+2:30 — 1.2 км` |
| Description | `Танковая рота противника пересекает средний рубеж огня (~1.2 км). Танковый взвод красных открывает огонь из укрытия с фланговых позиций по ориентирам 3 и 4.` |
| Where | `ТВ` (units) |

#### Event 5 — заградительный огонь

| Field | Value |
| --- | --- |
| Title | `Заградительный огонь` |
| Sub-title | `T+3:00 — 500 м, зона поражения` |
| Description | `Головные взводы синих пересекают внутренний рубеж (~500 м). 1 МСВ и 2 МСВ красных открывают заградительный огонь из 30-мм пушек БМП и стрелкового оружия. Это — основная зона поражения.` |
| Where | `1 МСВ`, `2 МСВ` (units, multi-select) |

#### Event 6 — попытка проделывания прохода

| Field | Value |
| --- | --- |
| Title | `Попытка проделывания прохода в заграждении` |
| Sub-title | `T+3:15 — объект «Ворота»` |
| Description | `Инженерный взвод синих с головным взводом 1 МСР пытается проделать проход в минном поле и противотанковом рву на шоссе. Подавлены огнём из глубины и с флангов в зоне поражения.` |
| Where | `Минное поле + ров` (geometry) |

#### Event 7 — атака захлебнулась

| Field | Value |
| --- | --- |
| Title | `Атака захлебнулась` |
| Sub-title | `T+3:30 — рубеж «Чёрный»` |
| Description | `Наступление синих останавливается перед заграждением. Головные взводы потеряли боеспособность; уцелевшие подразделения отходят за рубеж «Оранжевый» для перегруппировки. Шоссе на Астану заблокировано.` |
| Where | `Рубеж «Чёрный»` (geometry) |
| `maxZoom` | `13` (чтобы карта не зумилась слишком близко) |

After all seven events are saved, click each event in the panel — the map should fly to its `where` and the playhead snap to its time.

---

### Phase 6 — Воспроизведение (Playback / once Story Mode lands)

1. Scroll the playhead to `00:00` and press **Play** (`k` or `Alt+P`).
2. Speed up two clicks (`>` `>`) — one real second now equals 2 minutes of scenario time, so the full 4-hour engagement plays in ~2 minutes.
3. Watch for these visual checkpoints in order — if any are missing, you skipped a state change:
   - `00:00` — все силы синих в исходном районе северного края карты.
   - `00:30` — головная рота на шоссе, разведка впереди.
   - `01:30` — **развёртывание видно явно**: батальон расширяется с двух машин до фронта ~2 км между рубежами «Тюльпан» и «Зелёный».
   - `02:00` — головные элементы пересекают внешнюю дугу.
   - `02:30` — танковая рота на средней дуге.
   - `03:00` — головные взводы упираются в заграждение.
   - `03:30` — синие останавливаются и откатываются.

4. Once Story Mode is wired (see [TODO.md](TODO.md)), the same seven events play as narrated steps — no extra authoring needed.

---

### Operating tips

- **Scenario start time `00:00:00`** — каждое значение `T+` из таблицы соответствует календарному времени сценария 1:1, без смещений.
- **Минутная точность** — drag не даст 1-минутной точности; для каждой ключевой остановки кликните по полю времени над таймлайном и введите `HH:MM:SS` вручную.
- **Recording must stay on** — если включён только `Hierarchy`, перетаскивание юнитов на карте будет проигнорировано. Активируйте именно `Unit position`.
- **Развёртывание** между T+1:30 и T+2:00 — поставьте состояние **на оба конца** для каждого манёвренного подразделения. Иначе при воспроизведении подразделение телепортируется, а не «расходится».
- **Геометрию рисуйте сначала** — рубежи «Жёлтый/Тюльпан/Зелёный/Красный/Оранжевый/Чёрный» как именованные линии. Тогда при перетаскивании юнитов будет видно, к какому рубежу вы их привязываете.
- **Многоюнитовое `where`** — для Event 5 (заградительный огонь) выберите `1 МСВ` и `2 МСВ` оба; карта зум-фитом охватит обе позиции.
- **Артдн / `АРТ (придана)`** — вне карты, движение не записывается; используются только в описаниях событий.
