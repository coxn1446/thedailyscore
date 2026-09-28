# The Editorial Broadsheet

Visual source of truth for The Daily Score. Corners are square. There are no drop shadows, no Material Symbols, and no prototype desk switcher.

## Tokens

| Role | Token | Value |
| --- | --- | --- |
| Paper | `background`, `surface` | `#FBF9F5` |
| Archival inset | `inset` | `#F4F0E8` |
| Module | `module` | `#EFECE4` |
| Ink | `primary` | `#111111` |
| Button label | `on-primary` | `#FBF9F5` |
| Carmine | `secondary` | `#9E2A2B` |
| Charcoal | `muted` | `#4A4A4A` |
| Rule | `border` | `#E5E2DC` |
| Strong rule | `border-strong` | `#D8D4CC` |
| Error | `error` | `#BA1A1A` |

Carmine is for kickers, the active desk, the live dateline, and the hover state of a primary button. It does not fill large surfaces.

## Type

- **Newsreader** (`font-masthead`): masthead and headlines.
- **Inter** (`font-sans`): body and controls.
- **JetBrains Mono** (`font-mono`): scores, datelines, and puzzle numbers.

Kickers are uppercase Inter with tracking `0.12em`. Body columns stay within `68ch`. Headlines use `text-balance`.

## Shape and motion

Interactive elements, inputs, portraits, and images use `0` radius. Inputs use a 1px `border-strong` rule, paper fill, and an ink border on focus, with no glow. Section endings use a double rule: 1px ink, 2px gap, 1px ink. Motion reuses `animate-fade-up` and `animate-soft-pulse`.

## Controls

- **Primary button:** square, ink fill, paper label, uppercase tracked Inter. Hover turns carmine.
- **Secondary button:** 1px ink rule, transparent fill, ink label. Hover inverts to ink fill and paper label.
- **Text link:** 1px ink underline, 2px offset. Hover shifts the underline and text to carmine.

## Voice

Short labels, placeholders, button text, errors, and empty-state titles. Editorial decks may sit under a desk headline. Do not add a helper paragraph under an individual control.
