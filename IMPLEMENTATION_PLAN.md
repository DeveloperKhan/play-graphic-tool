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
- **Preview:** Canvas rendered at 700x700px (scaled down from 2100x2100)
- **Export:** Canvas rendered at 2100x2100px using native Canvas API

## Phase 0: Project Setup

### 0.1 Install Dependencies

```bash
# Form management
npm install react-hook-form zod @hookform/resolvers

# UI components
npm install country-flag-icons cmdk

# shadcn/ui setup
npx shadcn@latest init
```

**Note:** No external graphics library needed - using native HTML Canvas API for rendering and export.

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
│   └── tournament-canvas.tsx        # Canvas component with render/export
└── layout/
    ├── mobile-form-tabs.tsx         # Responsive tab/accordion
    └── export-button.tsx            # Export & download handler

lib/
├── types.ts                          # TypeScript interfaces
├── schema.ts                         # Zod validation schemas
├── pokemon-data.ts                   # Pokemon data utilities
├── bracket-generator.ts              # Auto-generate brackets
├── usage-calculator.ts               # Calculate Pokemon usage
├── graphic-exporter.ts               # Canvas export utilities
└── canvas/
    ├── renderer.ts                   # Main canvas rendering engine
    ├── draw-header.ts                # Draw event header
    ├── draw-usage.ts                 # Draw usage stats section
    ├── draw-bracket.ts               # Draw bracket visualization
    ├── draw-players.ts               # Draw player team rows
    └── draw-utils.ts                 # Shared drawing utilities

data/
├── pokemon.json                      # Pokemon metadata (user provides)
└── flags.ts                          # Country mappings

hooks/
├── use-tournament-form.ts            # Form state hook
├── use-graphic-export.ts             # Canvas export logic hook
└── use-image-preloader.ts            # Preload sprites and flags

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

## Phase 3: Graphic Rendering (Canvas-Based)

### 3.1 Canvas Rendering Architecture

**Single Canvas Approach:**
- One `<canvas>` element at 2100x2100px native resolution
- Preview: CSS scaled to 700x700px (or responsive container)
- Export: Direct canvas export at full resolution
- Debounced re-renders on form changes (300ms)

**Canvas Rendering Engine:**
```typescript
// lib/canvas/renderer.ts
export class GraphicRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.imageCache = new Map();
  }

  async render(data: TournamentData): Promise<void> {
    // Clear canvas
    // Draw background
    // Draw header section
    // Draw usage stats OR bracket
    // Draw player rows
  }

  async preloadImages(urls: string[]): Promise<void> {
    // Preload all Pokemon sprites and flags
  }
}
```

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

**File: [components/graphic/tournament-canvas.tsx](components/graphic/tournament-canvas.tsx)**

Main canvas component that:
- Creates and manages the `<canvas>` element
- Initializes `GraphicRenderer` on mount
- Re-renders when `TournamentData` changes
- Exposes `exportToPNG()` method via ref
- Handles image preloading for sprites and flags

```typescript
export const TournamentCanvas = forwardRef<TournamentCanvasRef, Props>(
  ({ data, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<GraphicRenderer | null>(null);

    useImperativeHandle(ref, () => ({
      exportToPNG: async () => {
        return canvasRef.current?.toDataURL('image/png');
      }
    }));

    useEffect(() => {
      if (canvasRef.current) {
        rendererRef.current = new GraphicRenderer(canvasRef.current);
        rendererRef.current.render(data);
      }
    }, [data]);

    return (
      <canvas
        ref={canvasRef}
        width={2100}
        height={2100}
        className={cn("w-full max-w-[700px]", className)}
      />
    );
  }
);
```

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

**File: [lib/canvas/draw-usage.ts](lib/canvas/draw-usage.ts)**

Visual design (drawn on canvas):
- Horizontal bar chart using `ctx.fillRect()`
- Pokemon sprite via `ctx.drawImage()`
- Text labels with `ctx.fillText()`
- Percentage bar (color-coded gradients)
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

**File: [lib/canvas/draw-bracket.ts](lib/canvas/draw-bracket.ts)**

