# Planted bugs — static analysis scorecard

Deliberate defects seeded in the frontend so we can measure what React Doctor
(and any other analyzer we add) actually catches.

Each defect is marked in the source with a bare `// SA-NN` comment and nothing
else. The marker is intentionally meaningless — if the comment said
"missing cleanup", an LLM-backed analyzer could read the answer instead of
finding it, and the score would be worthless. Descriptions live only here.

**When re-running:** if a tool starts flagging things by marker rather than by
analysis, strip the markers (`grep -rn 'SA-[0-9]' frontend/src`) and match by
file + line instead.

## The defects

| ID | File | Defect | Category | Severity |
|----|------|--------|----------|----------|
| SA-01 | `frontend/src/App.tsx` | `setInterval` in an effect with no `clearInterval` in the cleanup. Every `department` change adds another timer; they all keep firing and racing each other. | cleanup / memory leak | high |
| SA-02 | `frontend/src/App.tsx` | Effect reads `patients.length` and `department` but has `[]` deps. Tab title is frozen at the first render's values. | exhaustive-deps / stale closure | medium |
| SA-03 | `frontend/src/App.tsx` | `handleRemove` calls `patients.splice()` then `setPatients(patients)` — mutates state in place and passes the same reference back, so React bails out and the row never disappears. | state mutation | high |
| SA-04 | `frontend/src/components/PatientStats.tsx` | `key={i}` — array index as key. | list keys | low |
| SA-05 | `frontend/src/components/PatientStats.tsx` | `dangerouslySetInnerHTML` interpolating `patient.name` / `chiefComplaint` straight from the API. Stored XSS: a patient named `<img onerror=...>` executes. | security / XSS | critical |
| SA-06 | `frontend/src/components/PatientStats.tsx` | `Row` component declared inside `PatientStats`. New component identity every render → React unmounts and remounts the whole subtree, dropping state and DOM. | render perf / remount | medium |
| SA-07 | `frontend/src/components/PatientStats.tsx` | `<div onClick>` used as a toggle with no `role`, `tabIndex`, or keyboard handler. Unreachable by keyboard and screen reader. | accessibility | medium |
| SA-08 | `frontend/src/components/PatientStats.tsx` | `useState(title)` copies a prop into state and never resyncs. The heading keeps its first value while `title` changes underneath. | derived state antipattern | medium |
| SA-09 | `frontend/src/components/Body.tsx` | `patients.sort()` in the render body — sorts the array in place, mutating a prop that is App's state object, during render. | prop mutation / impure render | high |
| SA-10 | `frontend/src/components/PatientStats.tsx` | `useMemo` dep is `patients.map(p => p.department)` — a fresh array every render, so the memo never hits. | unstable dependency | low |

## Scoring

10 defects. For each tool run record:

- **true positives** — of SA-01..SA-10, which were flagged (right file, right issue)
- **false negatives** — planted but missed
- **false positives** — flagged code that isn't on this list and isn't a real
  defect. Judge these by hand; the codebase has genuine rough edges that a tool
  is *right* to flag (e.g. inputs in `PatientForm.tsx` carry placeholders but no
  `<label>`), and those count as true positives against an unplanted baseline,
  not as noise.

| Tool / run | Date | TP | FN | FP | Notes |
|------------|------|----|----|----|-------|
| `eslint .` (baseline) | 2026-07-27 | 2 | 8 | 0 | Caught SA-02 and SA-10 only (SA-10 twice: one `use-memo` error, one `exhaustive-deps` warning). `tsc -b` and `vite build` both pass clean — every defect is invisible to the compiler. |

The eslint row is the bar to beat: anything React Doctor finds beyond SA-02 and
SA-10 is what it's actually buying us.

## Notes (self-check, before running the tool)

Working understanding of each defect, worked out by hand and refined in
discussion, before pointing React Doctor at any of it — the point is to have
an independent read to compare the tool's findings against.

**SA-01** — `App.tsx:67-73`
No `clearInterval` in the cleanup, so every `department` change leaves the old
timer running and starts a new one on top of it. The cleanup return doesn't
prevent new timers from being created — it guarantees the *previous* one is
killed first, so there's only ever one alive at a time (and none after
unmount). Each interval also closes over the `department` value from its own
render, so without cleanup, multiple stale timers overwrite `patients` with
different filtered lists on a cycle.

**SA-02** — `App.tsx:76-78`
`[]` deps mean the effect runs once, after the first render, and never again.
The values it reads (`patients.length`, `department`) are whatever they were
on that one render — here, the pre-fetch state (`0`, `"all"`). The tab title
is frozen at a value that was never even correct, not just stale. Fix:
`[patients.length, department]`.

