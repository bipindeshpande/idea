## Validation Results React Architecture

This document describes how the redesigned Validation Results screen is structured inside `frontend/src/pages/validation/ValidationResult.jsx`. Use it as a 1–2 page implementation map for engineers and designers.

---

### 1. Top-Level Page Layout

| Component / Section | Purpose | Key Props / Data Sources |
| --- | --- | --- |
| `<ValidationResult />` | Page container for the tabbed interface. Handles fetching, data prep, filters, and responsive layout. | Hooks: `useValidation`, `useReports`, `useAuth`, `useSearchParams`. State: `activeTab`, `viewFilter`, `sortOption`, `previousScore`, etc. |
| `<Seo />` | Sets page metadata. | `title`, `description`, `keywords`, `path`. |
| `<TabNavigation />` *(inline)* | The tab strip (“Your Input”, “Validation Results”, …). Controlled by `activeTab`. | Buttons call `setActiveTab(tabId)`. |
| `<PDFExportContainer />` *(ref wrapper)* | Wraps all tab panes so PDF export can hide/show nodes temporarily. | `ref={pdfRef}`. |

---

### 2. Diagnostic Tab Composition

```
Validation Results Tab
├─ CelebrationBanner (if score ≥ 8)
├─ ComparisonBanner (if re-validate context)
└─ DiagnosticLayout
   ├─ SummaryRow
   │  ├─ Title block
   │  └─ OverallScoreBadge
   ├─ RadarRow
   │  ├─ <RadarChart axes={radarData} />
   │  └─ <ScoreLegendCard />
   ├─ ControlsRow
   │  ├─ <ViewToggle value={viewFilter} />
   │  └─ <SortDropdown value={sortOption} />
   ├─ ParameterGroups
   │  ├─ {group in PARAMETER_GROUPS_LAYOUT}
   │  │  ├─ GroupHeader (title + subtext)
   │  │  └─ <ParameterCard /> grid (responsive 3/2/1 cols)
   └─ FooterNav (links to Recommendations, Action Plan, Download PDF)
```

*Data prep helpers*
- `parameterLookup`: memoized map `{ parameterName: { score, details } }`.
- `parameterGroups`: merges layout blueprint with runtime scores, applies view filter (“all”, “red flags”), and sort order (category, score asc/desc).
- `radarData`: converts `parameterLookup` into 10 axes for `<RadarChart>`.

---

### 3. Reusable Components

#### `RadarChart`
Lightweight SVG radar with 10 axes, concentric rings, and label halo for readability. Props:
- `axes`: array `{ label: string, value: number }`.
- Internal helpers `getCoordinates`, `polygonPoints`.

#### `ScoreLegendCard`
Static legend describing score buckets (0–3, 4–6, etc.). Uses the same semantic colors defined in the Tailwind preset.

#### `ParameterCard`
Diagnostic card per pillar. Props:
- `parameter`: string label.
- `score`: 0–10 numeric.
- `details`: markdown-compatible string.
Internally:
- `getScoreMeta(score)`: returns color tokens + badge label.
- Renders header, badge, progress bar, “Assessment” label, truncated text.

#### `ViewToggle` *(inline)*
Two-button segmented control:
- `value`: `"all"` or `"red"`.
- `onSelect(nextValue)`.
Buttons share the same semantic tokens used in the spec.

#### `SortDropdown` *(inline)*
Native select with three options (`category`, `score-asc`, `score-desc`) styled per spec, with custom chevron via pseudo-element.

---

### 4. Data Flow Summary

1. `ValidationResult` receives `validation` from context (`currentValidation`).
2. Derived structures:
   - `scores = validation?.scores || {}`.
   - `details = validation?.details || {}`.
   - `radarData`, `parameterLookup`, `parameterGroups`.
3. UI reacts to filters:
   - `viewFilter` toggles whether cards <= 3 are shown.
   - `sortOption` reorders the cards inside each group.
4. Footer buttons switch tabs or trigger the PDF export by referencing the download button ref.

---

### 5. Extension Points

- **Add new parameter**: update `VALIDATION_PARAMETERS`, `RADAR_AXES`, and `PARAMETER_GROUPS_LAYOUT`. Backend must provide scores/details.
- **Alternate chart**: `RadarChart` is isolated; replace with another visualization without touching cards.
- **Theming**: Colors pull from Tailwind token classes defined in the preset (`validation.palette`). Adjust once for the entire screen.

This architecture keeps presentation (cards/chart), interaction (filters/sorts), and data preparation (memos/utilities) separated so new sections or comparisons can be slotted in without touching the core diagnostic grid.*** End Patch