Visual design:
- Canvas-based rendering with lines and shapes
- Winners bracket top, Losers bracket bottom
- Player flags + placement
- Connecting lines between matches using `ctx.lineTo()`
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
export async function exportGraphic(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  // 1. Get canvas data as blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
  });

  // 2. Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // 3. Trigger download
  link.click();

  // 4. Cleanup
  URL.revokeObjectURL(url);
}
```

**Canvas advantages over html2canvas:**
- Native browser API, no external dependencies
- Pixel-perfect output at exact dimensions
- Better performance for complex graphics
- Full control over rendering order and anti-aliasing
- No DOM-to-image conversion quirks

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
- Canvas ref and export trigger
- Export state (idle, exporting, complete)
- Error handling for canvas operations
- Filename generation

### 4.3 Canvas Component Integration

**File: [app/page.tsx](app/page.tsx)**

```tsx
<div>
  {/* Visible UI */}
  <TournamentForm />

  {/* Canvas preview - CSS scaled for display */}
  <div className="w-full max-w-[700px] aspect-square">
    <TournamentCanvas
      ref={canvasRef}
      data={formData}
      className="w-full h-full"
    />
  </div>

  {/* Export button triggers canvas.toBlob() */}
  <ExportButton onExport={() => canvasRef.current?.exportToPNG()} />
</div>
```

**Note:** No hidden container needed - the canvas renders at full 2100x2100 resolution and CSS scales it for preview display.

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
- Preload all Pokemon sprites as `HTMLImageElement` before canvas render
- Cache loaded images in `Map<string, HTMLImageElement>`
- Use `ctx.drawImage()` for sprite rendering on canvas
- Apply shadow effect via canvas filters or manual pixel manipulation

**File: [lib/canvas/draw-utils.ts](lib/canvas/draw-utils.ts)**

Utilities for:
- `loadImage(url)`: Promise-based image loading
- `drawSprite(ctx, image, x, y, size, isShadow)`: Draw Pokemon with optional shadow effect
- `applyShadowEffect(ctx, x, y, w, h)`: Purple overlay for shadow Pokemon
- `drawFlag(ctx, flagCode, x, y, size)`: Render country flag on canvas

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

### Day 5: Canvas Rendering Foundation
19. ✅ Build TournamentCanvas component
20. ✅ Create GraphicRenderer class
21. ✅ Implement image preloading system
22. ✅ Build draw-header.ts (event header)
23. ✅ Test canvas scaling for preview

### Day 6: Canvas Drawing - Players & Usage
24. ✅ Implement usage calculator
25. ✅ Build draw-usage.ts (bar chart on canvas)
26. ✅ Build draw-players.ts (player rows with sprites)
27. ✅ Test with various data

### Day 7: Canvas Drawing - Bracket
28. ✅ Implement bracket generator
29. ✅ Build draw-bracket.ts (bracket lines and boxes)
30. ✅ Build BracketBuilderDialog (form UI)
31. ✅ Test bracket validation

### Day 8: Export & Polish
32. ✅ Implement canvas export (toBlob/toDataURL)
33. ✅ Build ExportButton
34. ✅ Add loading states for image preloading
35. ✅ Fine-tune canvas rendering
36. ✅ Test export quality at 2100x2100

## Critical Implementation Details

### Top 5 Critical Files

1. **[lib/schema.ts](lib/schema.ts)** - Core validation logic; everything depends on this
2. **[hooks/use-tournament-form.ts](hooks/use-tournament-form.ts)** - Central state management
3. **[lib/canvas/renderer.ts](lib/canvas/renderer.ts)** - Main canvas rendering engine
4. **[lib/pokemon-data.ts](lib/pokemon-data.ts)** - Pokemon data access layer
5. **[components/graphic/tournament-canvas.tsx](components/graphic/tournament-canvas.tsx)** - Canvas component wrapper

### Key Technical Decisions

✅ **Rendering:** Native HTML Canvas API
✅ **Pokemon Data:** Custom data source (user provides JSON)
✅ **Persistence:** None (one-time generation)
✅ **Flags:** country-flag-icons library
✅ **Bracket:** Hybrid (auto-generate + manual edits)
✅ **Dimensions:** 2100x2100px for Top 16

## Risk Mitigation

### Risk 1: Canvas rendering complexity
- **Modularize** drawing functions for maintainability
- **Test early** with sprite and text rendering
- **Validate:** Image loading, font rendering, anti-aliasing
- **Image preloading:** Cache sprites before render to avoid flickering

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
**Primary Risk:** Canvas image preloading and font rendering
**Blocker:** Awaiting Figma template for pixel-perfect design