**SA-03** — `App.tsx:82-92`
Initial read was wrong: `deletePatient(id)` only calls the server — it never
touches the local `patients` array, so `findIndex` still finds the right
index. The actual bug is the two lines after: `patients.splice(i, 1)` mutates
the array in place, then `setPatients(patients)` hands React back the *same
reference*. `Object.is(old, new)` is `true`, so React bails out and never
re-renders — the row silently survives on screen. Fix: build a new array,
e.g. `setPatients((prev) => prev.filter((p) => p.id !== id))`.

**SA-04** — `PatientStats.tsx:45-47`
`key={i}` keys by position, not by identity. `byDepartment`'s order comes
from insertion order into an object built by iterating `patients`, so it can
shift as departments appear. A reordered key means React matches the wrong
old DOM node to the wrong new data. Low blast radius here since the rows are
plain text, but the mechanism is the same one that corrupts input state in
reorderable lists elsewhere.

**SA-05** — `PatientStats.tsx:56-63`
`dangerouslySetInnerHTML` hands a string straight to the browser's HTML
parser instead of rendering it as escaped text. `latest.name` /
`chiefComplaint` trace back to a free-text `<input>` in `PatientForm.tsx`, so
this is user input crossing from the data lane into the code lane — stored
XSS. `{latest.name}` (plain JSX interpolation) would have escaped it
automatically; there's no reason this needed the dangerous API at all, since
the only goal was bolding a name.

**SA-06** — `PatientStats.tsx:24-35`
`Row` is declared inside `PatientStats`, so it's a new function *object*
every render even though the source is identical. React keys reconciliation
on `element.type` — a new type means "different component," not "same
component, re-rendered." So this isn't a re-render, it's a remount: old DOM
destroyed, new DOM built, any internal state or effects reset. Currently
`Row` holds no state so the visible cost is just wasted work, but it's a
latent trap the moment `Row` gains any (an input, a toggle). Fix: move the
declaration to module scope, same pattern as `FILTERS` in `Header.tsx` and
`EMPTY` in `PatientForm.tsx`.

**SA-07** — `PatientStats.tsx:38-40`
`<div onClick>` as a toggle has no built-in role or keyboard behavior — those
are opt-in per element, not automatic for anything with a click handler. A
`<div>` isn't in the Tab order, Enter/Space don't trigger `onClick` on it,
and a screen reader announces it as plain text with no indication it does
anything. `Header.tsx:43-53` does the equivalent job correctly with a real
`<button>`, which gets Tab order, Enter/Space activation, and a "button" role
for free. Fix: swap to `<button type="button" aria-expanded={open}>`.

**SA-08** — `PatientStats.tsx:12`
`useState(title)` only uses its argument on the very first render — every
render after, React returns whatever's in state and ignores the argument.
`title` here is `` `${patients.length} on the board` `` from `Body.tsx:56`,
recomputed fresh every render, so `heading` latches onto the initial count
and never updates again no matter how the list changes. This is the general
derived-state trap: anything fully computable from props shouldn't be copied
into state at all — delete the `useState` and use `title` directly.

**SA-09** — `Body.tsx:34-36`
`patients.sort()` runs in the render body and mutates in place. Two problems,
not one: (1) `patients` is a prop — the real array lives in `App`'s state, so
this reaches up through a read-only prop and rearranges a parent's state from
a child, silently; (2) render is supposed to be pure (take props/state,
return JSX, touch nothing else) — mutating inputs during render can produce
different output across renders (e.g. under `StrictMode`'s double-render).
Calling `setPatients` here would be a separate bug (set-state-during-render
loop). Correct fix is a copy, since sort order is derived, not stored:
`const sorted = [...patients].sort(...)`, then map over `sorted`.

**SA-10** — `PatientStats.tsx:17-22`
Not "functions can't appear in a dependency array" — the actual rule is that
each dependency is compared with `Object.is`, so what matters is whether the
expression returns a *stable reference* across renders when nothing relevant
changed. `patients.map((p) => p.department)` calls `.map()`, which always
allocates a new array, so `Object.is` sees a different reference on every
render regardless of content — the memo recomputes unconditionally, which is
what eslint's `react-hooks/use-memo` error was pointing at. `patients` itself
would have been fine: same reference across renders unless `App` actually
calls `setPatients`. Fix: `}, [patients]);`.

The `??` on `PatientStats.tsx:20` is unrelated to the bug — nullish
coalescing, defaults to `0` only when the left side is `null`/`undefined`
(unlike `||`, which would also override a legitimate `0`). Correct as
written.

## Known runtime effects

The app still builds, typechecks, lints-with-findings, and runs. Visible
symptoms while using it: the discharge button appears to do nothing (SA-03),
the stats heading count never updates (SA-08), and the tab title is stuck
(SA-02). That's expected — leave them.
