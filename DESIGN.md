# Design

> Maintained by frontend-god-mode. Source of truth for type, color, motion and layout.
> Read this before touching the UI.

## Aesthetic direction

Plain data report: dark-first warm off-black, one typeface, data colors carry lab identity, lime marks the Pareto frontier and nothing else. No hero, no decoration, no ambient motion. The data is the page.

## Dials

- DESIGN_VARIANCE: 3 / 10
- MOTION_INTENSITY: 2 / 10
- VISUAL_DENSITY: 6 / 10

## Type stack

- One family: Geist (400-600), loaded from Google Fonts in `src/routes/__root.tsx`
- No mono. Numbers use Geist with `.tabular` (tabular-nums).
- Sizes: H1 `text-2xl md:text-3xl`, section headings `text-lg` or `text-sm`, labels `text-xs`
- Sentence case everywhere. No uppercase eyebrows, no letter-spaced labels.
- `font-feature-settings: "ss01", "cv11"`
- Banned: Inter, Roboto, Arial, system-ui as primary, serif anywhere

## Color tokens (OKLCH triplets in `src/styles/app.css`, used as `oklch(var(--x) / a)`)

| Token                   | Light                        | Dark                        |
| ----------------------- | ---------------------------- | --------------------------- |
| background              | 0.975 0.006 80               | 0.2 0.006 70                |
| surface-ring            | 0.995 0.004 80               | 0.225 0.006 70              |
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
- Primary (lime) is reserved for the frontier: the line, its rings, frontier scores and the "frontier" tag. The slider is the one exception.
- Shadows tint with `--shadow-tint`. Only the chart tooltip has one.

## Motion

Motion only explains change between timeline frames. Nothing animates on load or on loop.

- Easing: `--ease-out-expo` = `cubic-bezier(0.16, 1, 0.3, 1)`
- Chart points and labels: CSS `transform` transition 0.95s between frames
- Leaderboard rows: `translateY` reorder 0.8s
- Segmented control: 2px underline, `translateX + scaleX`
- Banned: entrance staggers, number tweens, pulsing or rippling dots, path draw-ins, shimmer, hover scale or rotate
- No animation library. Do not add framer-motion without asking (AGENTS.md).

## Layout

- Container: `max-w-[1400px] mx-auto px-4 md:px-10`
- Header: left-aligned H1, one-line description, source and update time. No hero figure.
- Lab releases: small heading, one `border-y` row of cells, horizontal snap scroll on mobile
- Sticky toolbar: metric + view segmented controls, solid `bg-background`, no blur
- Chart 8 / leaderboard 4 on `lg`, stacked below
- Tables: `divide-y`, right-aligned tabular numbers, no cards. Tags are plain small text, not pills.
- Footer: plain paragraphs. The Telegram link is a text link, not a card.
- Radii: `rounded-md` for the tooltip and buttons, full for the play button

## Component inventory

Custom only: FrontierChart (SVG), ChartTooltip, ChartLegend, Leaderboard, RankDelta, TimelineControl,
ChangeSummary, LabReleases, ModelTable, SegmentedControl, SiteFooter.
Icons: lucide-react, stroke 1.75-2. One component per `.tsx` file.

## Brand voice

- Direct and dry. Name the model, the score, the date.
- Banned: elevate, seamless, unleash, next-gen, game-changing, emojis.

## Accessibility floor

- WCAG AA body contrast, focus-visible ring on every control, 44px touch targets on mobile
- Chart points are focusable with a full aria-label; the table is the non-visual view
- `prefers-reduced-motion` respected globally

## Last updated

2026-11-07 - de-slop pass: removed hero headline and #1 stat, mono labels, grain and glow, ambient and entrance motion, pill tags, Telegram card.
2026-10-29 - full redesign: custom SVG chart, AA snapshot and release timelines, animated leaderboard.
