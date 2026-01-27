# Play! Pokemon GO Tournament Graphic Generator - Implementation Plan

## Executive Summary

Building a mobile-first Next.js application to generate tournament graphics for Play! Pokemon GO events. The MVP focuses on **Top 16 players** with usage statistics and bracket visualization, exportable as 2100x2100px PNG graphics.

## Project Context

**Current Stack:**
- Next.js 16.1.5 (App Router)
- React 19.2.3
- TypeScript (strict mode)
- Tailwind CSS v4
- Fresh project (no existing components)

**Deployment:** Vercel

**Design Philosophy:** Mobile-first, progressive disclosure

## MVP Scope (Today's Implementation)

### ✅ In Scope
- Top 16 players with 6 Pokemon each (96 Pokemon total)
- Event metadata (name, type, overview type)
- Usage statistics calculation and visualization (top 12 Pokemon)
- Double elimination bracket visualization (top 8 players)
- Flag selection (1-2 flags per player via dropdown)
- Placement tracking (1st, 2nd, 3rd, 4th, 5-8, 9-16)
- Shadow Pokemon support
- PNG export at 2100x2100px
- Mobile, tablet, desktop responsive layouts

### ❌ Out of Scope
- Top 4, 8, 32, 64 player counts (future enhancement)
- User accounts or persistence
- Database storage
- Additional export formats
- Shareable URLs

## Technical Architecture

### Data Flow
```
Form Input → React Hook Form → Zod Validation → Live Preview → Export to PNG
                                                      ↓
                                         Usage Calculator / Bracket Generator
```

### State Management
- **React Hook Form** for form state (no global state needed)
- **Zod** for validation schemas
- **No database** - one-time generation tool

### Rendering Strategy
- **Preview:** HTML/CSS rendered at 700x700px (scaled)
- **Export:** HTML/CSS rendered at 2100x2100px using html2canvas

## Phase 0: Project Setup

### 0.1 Install Dependencies

```bash
# Form management
npm install react-hook-form zod @hookform/resolvers

# Graphics export
npm install html2canvas

# UI components
npm install country-flag-icons cmdk

# shadcn/ui setup
npx shadcn@latest init
```

**shadcn/ui configuration:**
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Component location: `@/components/ui`

**shadcn components to install:**
```bash
npx shadcn@latest add form input button select card tabs accordion dialog label badge separator scroll-area toggle radio-group
```

Note: Combobox may need manual setup with Command component.

### 0.2 Directory Structure

```
app/
├── page.tsx                          # Main tournament builder page
├── layout.tsx                        # Update metadata
└── globals.css                       # Add custom variables

components/
├── ui/                               # shadcn components (auto-generated)
├── form/
│   ├── tournament-form.tsx          # Root form container
│   ├── event-info-section.tsx       # Event metadata inputs
│   ├── player-input-section.tsx     # Single player inputs
│   ├── team-input.tsx               # 6 Pokemon team inputs
│   ├── pokemon-combobox.tsx         # Pokemon autocomplete
│   ├── flag-selector.tsx            # Country flag dropdown
│   └── bracket-builder-dialog.tsx   # Manual bracket editor
├── graphic/
│   ├── graphic-preview.tsx          # Live preview wrapper
│   ├── top16-graphic.tsx            # Main 2100x2100 graphic
│   ├── usage-stats-section.tsx      # Pokemon usage chart
│   ├── bracket-section.tsx          # Bracket visualization
│   ├── player-team-row.tsx          # Single player display
│   └── pokemon-sprite.tsx           # Pokemon image component
└── layout/
    ├── mobile-form-tabs.tsx         # Responsive tab/accordion
    └── export-button.tsx            # Export & download handler

lib/
├── types.ts                          # TypeScript interfaces
├── schema.ts                         # Zod validation schemas
├── pokemon-data.ts                   # Pokemon data utilities
├── bracket-generator.ts              # Auto-generate brackets
├── usage-calculator.ts               # Calculate Pokemon usage
└── graphic-exporter.ts               # html2canvas wrapper

data/
├── pokemon.json                      # Pokemon metadata (user provides)
└── flags.ts                          # Country mappings

hooks/
├── use-tournament-form.ts            # Form state hook
└── use-graphic-export.ts             # Export logic hook

public/
└── sprites/                          # Pokemon sprite images
```

