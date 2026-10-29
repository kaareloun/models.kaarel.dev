# Design

> Maintained by frontend-god-mode. Source of truth for type, color, motion and layout.
> Read this before touching the UI.

## Aesthetic direction

Instrument panel for the LLM frontier: dark-first warm off-black, Geist type, data colors carry lab identity, one lime signal accent.

## Dials

- DESIGN_VARIANCE: 8 / 10
- MOTION_INTENSITY: 6 / 10
- VISUAL_DENSITY: 4 / 10

## Type stack

- Display and body: Geist (400-700), loaded from Google Fonts in `src/routes/__root.tsx`
- Mono: Geist Mono for numbers, labels, axis ticks, eyebrows
- `font-feature-settings: "ss01", "cv11"`; `.tabular` for aligned columns only
- Banned: Inter, Roboto, Arial, system-ui as primary, serif anywhere

## Color tokens (OKLCH triplets in `src/styles/app.css`, used as `oklch(var(--x) / a)`)

| Token                   | Light                        | Dark                        |
| ----------------------- | ---------------------------- | --------------------------- |
| background              | 0.975 0.006 80               | 0.2 0.006 70                |
| card / surface          | 0.995 0.004 80               | 0.225 0.006 70              |
| foreground              | 0.22 0.012 70                | 0.95 0.008 85               |
| muted-foreground        | 0.5 0.012 70                 | 0.7 0.012 80                |
| border                  | 0.9 0.006 80                 | 0.31 0.007 70               |
| primary (signal accent) | 0.5 0.13 130                 | 0.88 0.16 125               |
| up / down               | 0.52 0.13 150 / 0.55 0.17 15 | 0.72 0.15 150 / 0.7 0.15 15 |

Lab series (validated all-pairs with the dataviz validator, both modes):

| Lab                      | Light               | Dark                |
| ------------------------ | ------------------- | ------------------- |
| Anthropic `--lab-2`      | #eb6834             | #d95926             |
| OpenAI `--lab-3`         | #1baf7a             | #199e70             |
| Google `--lab-1`         | #2a78d6             | #3987e5             |
| Other labs `--lab-other` | oklch(0.72 0.01 75) | oklch(0.52 0.01 75) |

- Only three labs get a hue. A fourth lab folds into "Other labs" (scatter is all-pairs).
- Free Opencode Zen models are hollow rings, never a hue.
- Text never wears a lab color. Identity comes from a dot beside the text.
- Light-mode aqua is under 3:1; the table view and direct labels are the relief.
- Shadows tint with `--shadow-tint`. No pure black or white.

## Motion

- Easing: `--ease-out-expo` = `cubic-bezier(0.16, 1, 0.3, 1)` on everything
- Chart points: CSS `transform` transition 0.95s; enter with `pop` (staggered 35ms by rank)
- Pareto frontier: `draw` keyframe via `pathLength=1` on every frame change
- Leaderboard rows: `translateY` reorder 0.8s; score bars `scaleX`
- Numbers: `AnimatedNumber` rAF tween 0.9s
- Segmented control: 2px underline, `translateX + scaleX`
- Page load: `.animate-rise` with `--i` stagger 70ms
- Perpetual: `LiveDot` pulse, `ripple` halos on models released in the last 21 days
- Only `transform` and `opacity` animate. `.motion-ripple` is hidden under reduced motion.
- No animation library. Do not add framer-motion without asking (AGENTS.md).

## Layout

- Container: `max-w-[1400px] mx-auto px-4 md:px-10`
- Header: split 7/5, H1 left, single hero figure (current #1) right
- Lab releases: one `border-y` row with `divide-x` cells, horizontal snap scroll on mobile
- Sticky toolbar: metric + view segmented controls, `bg-background/80 backdrop-blur-xl`
- Chart 8 / leaderboard 4 on `lg`, stacked below
- Tables: `divide-y`, mono right-aligned numbers, no cards
- Radii: 14px tooltips, 18px panels, full for pills

## Component inventory

Custom only: FrontierChart (SVG), ChartTooltip, ChartLegend, Leaderboard, RankDelta, TimelineControl,
ChangeSummary, HeroLeader, LabReleases, ModelTable, SegmentedControl, AnimatedNumber, LiveDot, SiteFooter.
Icons: lucide-react, stroke 1.75-2. One component per `.tsx` file.

## Brand voice

- Direct and dry. Name the model, the score, the date.
- Banned: elevate, seamless, unleash, next-gen, game-changing, emojis.

## Accessibility floor

- WCAG AA body contrast, focus-visible ring on every control, 44px touch targets on mobile
- Chart points are focusable with a full aria-label; the table is the non-visual view
- `prefers-reduced-motion` respected globally

## Last updated

2026-10-29 - full redesign: custom SVG chart, AA snapshot and release timelines, animated leaderboard.
