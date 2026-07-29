# HeroUI — removed. Do not reintroduce.

`@heroui/react` and `@heroui/styles` were added **2026-07-27** and uninstalled
**2026-07-29**. Nothing in `src/` imports them. This file is kept because the two
bugs they caused are easy to repeat with any headless overlay library, and both
cost production time.

## What replaced it

Everything HeroUI provided already existed in the project's own dependencies:

| Need | Use |
|---|---|
| Modal | `@/components/ui/dialog` (Radix Dialog) |
| Confirm-before-destroy | `@/components/ui/alert-dialog` |
| Bottom sheet | `@/components/ui/drawer` (vaul) |
| Select | `@/components/ui/select` (Radix) |
| 6-digit code | `@/components/ui/input-otp` (input-otp) |
| Buttons / inputs / textarea | `@/components/ui/{button,input,textarea}` |
| Loading placeholder | `@/components/ui/skeleton` |

Components under `src/components/ui/` are **hand-maintained copies**, not a
managed dependency. Do not run `npx shadcn add` — it overwrites local
customisations. Copy the upstream source and adapt it.

## The two bugs, because they generalise

**1. Triggers are not wrappers.** Every HeroUI v3 `*.Trigger` and `*.CloseTrigger`
already rendered its own interactive element — `Drawer.Trigger` a react-aria
`<button>`, `Modal.Trigger` and `Tooltip.Trigger` a `<div role="button">`,
`Modal.CloseTrigger` a `CloseButton`. Wrapping a `<Button>` in any of them
produced `<button><button>` and a hydration error. **One interactive DOM element
per action.** Radix's `asChild` behaves differently — it *merges* onto its child
rather than rendering its own element — so the same instinct is right there and
wrong in react-aria. Read the component's source before composing around it.

**2. `Backdrop` was a parent, not a sibling.** `Modal.Backdrop` rendered
react-aria's `ModalOverlay` and took `children`; `Modal.Container` rendered
react-aria's `Modal`, which only positions itself *inside* that overlay. Written
as siblings, the page dimmed and the dialog never appeared — which reads exactly
like a z-index or routing bug and is neither.

**The meta-lesson:** this project's own docs taught the broken pattern for two
days, so it shipped twice. When documenting a library API, verify against
`node_modules/<pkg>/dist` rather than upstream examples, which are often written
for a previous major version.

## Related notes elsewhere

- `project-brain/Decisions and Gotchas.md` — portal token scoping, controlled-dialog
  focus restoration, native `<select>` menus, Tailwind v4 `lab()` colours.
- `project-brain/Agent UI Capabilities.md` — which UI tooling is actually callable
  per agent runtime.