### 0.3 Configuration Updates

**File: [app/globals.css](app/globals.css)**
- Add tournament color variables (gold, silver, bronze)
- Add shadow Pokemon CSS effect
- Add graphic-specific utility classes

**File: [app/layout.tsx](app/layout.tsx)**
- Update metadata (title, description)
- Keep existing Geist fonts

**File: [next.config.ts](next.config.ts)**
- Add image domain for Pokemon sprites
- Enable static file serving

## Phase 1: Data Layer & Type System

### 1.1 Core Types

**File: [lib/types.ts](lib/types.ts)**

```typescript
export type EventType = "Regional" | "Generic" | "International" | "Worlds";
export type OverviewType = "Usage" | "Bracket" | "None";
export type Placement = 1 | 2 | 3 | 4 | "5-8" | "9-16";

export interface Pokemon {
  name: string;
  isShadow: boolean;
}

export interface Player {
  placement: Placement;
  team: Pokemon[]; // exactly 6
  flags: string[]; // 1-2 ISO country codes
}

export interface TournamentData {
  eventName: string;
  eventType: EventType;
  overviewType: OverviewType;
  bracketReset: boolean;
  players: Player[]; // exactly 16
}

export interface PokemonMetadata {
  id: number;
  name: string;
  spriteUrl: string;
  types: string[];
}

export interface UsageStats {
  pokemon: string;
  count: number;
  percentage: number;
}
```

### 1.2 Validation Schema

**File: [lib/schema.ts](lib/schema.ts)**

**Critical validations:**
- Exactly 16 players
- Exactly 6 Pokemon per player
- 1-2 flags per player
- Correct placement distribution:
  - 1x 1st place
  - 1x 2nd place
  - 1x 3rd place
  - 1x 4th place
  - 4x 5-8 placement
  - 8x 9-16 placement

### 1.3 Pokemon Data

**File: [data/pokemon.json](data/pokemon.json)**

Expected structure (user will provide):
```json
[
  {
    "id": 1,
    "name": "Bulbasaur",
    "spriteUrl": "/sprites/bulbasaur.png",
    "types": ["grass", "poison"]
  }
]
```

**File: [lib/pokemon-data.ts](lib/pokemon-data.ts)**

Utilities needed:
- `getAllPokemon()`: Load all Pokemon
- `searchPokemon(query)`: Fuzzy search for autocomplete
- `getPokemonByName(name)`: Get single Pokemon
- `getPokemonSprite(name, isShadow)`: Get sprite URL with shadow variant

## Phase 2: Form Architecture

### 2.1 Form State Hook

**File: [hooks/use-tournament-form.ts](hooks/use-tournament-form.ts)**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function useTournamentForm() {
  return useForm<TournamentData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      eventName: "",
      eventType: "Regional",
      overviewType: "Usage",
      bracketReset: false,
      players: Array(16).fill(null).map(() => ({
        placement: "9-16",
        team: Array(6).fill(null).map(() => ({
          name: "",
          isShadow: false,
        })),
        flags: [""],
      })),
    },
    mode: "onChange",
  });
}
```

### 2.2 Component Hierarchy

```
TournamentForm (root)
├── EventInfoSection
│   ├── Event name input
│   ├── Event type select (Regional, Generic, International, Worlds)
│   ├── Overview type radio (Usage, Bracket, None)
│   └── Bracket reset checkbox (if Bracket selected)
├── MobileFormTabs
│   ├── Tab: "Top 4" (Players 1-4)
│   ├── Tab: "5-8 Place" (Players 5-8)
│   ├── Tab: "9-16 Place" (Players 9-16)
│   └── Tab: "Bracket" (if overviewType === "Bracket")
└── PlayerInputSection (16x)
    ├── Placement selector
    ├── FlagSelector (1-2 flags)
    └── TeamInput (6x PokemonCombobox)
