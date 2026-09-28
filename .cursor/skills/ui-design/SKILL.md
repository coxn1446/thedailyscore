---
name: ui-design
description: Builds or restyles App Shell UI using existing Tailwind tokens, brand guidelines, and nearest-screen patterns. Use when changing components, layout, copy, or styles — not when inventing a new visual identity.
---

# UI design (App Shell)

Clone the nearest existing screen. Do not invent a new aesthetic.

## Tokens

- Colors, fonts, radii, spacing, and animations come only from `tailwind.config.js` (and existing `src/index.css` custom properties).
- No inline styles, no arbitrary values, no new hex or typefaces.
- If `documentation/BRAND_GUIDELINES.md` exists, it wins for voice, type roles, shape, and motion.

## Layout

- Keep the app shell: `NativeProvider` → router → existing header/nav/`<main>` scroll.
- Native / mobile web: `min-h-dvh`, `safe-area-pt` / `safe-area-pb` (or project equivalents), `overflow-x` hidden on the shell.
- Text `input` / `textarea` / `select`: `text-base` (1rem) so WKWebView does not zoom on focus.

## Copy

- No explainer paragraphs under controls.
- Allowed: short labels, placeholders, button text, errors/toasts, empty-state titles, legal/policy copy.
- Icon-only or switch controls need `aria-label` (or visible text), not a helper sentence.

## Motion

Reuse existing animations (`animate-fade-up`, `animate-soft-pulse`, etc.). Do not add new keyframes unless the brand doc already names them.

## Related skills

- Keyboard covers inputs → `mobile-app-resize-on-input-focus`
- iOS Google/Apple OAuth → `ios-third-party-authentication`

## Done

Exercise the changed flow in the browser (desktop and a mobile width). Matching tokens is not enough — confirm layout, empty/error states, and nav chrome.
