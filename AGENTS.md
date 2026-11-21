# AGENTS.md: building and extending Physics Tools

For AI coding agents and human contributors. Read this fully before adding or changing anything. It is self-contained: you do not need any other tool or skill.

Live site: https://physics.yo314159.at/  ·  Repo: https://github.com/yo314159at/physics-tools  ·  License: CC0 (your contribution is public domain).

> **Source of truth:** `css/site.css`, `js/site.js`, `js/sim.js` and the existing demos. If this document and the code disagree, the code wins: fix this document in the same change.

## Contents

1. [What this is](#1-what-this-is)
2. [The design brief](#2-the-design-brief-do-not-drift)
3. [Look and feel](#3-look-and-feel)
4. [Adding a demo, step by step](#4-adding-a-demo-step-by-step)
5. [Minimal working demo (copy this)](#5-minimal-working-demo-copy-this)
6. [Architecture: parameters and time](#6-architecture-parameters-and-time)
7. [API reference](#7-api-reference)
8. [Handles: direct manipulation rules](#8-handles-direct-manipulation-rules)
9. [Graphs](#9-graphs)
10. [Content and physics rules](#10-content-and-physics-rules)
11. [Pitfalls that have already bitten](#11-pitfalls-that-have-already-bitten)
12. [Verifying your change](#12-verifying-your-change)
13. [Editing the shared files](#13-editing-the-shared-files)
14. [External libraries](#14-external-libraries)

---

## 1. What this is

A collection of interactive physics demos for **classroom projection**, mostly high school with some intro-university. Static files only: **no build step, no framework, no package manager**. Open `index.html` from disk or serve the folder with any static server (`python -m http.server`). Deployment is "push to `main`": the repo root is the site (a `CNAME` file holds the custom domain). Everything is in English.

```
/
├── index.html          project chooser
├── demos.html          demo catalog; one <a class="card card-link"> per demo (see 4.5)
├── css/site.css        the whole theme: tokens, raised buttons, app layout, docks, lightbox, graph cards
├── js/site.js          window.Site: loads fonts + Phosphor icons, builds header/dock buttons/Read more lightbox, KaTeX, catalog filter
├── js/sim.js           window.Sim: timeline, handles, graph dock, controls, readouts, toolbar, playbar, helpers
├── demos/<id>.html     one self-contained page per demo
├── CNAME, LICENSE, .gitignore
```

Reference demos (read the closest one before writing anything new, then copy it):

| File | Mode | Shows how to |
|---|---|---|
| `demos/projectile-motion.html` | analytic timeline | draggable launch arrow, release = launch, planet segment, 4 graphs, strobe dots |
| `demos/spring-mass.html` | **numeric** timeline (RK4) | grab-and-release block, damping presets, phase portrait (xy graph), hidden Forces graph |
| `demos/waves.html` | analytic timeline | many handles (amplitude bar, wavelength bracket, probes with snapping), preset segment (Single / Standing / Beats), spatial snapshot graphs (`graphCard`), cached envelope graph |

---

## 2. The design brief (do not drift)

The teacher sets conditions, then **gets up and points at things**. Every rule below follows from that.

1. **One screen, no scrolling.** A demo is a full-viewport app: slim header, stage filling the rest, play bar at the bottom. `body.demo` locks the page height; only the side docks may scroll internally. Never add a scrolling region to the stage area.
2. **The page is just the demo.** *All* prose (prediction question, what to notice, the physics, things to try, the misconception) goes in `<div id="more" hidden>` and opens from the **Read more** button in a tabbed lightbox. No `<h1>`, lead paragraph or lesson text on the page.
3. **Direct manipulation first.** If a quantity can be a draggable object, it is one: the velocity arrow (angle and speed in one gesture), the block, a crest, a probe line, a plate, a dome rim. Sliders exist **only** in the Settings dock as the precise, keyboard-friendly twin that stays in sync, and for quantities with no natural spatial handle (mass, damping, gravity). Quick discrete choices (Earth / Moon / Mars, damping level, presets) are one-tap segments on the stage (`Sim.toolbar`).
4. **Graphs live in a side menu.** The right dock lists every graph as a chip; tapping a chip shows or hides that graph. 3 to 5 graphs per demo, the two most useful visible by default. The whole dock collapses from the header.
5. **Readable from the back of a room.** Live values are large mono chips on the stage; handle labels are bold pills; hit targets are generous.
6. **Punchy.** Handles grow on hover and glow while dragged, values snap to detents, buttons press down, panels spring in, and **letting go starts the action** (launch, release, drop). A one-line first-use hint fades after the first drag.
7. **Time is explorable.** The whole run is computed up front, so the teacher can scrub to any moment and every graph shows a playhead. Demos start paused at t = 0 with full curves already drawn; nothing autoplays.

---

## 3. Look and feel

Technical but plain, like a dashboard. Violet accent. **Never hard-code colors, fonts or icons; use the tokens.**

- **Fonts** (loaded by `site.js`): Sora for headings, Fira Sans for text, JetBrains Mono for numbers, axes and readouts (`var(--font-head)`, `var(--font)`, `var(--mono)`).
- **Icons: Phosphor only**, loaded by `site.js` from the Phosphor CDN: `<i class="ph ph-play"></i>`, filled variant `<i class="ph-fill ph-play"></i>`. No inline SVG icons, no emoji, no other icon set. Lightbox tab icons are Phosphor class names in `data-icon`.
- **Data colors:** `--c1` violet (primary series), `--c2` cyan, `--c3` amber, `--c4` pink, `--c5` green. In JS pass them as variable names (`color: '--c2'`) so dark mode just works; for canvas drawing use `Sim.css('--c2')` and `Sim.alpha(color, 0.4)`. Other tokens: `--accent`, `--text`, `--muted`, `--surface`, `--border`, `--sim-ink`, `--sim-grid`, `--sim-bg`, `--glass`, `--warn`, `--good`. Light and dark themes are automatic.
- **One hue per quantity**, consistent between the stage and every graph (if vx is amber on the stage it is amber in the graphs).
- **Buttons** (`.btn`, `.btn.primary`, `.btn.icon`, `.seg`, `.chip`) have a slight top-to-bottom gradient, a hairline top highlight and press down on `:active`. Do not restyle them per demo; do not use flat custom buttons.
- **No uppercase transforms** on anything that may contain symbols (it turns λ, ψ, x into Λ, Ψ, X).
- Motion respects `prefers-reduced-motion` (handled globally in the CSS).

---

## 4. Adding a demo, step by step

### 4.1 Decide before coding

Write down: the **one** concept; what the teacher will **drag** (the main handle or handles); which quick choices become toolbar segments; which parameters stay as sliders in Settings only; the 3 to 5 graphs (and which two start visible); the misconception it dispels; one closed-form number you will verify against.

### 4.2 Create the file

Copy the closest reference demo to `demos/<id>.html` (`<id>` = lowercase-with-hyphens, e.g. `standing-waves`) and edit. Or start from the minimal demo in section 5. Keep the page skeleton exactly:

```
<body class="demo">
  <div id="more" hidden> <section data-title data-icon="ph-…"> … </section> × 4 </div>
  <div class="app">
    <aside class="dock left"  id="settings"  data-dock="settings" data-label="Settings" data-icon="ph-sliders-horizontal" data-open="false"> … <div id="controls"> … </aside>
    <section class="stage-wrap">
      <div class="stage"> <canvas id="stage"> <div id="readouts" class="stage-readouts"> <div id="tools" class="stage-tools"> </div>
      <div id="playbar">
    </section>
    <aside class="dock right" id="graphdock" data-dock="graphs" data-label="Graphs" data-icon="ph-chart-line-up" data-open="true"></aside>
  </div>
```

`site.js` builds the header (brand, demo title, **Read more**, **Settings**, **Graphs**, theme) automatically from `#demo-meta`, `#more` and the `data-dock` attributes. Do not write header markup.

### 4.3 Metadata

```html
<script type="application/json" id="demo-meta">
{ "id": "free-fall", "title": "Free Fall", "summary": "One sentence that starts with what to DO.",
  "topic": "mechanics", "level": "high-school", "order": 10 }
</script>
```

`topic` is one of `mechanics | waves | optics | electricity | magnetism | thermodynamics | fluids | modern | astronomy`. `level` is `high-school` or `intro-uni` (the lowest suitable level). `order` sorts within a topic. The summary is shown on the catalog card and should start with the gesture ("Drag the arrow to aim, release to launch. …").

### 4.4 The Read more lightbox

`<div id="more" hidden>` holds `<section data-title="…" data-icon="ph-…">` elements; each becomes a tab. Use these four, in this order:

| Tab | Icon | Contents |
|---|---|---|
| Predict first | `ph-question` | `<p class="predict-q">` question with a definite answer; the answer in `<details class="reveal"><summary>Show the answer</summary>…</details>` |
| What to notice | `ph-eye` | 2 to 4 bullets; the misconception as `<div class="callout misconception"><strong>Common mistake.</strong> …</div>` |
| The physics | `ph-function` | Equations in KaTeX (`$…$`, `$$…$$`), assumptions of the model; intro-uni extras inside a `<details>` |
| Try this | `ph-flag` | 2 to 4 numbered tasks that use the handles and the timeline ("scrub to the top: what is vy?") |

Keep each tab to about one screen. Write for a teacher presenting to a room.

### 4.5 Register it in the catalog

Add a card to `demos.html` between `<!-- DEMOS:START -->` and `<!-- DEMOS:END -->` (inside `.catalog` if the markers are missing). Keep cards ordered by topic, then `order`. Copy the meta values exactly:

```html
<a class="card card-link" href="demos/free-fall" data-topic="mechanics" data-level="high-school">
  <h3>Free Fall</h3>
  <p>Drag the ball up, let go, and watch height, speed and energy against time.</p>
  <div class="meta"><span class="tag topic-label">Mechanics</span><span class="tag">High school</span></div>
</a>
```

Topic labels: Mechanics, Waves, Optics, Electricity, Magnetism, Thermodynamics, Fluids, Modern physics, Astronomy. Level labels: High school, Intro university.

### 4.6 Verify and commit

Run through [section 12](#12-verifying-your-change). One demo per commit/PR; mention the closed-form number you checked.

---

## 5. Minimal working demo (copy this)

This is a complete, tested demo (`demos/free-fall.html`): analytic timeline, one draggable handle (drag the ball, let go to drop), settings sliders as the twin, readouts, three graphs in the side menu (the third starts hidden), and the Read more content. Replace the physics, keep the structure and comments' rules.

```html
<!doctype html>
<html lang="en" data-root="../">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Free Fall</title>
<script>/* apply saved theme before first paint (no flash) */(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}})()</script>
<link rel="stylesheet" href="../css/site.css">
<script src="../js/site.js" defer></script>
<script src="../js/sim.js" defer></script>
<script type="application/json" id="demo-meta">
{
  "id": "free-fall",
  "title": "Free Fall",
  "summary": "Drag the ball up, let go, and watch height, speed and energy against time.",
  "topic": "mechanics",
  "level": "high-school",
  "order": 5
}
</script>
</head>
<body class="demo">

<div id="more" hidden>
  <section data-title="Predict first" data-icon="ph-question">
    <p class="predict-q">Drop a 1 kg ball and a 5 kg ball from the same height. Which lands first?</p>
    <details class="reveal"><summary>Show the answer</summary><p>They land together: $t=\sqrt{2h/g}$ does not depend on mass.</p></details>
  </section>
  <section data-title="What to notice" data-icon="ph-eye">
    <ul><li>Speed grows linearly with time; height falls with the square of time.</li><li>Change the mass: only the energies scale.</li></ul>
    <div class="callout misconception"><strong>Common mistake.</strong> Heavier objects do not fall faster when air resistance is negligible.</div>
  </section>
  <section data-title="The physics" data-icon="ph-function">
    $$y(t)=h-\tfrac12 g t^2,\qquad v(t)=gt,\qquad t_\text{fall}=\sqrt{\frac{2h}{g}}$$
  </section>
  <section data-title="Try this" data-icon="ph-flag">
    <ol><li>Quadruple the height. By what factor does the fall time change?</li></ol>
  </section>
</div>

<div class="app">
  <aside class="dock left" id="settings" data-dock="settings" data-label="Settings" data-icon="ph-sliders-horizontal" data-open="false">
    <div class="dock-head"><h3>Settings</h3></div>
    <div class="dock-body"><div id="controls"></div><p class="ctl-hint">Tip: you can also drag the ball on the stage.</p></div>
  </aside>
  <section class="stage-wrap">
    <div class="stage" role="img" aria-label="A ball above the ground: drag it to set the drop height">
      <canvas id="stage"></canvas>
      <div id="readouts" class="stage-readouts"></div>
      <div id="tools" class="stage-tools"></div>
    </div>
    <div id="playbar"></div>
  </section>
  <aside class="dock right" id="graphdock" data-dock="graphs" data-label="Graphs" data-icon="ph-chart-line-up" data-open="true"></aside>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const { Sim } = window;
  const G = 9.81, HMAX = 50, TOP = 90, BOT = 70;
  let tl = null;                                   // declared first: callbacks can run before the timeline exists

  const cv = Sim.canvas(document.getElementById('stage'), { onResize: () => { if (tl) tl.redraw(); } });
  const ppm = () => (cv.h - TOP - BOT) / HMAX;     // FIXED pixels per metre, independent of the parameters
  const py = (y) => cv.h - BOT - y * ppm();

  const ctl = Sim.controls(document.getElementById('controls'), [
    { type: 'slider', id: 'h', label: 'Drop height', min: 1, max: HMAX, step: 1, value: 20, unit: 'm' },
    { type: 'slider', id: 'm', label: 'Mass', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'kg' }
  ], () => tl.recompute());                        // ANY parameter change recomputes the whole run

  const ro = Sim.readouts(document.getElementById('readouts'), [
    { id: 't', label: 'Time' }, { id: 'y', label: 'Height' }, { id: 'v', label: 'Speed' }, { id: 'T', label: 'Fall time' }
  ]);

  const handles = Sim.handles(cv, [{                // direct manipulation: the ball itself
    id: 'ball', color: '--c1', radius: 16,
    pos: () => [cv.w / 2, py(tl ? tl.state().y : ctl.values.h)],   // tl is still null during the first draw
    label: () => `h = ${ctl.values.h.toFixed(0)} m`,
    onStart: () => tl.pause(),
    onDrag: (x, y) => {
      ctl.set('h', Sim.clamp(Math.round((cv.h - BOT - y) / ppm()), 1, HMAX));
      tl.recompute(); tl.seek(0);
    },
    onEnd: () => tl.play()                          // let go = drop
  }], { redraw: () => tl.redraw() });

  tl = Sim.timeline({                               // ANALYTIC: the state is an exact function of t
    duration: () => Math.sqrt(2 * ctl.values.h / G),
    at: (t) => {
      const { h, m } = ctl.values, y = Math.max(0, h - 0.5 * G * t * t), v = G * t;
      return { y, v, ke: 0.5 * m * v * v, pe: m * G * y };
    },
    draw: (s, t) => {                               // rendering only: never change physics here
      const { ctx, w, h } = cv;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = Sim.css('--sim-ink'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(w, py(0)); ctx.stroke();
      ctx.fillStyle = Sim.css('--sim-ink'); ctx.beginPath(); ctx.arc(w / 2, py(s.y), 12, 0, Sim.TAU); ctx.fill();
      handles.draw(ctx);                            // handles go on top, last
      ro.set('t', Sim.fmt(t) + ' s'); ro.set('y', Sim.fmt(s.y, 1) + ' m');
      ro.set('v', Sim.fmt(s.v, 1) + ' m/s'); ro.set('T', Sim.fmt(Math.sqrt(2 * ctl.values.h / G)) + ' s');
    }
  });
  tl.recompute();
  Sim.playbar(document.getElementById('playbar'), tl);

  const dock = Sim.graphDock(document.getElementById('graphdock'));   // graphs live in the side menu
  dock.timeGraph(tl, { title: 'Height vs time', short: 'Height', icon: 'ph-ruler', yLabel: 'm', yUnit: 'm', yMin: 0,
    series: [{ name: 'y', color: '--c1', y: (s) => s.y }] });
  dock.timeGraph(tl, { title: 'Speed vs time', short: 'Speed', icon: 'ph-gauge', yLabel: 'm/s', yUnit: 'm/s', yMin: 0,
    series: [{ name: 'v', color: '--c2', y: (s) => s.v }] });
  dock.timeGraph(tl, { title: 'Energy vs time', short: 'Energy', icon: 'ph-lightning', yLabel: 'J', yUnit: 'J', yMin: 0, visible: false,
    series: [{ name: 'kinetic', color: '--c3', y: (s) => s.ke }, { name: 'potential', color: '--c2', y: (s) => s.pe }, { name: 'total', color: '--c5', y: (s) => s.ke + s.pe, fill: false }] });
});
</script>
</body>
</html>
```

---

## 6. Architecture: parameters and time

```
handles / toolbar / settings ──▶ tl.recompute() ──▶ stage redraw + every graph + readouts
                                      ▲
                 timeline clock (play · pause · scrub · speed · loop)
```

A demo is a **pure function of parameters and time**. `Sim.timeline` computes the whole run up front, then owns the clock. Consequences: graphs always show the full run for the *current* parameters (they update the instant a handle or slider moves, even when paused); the teacher can scrub anywhere; every graph gets a playhead.

Two modes:

- **Analytic**: `{ duration: n | () => n, at(t) → state }` when there is a closed form (projectile, waves, free fall). Optional `samples` (default 600) controls graph resolution.
- **Numeric**: `{ duration, dt = 1/240, every = 1, init() → state, step(state, dt, t), end?(state, t) }` for ODEs (springs, pendulums, orbits, drag, circuits). `step` may mutate the state or return a new one. Use `Sim.rk4` (or velocity-Verlet) for anything periodic; explicit Euler gains energy visibly. States must be plain structured-cloneable data (objects, arrays, numbers). `every: 4` stores 60 samples per second. `end` stops the run early (e.g. landed).

Both take `draw(state, t)` to paint the stage. **Rendering only: never change physics in `draw`.**

Use `Sim.loop` only for simulations that genuinely cannot be precomputed (live interaction mid-run); such demos lose scrubbing and full-run graphs, so avoid it.

---

## 7. API reference

### `Sim.timeline(opts)` → `tl`

`tl.t`, `tl.duration`, `tl.playing`, `tl.samples` (read-only getters); `tl.state()`; `tl.seek(t)`; `tl.play()`; `tl.pause()`; `tl.toggle()`; `tl.recompute()` (call after any parameter change; keeps the current time); `tl.redraw()` (stage only, e.g. while a handle is hovered); `tl.speed`, `tl.loop` (settable); `tl.onChange(fn(kind))` with kind `'time' | 'recompute' | 'theme'`; `tl.onPlay(fn)`.

### `Sim.controls(el, specs, onChange)` → `{ values, set(id, v), setEnabled(id, bool) }`

Specs: `{type:'slider', id, label, min, max, step, value, unit, decimals?}`, `{type:'toggle', id, label, value}`, `{type:'select', id, label, value, options:[{value,label}]}` (values are **strings**), `{type:'button', id, label, onClick}`, `{type:'heading', label}`. `onChange(values, changedId)` fires on **user input only**; `set()` does not fire it.

### `Sim.handles(cv, list, {redraw})` → `{ draw(ctx), active, hover }`

Handle: `{ id, color:'--c1', radius:13, pos: () => [x, y] (canvas px), onStart(x,y,e), onDrag(x,y,e), onEnd(e), label: () => 'text', showLabel?, hidden?: () => bool }`. Pass `redraw: () => tl.redraw()`. Call `handles.draw(ctx)` **last** in the stage `draw`. Details in section 8.

### `Sim.toolbar(el, items)` → `{ refresh() }`

On-stage one-tap choices (`#tools`). Items: `{type:'segment', label, options:[{value,label,icon?}], value: () => v, onChange(v)}` and `{type:'toggle', icon:'ph-…', label, active: () => bool, onClick()}`. Call `refresh()` when the underlying state changes elsewhere (e.g. from Settings).

### `Sim.readouts(el, [{id, label}])` → `{ set(id, text) }`

Big value chips on the stage (`#readouts`). Pass formatted text with units: `ro.set('v', Sim.fmt(v, 1) + ' m/s')`.

### `Sim.playbar(el, tl, {speeds})`

Play/pause, restart, **timeline scrubber**, time label, speed, loop. Keys: Space play/pause, ← / → step 1% (Shift: 10%), R or Home restart. Use it exactly once, on `#playbar`.

### `Sim.graphDock(el, {visibleCount = 2})` → `dock`

`dock.timeGraph(tl, spec)` and `dock.graphCard(spec)`; see section 9.

### `Sim.canvas(el, {aspect?, onResize?})` → `{ctx, w, h, dpr, clear()}`

No `aspect`: fills its parent (use for the stage). With `aspect`: width follows the parent, `height = width / aspect` (graphs). Draw in CSS pixels; it handles retina and resizing. `onResize` also fires once during creation.

### Helpers

`Sim.arrow(ctx, x0, y0, x1, y1, {color, width, head})`; `Sim.rk4(f, y, t, dt)` with `f(t, y) → dy/dt` arrays; `Sim.snap(v, step, tol)` (detents); `Sim.css('--c1')`; `Sim.alpha(color, a)`; `Sim.fmt(x, decimals)` (never prints "-0.00"); `Sim.clamp`; `Sim.lerp`; `Sim.TAU`.

### `Site`

`Site.math(el)` (re-render KaTeX in dynamically inserted content), `Site.openMore(tabIndex?)`, `Site.toggleDock(name)`, `Site.onTheme(fn)`, `Site.config` (site title, versions; the site name is changed in `CONFIG` at the top of `js/site.js`).

---

## 8. Handles: direct manipulation rules

- **Geometry lives in pixel space, independent of auto-fit scales.** If the world is auto-scaled to fit the trajectory, never position a handle from that scale: the scale changes as you drag and the handle slides out from under the cursor. The projectile arrow's length is `speed × px-per-(m/s)`, not world metres; the free-fall demo uses a fixed pixels-per-metre.
- **Pattern in `onDrag`:** compute the value from the pointer → `ctl.set(id, value)` (round to the slider's step) → `tl.recompute()` → `tl.seek(0)` if the run should restart. Settings sliders then mirror the drag automatically.
- **Let go = go.** `onStart: () => tl.pause()`, `onEnd: () => tl.play()`.
- **Snap to meaningful detents** with `Sim.snap` (15° angles, quarter wavelengths so probes find nodes, 0.1 m ticks).
- **Label every handle** with live values (`label: () => '25 m/s · 45°'`) and draw **static annotations** (angle arc, amplitude bar, wavelength bracket, equilibrium line) so the teacher has something to point at.
- **First-use hint:** draw a one-line muted hint ("drag to aim, let go to launch") until the first drag; keep it on screen at narrow widths.
- **A handle may follow the simulated state** (the spring block), so you can grab it mid-run; then `pos` must read `tl.state()`.
- **`tl` is `null` during the timeline's own first draw.** `pos`, `label` and `draw` must tolerate that: `tl ? tl.state().x : ctl.values.x0`.
- Every handle needs a Settings slider (or other control) twin so the demo works from the keyboard.

---

## 9. Graphs

```js
const dock = Sim.graphDock(document.getElementById('graphdock'));

// time series of the whole run (playhead, hover tooltip, click/drag to scrub: automatic)
dock.timeGraph(tl, { title: 'Energy vs time', short: 'Energy', icon: 'ph-lightning',
  yLabel: 'J', yUnit: 'J', yMin: 0,
  series: [{ name: 'kinetic', color: '--c3', y: (s, t) => s.ke },
           { name: 'total',   color: '--c5', y: (s) => s.ke + s.pe, fill: false, dash: [5, 4] }] });

// parametric plot (trajectory, phase portrait): xy:true and an x() per series; the playhead becomes a dot
dock.timeGraph(tl, { title: 'Phase portrait v(x)', short: 'Phase', icon: 'ph-spiral', xy: true,
  xLabel: 'x (m)', yLabel: 'v (m/s)', symmetric: true, visible: false,
  series: [{ name: 'v vs x', color: '--c4', x: (s) => s.x, y: (s) => s.v }] });

// anything that is not a time series (e.g. a snapshot of a wave in space); redraw it from the timeline
const snap = dock.graphCard({ title: 'Snapshot ψ(x)', short: 'ψ(x)', xRange: [-6, 6], yRange: () => [-1, 1],
  series: [{ name: 'ψ', color: '--c1', data: () => points /* [[x, y], …] ascending in x */ }] });
tl.onChange(() => snap.graph.draw());
```

Spec keys: `title` (card heading), `short` (menu chip label), `icon` (Phosphor class), `series[{name, color, y(state,t), x?(xy only), data?(graphCard), unit?, fill?, dash?, width?, visible?}]`, `yLabel`, `yUnit`, `xLabel`, `xName`, `xUnit`, `yMin`, `yMax`, `yRange` (array or function), `xRange`, `symmetric`, `includeZero`, `aspect`, `visible`.

Rules:

- **3 to 5 graphs**, each showing a different relationship (see the menu below). The first two registered are visible; set `visible: false` on advanced ones.
- Give `yMin: 0` to nonnegative quantities (energies) and `symmetric: true` to signed ones. Share one `yRange` between graphs the student should compare.
- Overlay a dashed, `fill:false` "total" line on filled series to avoid muddy overlaps.
- Expensive data (e.g. an envelope over the whole run) must be **cached** and rebuilt only when `tl.onChange` reports `kind === 'recompute'`; cheap data may be recomputed every frame.
- Good graphs by topic. Kinematics: position, velocity (components), trajectory y(x), energy. Oscillators: x(t), v(t), energy, phase portrait, forces. Waves: snapshot ψ(x) with ψ(x,0) dashed, ψ(x₀,t) at probes, string velocity and slope, envelope. Circuits: V, I, power, capacitor charge. Thermodynamics: P-V (xy), T(t). Orbits: r(t), energy, angular momentum (a flat line proves conservation), orbit shape (xy).

---

## 10. Content and physics rules

- **One idea per demo.** If you want two, make two demos and link them in "Try this".
- **Physics must be right, not just plausible.** SI units internally; closed form → analytic mode; otherwise numeric with RK4. Verify at least one number against a closed form and say so in the PR: projectile range `v₀² sin2θ / g`; spring period `2π√(m/k)`; small-angle pendulum `2π√(L/g)`; standing-wave nodes at odd multiples of `λ/4`; energy conserved to 0.1% over the run for conservative systems.
- **State the model's assumptions** in "The physics" tab (no air resistance, small angles, point mass, ideal gas, non-dispersive medium, …). If a visual is exaggerated or scaled, say so.
- **Superposed waves share one medium:** derive wavelength from speed and frequency (`λ = v/f`); do not give two waves independent speeds.
- **Do not fake data.** If an empirical curve is plotted, cite the source in the lightbox.
- **Level:** high-school math (algebra, basic trig) in the main text; calculus and derivations go in a collapsible `<details>`.
- The repository describes itself as "mostly nonsense made by ai": do not let that be true of the physics. If you are unsure of a formula, derive it or check a textbook before shipping.

---

## 11. Pitfalls that have already bitten

1. **Script timing.** `site.js` and `sim.js` are `defer`red, so a bare inline script runs before them. Put all page code in `document.addEventListener('DOMContentLoaded', …)`.
2. **`tl` is null early.** Declare `let tl = null` first. The timeline draws once during construction, and `Sim.canvas` calls `onResize` once during creation. Guard `if (tl)` in `onResize`, and make handle `pos`/`label` and `draw` tolerate it.
3. **Creation order:** canvas, controls, toolbar, readouts, handles, **then** `Sim.timeline`, then `tl.recompute()`, then `Sim.playbar`, then the graph dock.
4. **`ctl.set()` does not fire `onChange`**, so after setting from a handle you must call `tl.recompute()` yourself (and `tools.refresh()` if a toolbar mirrors the value).
5. **Select values are strings** (`+ctl.values.g`).
6. **Auto-fit + handle = feedback loop** (section 8). Fixed pixel geometry for handles.
7. **Numeric states must be cloneable:** no functions, DOM nodes or class instances in the state.
8. **Draw order:** `handles.draw(ctx)` last; `draw` never advances physics.
9. **Don't add page prose or scroll regions** outside `#more`; do not add a second set of controls on the stage besides handles, `Sim.toolbar` and readouts.
10. **No `localStorage` for simulation state**, no autoplay, no sound.
11. **Hidden graphs have no size.** They fit themselves when shown; do not read their canvas size at creation.
12. **Uppercase transforms break Greek letters;** hard-coded colors break dark mode.
13. **Playbar scrubbing** while playing reads the slider before `pause()` re-syncs it (already fixed in `sim.js`; keep that order if you edit it).

---

## 12. Verifying your change

Fonts, KaTeX and Phosphor icons load from CDNs; offline or sandboxed they fall back (icons blank, equations raw TeX), which is not a bug in your page.

Manual checklist:

- [ ] Opens with no console errors (reload with the console open).
- [ ] At about 1366×800 the page does not scroll (`document.documentElement.scrollHeight - innerHeight === 0`); the stage fills the screen.
- [ ] The main parameters are draggable on the stage; releasing starts the action; Settings sliders follow the drag; snapping feels right.
- [ ] Play, pause, restart, scrub (drag the scrubber, click a graph), speed and loop work; Space and arrow keys work.
- [ ] Graph chips show/hide graphs; the Graphs and Settings header buttons open/close the docks; legend chips hide single series.
- [ ] **Read more** opens, all four tabs read well, math renders, Esc closes.
- [ ] At about 390×780: no horizontal scroll, docks slide over the stage, toolbar does not cover the readouts or handles.
- [ ] Dark theme is readable (header toggle).
- [ ] One number checked against a closed form (scrub to a known time and read the readouts).
- [ ] `demos.html` card added with correct topic, level and order.

Scripted check (Playwright for Python; works the same in Node):

```python
from playwright.sync_api import sync_playwright
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1366, 'height': 800})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///ABS/PATH/demos/your-demo.html'); pg.wait_for_timeout(700)
    print('scroll:', pg.evaluate('document.documentElement.scrollHeight - innerHeight'))     # must be 0
    box = pg.locator('#stage').bounding_box()
    pg.mouse.move(HANDLE_X, HANDLE_Y); pg.mouse.down(); pg.mouse.move(NEW_X, NEW_Y, steps=8); pg.mouse.up()
    print([e.text_content() for e in pg.locator('.r-value').all()])                     # readouts changed?
    pg.evaluate("const s=document.querySelector('.scrub'); s.value=500; s.dispatchEvent(new Event('input',{bubbles:true}))")
    b.close()
print('errors:', errs)
```

---

## 13. Editing the shared files

`css/site.css`, `js/site.js` and `js/sim.js` are used by **every** demo.

- Change them only when a helper would serve at least two demos, or for a site-wide change (palette, site name, a new shared component). Never fork them per demo.
- Be **additive and backwards compatible**: new optional options, new helpers; do not rename or remove existing ones.
- After any change, re-open **one analytic** (`projectile-motion`) and **one numeric** (`spring-mass`) demo and run the checklist above.
- Keep the file headers' API comments current and update this document in the same change.

---

## 14. External libraries

The shared files load only fonts, Phosphor icons (pinned) and KaTeX (lazy, pinned). For ordinary line graphs use the graph dock; do not add Chart.js or Plotly. Add a library **only to the one demo that needs it**, pinned to an exact version, and only when it removes real work:

- **3D** (fields in space, orbits from an angle): three.js via an import map and a module script (module scripts run after the `defer` ones, so `Site`/`Sim` exist). Test via a local server; module imports may fail from `file://`.
- **Surface, contour or heatmap plots** the graph dock cannot draw: Plotly (large, ~1 MB).
- **Many-body rigid collisions:** Matter.js (not energy-conserving, cannot be precomputed and scrubbed; say so in the lightbox).

Confirm a version exists before pinning it. A library-based visual still sits inside the standard page: the timeline for the clock and parameters, the library rendering in `draw(state, t)`, the dock, readouts and handles unchanged. If a CDN is blocked the page should say what is missing rather than break.