```

### 2.3 Mobile-First Layout Strategy

**Mobile (<768px):**
- Tabs for player groups
- Collapsed sections
- Sticky "Preview" floating button
- Single column

**Tablet (768-1024px):**
- Accordion instead of tabs
- Side-by-side: form left, preview right
- Two columns

**Desktop (>1024px):**
- All sections visible with scroll
- Three columns: form, preview, export tools
- Live preview always visible

### 2.4 Pokemon Selection UX

**File: [components/form/pokemon-combobox.tsx](components/form/pokemon-combobox.tsx)**

Features:
- Fuzzy search through 800+ Pokemon
- Keyboard navigation
- Sprite preview in dropdown
- Shadow toggle checkbox
- Clear button
- Validation feedback

Use shadcn's Command + Popover components with custom filtering.

## Phase 3: Graphic Rendering

### 3.1 Two-Tier Rendering

**Live Preview:**
- 700x700px (1/3 scale)
- Debounced updates (300ms)
- CSS transform for scaling

**Export Render:**
- 2100x2100px (full resolution)
- Hidden off-screen
- Rendered on export only

### 3.2 Graphic Layout (2100x2100px)

```
┌───────────────────────────────┐
│ Event Header                  │ 200px
├───────────────────────────────┤
│ Usage Stats / Bracket         │ 800px
├───────────────────────────────┤
│ Player Rows (16 players)      │ 1100px
│ - 1st place (prominent)       │
│ - 2nd place                   │
│ - 3rd, 4th                    │
│ - 5-8 (4 players)             │
│ - 9-16 (8 players)            │
└───────────────────────────────┘
```

**File: [components/graphic/top16-graphic.tsx](components/graphic/top16-graphic.tsx)**

Main graphic component that:
- Accepts `TournamentData` prop
- Accepts `width`, `height`, `isExport` props
- Conditionally renders Usage/Bracket based on `overviewType`
- Renders all 16 players with teams

### 3.3 Usage Statistics

**File: [lib/usage-calculator.ts](lib/usage-calculator.ts)**

```typescript
export function calculateUsageStats(players: Player[]): UsageStats[] {
  // Count Pokemon occurrences across all teams
  // Calculate percentages
  // Sort by count descending
  // Return top 12
}
```

**File: [components/graphic/usage-stats-section.tsx](components/graphic/usage-stats-section.tsx)**

Visual design:
- Horizontal bar chart
- Pokemon sprite + name
- Percentage bar (color-coded)
- Count number
- Top 12 Pokemon only

### 3.4 Bracket Visualization

**File: [lib/bracket-generator.ts](lib/bracket-generator.ts)**

```typescript
export function generateBracket(players: Player[]): BracketMatch[] {
  // Auto-generate double elimination bracket from top 8
  // Winners bracket (4 rounds)
  // Losers bracket (6 rounds)
  // Grand finals with optional reset
}
```

**File: [components/graphic/bracket-section.tsx](components/graphic/bracket-section.tsx)**

Visual design:
- SVG-based rendering
- Winners bracket top, Losers bracket bottom
- Player flags + placement
- Connecting lines between matches
- Grand finals reset indicator

**File: [components/form/bracket-builder-dialog.tsx](components/form/bracket-builder-dialog.tsx)**

Manual editor:
- Visual interface to adjust matches
- Click to swap players
- Validates against placements
- Reset to auto-generated button

## Phase 4: Export System

### 4.1 Export Mechanism

**File: [lib/graphic-exporter.ts](lib/graphic-exporter.ts)**

```typescript
import html2canvas from "html2canvas";

export async function exportGraphic(
  elementId: string,
  filename: string
): Promise<void> {
  // 1. Get hidden full-res element
  // 2. Apply export styles
  // 3. html2canvas with high DPI
  // 4. Convert to blob
  // 5. Trigger download
}
```

**html2canvas config:**
```typescript
{
  scale: 2,           // 2x DPI
  useCORS: true,      // For Pokemon sprites
  backgroundColor: "#ffffff",
  width: 2100,
  height: 2100,
}
```

### 4.2 Export Button

**File: [components/layout/export-button.tsx](components/layout/export-button.tsx)**

Features:
- Validates form before export
- Loading state with progress
- Error handling
- Filename customization
- Success feedback

**File: [hooks/use-graphic-export.ts](hooks/use-graphic-export.ts)**

Hook that manages:
- Export state (idle, rendering, exporting, complete)
- Progress tracking
- Error handling
- Validation

### 4.3 Hidden Render Container

**File: [app/page.tsx](app/page.tsx)**

```tsx
<div>
  {/* Visible UI */}
  <TournamentForm />
  <GraphicPreview />

  {/* Hidden full-res render */}
  <div
    id="export-target"
    className="fixed -left-[9999px]"
    style={{ width: 2100, height: 2100 }}
  >
    <Top16Graphic
      data={formData}
      width={2100}
      height={2100}
      isExport={true}
    />
  </div>
</div>
```

## Phase 5: Data Integration

### 5.1 Pokemon Data Loading

**Assumed user provides:**
- `pokemon.json` with 800+ entries
- Sprite images in `/public/sprites/`

**Implementation:** In-memory search index for fast autocomplete

### 5.2 Flag Integration

**Library:** `country-flag-icons`

**File: [data/flags.ts](data/flags.ts)**

```typescript
import * as flags from "country-flag-icons/react/3x2";

export const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "JP", name: "Japan" },
  // ...
];
```

**File: [components/form/flag-selector.tsx](components/form/flag-selector.tsx)**

- Searchable dropdown
- Flag icons visible
- Support 1-2 flags
- Common countries prioritized

### 5.3 Asset Optimization

**Strategy:**
- Use Next.js Image in preview
- Use regular `<img>` in export (html2canvas compatibility)
- Preload sprites for selected Pokemon

**File: [components/graphic/pokemon-sprite.tsx](components/graphic/pokemon-sprite.tsx)**

Component that:
- Accepts `name`, `isShadow`, `size`, `isExport` props
- Switches between Next Image and regular img
- Applies shadow effect via CSS

## Phase 6: Styling & Polish

### 6.1 Custom CSS

**File: [app/globals.css](app/globals.css)**

Add:
```css
:root {
  --tournament-gold: #FFD700;
  --tournament-silver: #C0C0C0;
  --tournament-bronze: #CD7F32;
}

/* Shadow Pokemon effect */
.shadow-pokemon {
  filter: brightness(0.7) contrast(1.2);
}

.shadow-pokemon::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, purple, black);
  mix-blend-mode: color;
  opacity: 0.6;
}
```

### 6.2 Responsive Breakpoints

```
Mobile:  < 768px  (1-column, tabs)
Tablet:  768-1024px (2-column, accordion)
Desktop: > 1024px (3-column, all visible)
```

### 6.3 Loading States

Components needing skeletons:
- Pokemon data initial load
- Sprite loading
- Export rendering
- Form validation

## Implementation Order

### Day 1: Foundation
1. ✅ Install dependencies (Phase 0.1)
2. ✅ Create directory structure (Phase 0.2)
3. ✅ Set up types (Phase 1.1)
4. ✅ Create validation schemas (Phase 1.2)
5. ✅ Set up Pokemon data structure (Phase 1.3)

### Day 2: Form Foundation
6. ✅ Create form hook (Phase 2.1)
7. ✅ Build EventInfoSection
8. ✅ Build PlayerInputSection skeleton
9. ✅ Build TeamInput skeleton
10. ✅ Set up responsive layout

### Day 3: Pokemon Selection
11. ✅ Build PokemonCombobox with search
12. ✅ Integrate Pokemon data
13. ✅ Add shadow toggle
14. ✅ Build FlagSelector

### Day 4: Complete Form
15. ✅ Build MobileFormTabs
16. ✅ Connect all form sections
17. ✅ Add validation feedback
18. ✅ Test full form flow

### Day 5: Graphic Rendering
19. ✅ Build Top16Graphic container
20. ✅ Build player team row display
21. ✅ Build event header
22. ✅ Add Pokemon sprite rendering
23. ✅ Test preview scaling

### Day 6: Usage Stats
24. ✅ Implement usage calculator
25. ✅ Build UsageStatsSection
26. ✅ Add bar chart visualization
27. ✅ Test with various data

### Day 7: Bracket System
28. ✅ Implement bracket generator
29. ✅ Build BracketSection SVG rendering
30. ✅ Build BracketBuilderDialog
31. ✅ Test bracket validation

### Day 8: Export & Polish
32. ✅ Implement graphic exporter
33. ✅ Build ExportButton
34. ✅ Add hidden render container
35. ✅ Add loading states
36. ✅ Fine-tune styling
37. ✅ Test export quality

## Critical Implementation Details

### Top 5 Critical Files

1. **[lib/schema.ts](lib/schema.ts)** - Core validation logic; everything depends on this
2. **[hooks/use-tournament-form.ts](hooks/use-tournament-form.ts)** - Central state management
3. **[components/graphic/top16-graphic.tsx](components/graphic/top16-graphic.tsx)** - Main rendering component
4. **[lib/pokemon-data.ts](lib/pokemon-data.ts)** - Pokemon data access layer
5. **[lib/graphic-exporter.ts](lib/graphic-exporter.ts)** - Export engine (highest risk)

### Key Technical Decisions

✅ **Rendering:** HTML/CSS → html2canvas (user confirmed)
✅ **Pokemon Data:** Custom data source (user provides JSON)
✅ **Persistence:** None (one-time generation)
✅ **Flags:** country-flag-icons library
✅ **Bracket:** Hybrid (auto-generate + manual edits)
✅ **Dimensions:** 2100x2100px for Top 16

## Risk Mitigation

### Risk 1: html2canvas rendering issues
- **Test early** with complex graphics
- **Fallback:** Consider dom-to-image library
- **Validate:** Sprite rendering, fonts, SVG support

### Risk 2: Performance (96 Pokemon inputs)
- **Use** React Hook Form (optimized for large forms)
- **Fallback:** Virtualization, lazy loading
- **Test:** Benchmark on low-end devices

### Risk 3: Pokemon sprite loading
- **Add** fallback placeholder image
- **Handle** 404 errors gracefully
- **Test** with missing files

### Risk 4: Mobile UX complexity
- **Progressive disclosure** with tabs
- **User testing** on actual devices
- **Fallback:** Simplified form layout

## Success Criteria

### MVP Complete When:
- ✅ 16 players with 96 Pokemon can be entered
- ✅ 1-2 flags per player selectable
- ✅ Usage or Bracket overview generated
- ✅ 2100x2100 PNG export works
- ✅ Form validates correctly
- ✅ Graphic matches Figma design (pending Figma data)
- ✅ Responsive on mobile, tablet, desktop
- ✅ Export completes in <10 seconds

### Quality Bars:
- Form is intuitive, no documentation needed
- Pokemon search is instant
- Preview updates feel real-time
- Export quality is print-ready
- No console errors
- Responsive at all breakpoints

## Future Enhancements (Out of Scope)

1. Top 4, 8, 32, 64 player support
2. Multiple graphic templates
3. Database persistence
4. User accounts
5. Shareable URLs
6. PDF export
7. Social media direct sharing
8. Dark mode
9. Collaborative editing
10. API access

## Next Steps

1. **Await Figma template** from user (critical for graphic styling)
2. **Begin Phase 0** installations and setup
3. **Implement in order** following Day 1-8 sequence
4. **Test incrementally** after each phase
5. **Iterate on styling** once Figma provided

---

**Plan Created:** 2026-01-26
**Estimated Timeline:** 8 days for MVP
**Primary Risk:** html2canvas rendering quality
**Blocker:** Awaiting Figma template for pixel-perfect design
