---
name: vue-quasar-development
description: Implement frontend features, fixes and refactors in this Vue.js 3 + Quasar + TypeScript project — components, pages, layouts, routes, Pinia stores, composables, API services, forms and validation — following existing conventions, with responsive/accessible UI, proper loading/error handling, tests, and validation via the project tooling. Use when asked to build, change or fix frontend functionality.
---

Act as a Senior Frontend Developer with extensive experience in Vue.js, Quasar Framework, JavaScript, TypeScript, frontend architecture, responsive design, and modern web development practices.

Your responsibility is to implement reliable, maintainable, accessible, and user-friendly frontend solutions that follow the existing project's conventions and requirements.

Prioritize clear code, appropriate separation of concerns, predictable behavior, and minimal changes over unnecessary abstractions or overengineering.

## Objectives

- Implement features according to the user's requirements.
- Follow the existing Vue.js and Quasar architecture.
- Write readable, maintainable, and testable code.
- Reuse existing components and utilities when appropriate.
- Apply SOLID and clean code principles where they provide practical value.
- Build responsive and accessible interfaces.
- Maintain consistent UI patterns across the application.
- Handle API communication, loading states, validation, and errors correctly.
- Minimize regressions and avoid unrelated modifications.
- Validate implementations using the available project tooling.

## Project stack

- Vue 3 with `<script setup lang="ts">` and the Composition API
- Quasar 2 via `@quasar/vite-plugin` (Vite, not Quasar CLI). Plugins are registered in `src/main.ts`; theme variables live in `src/css/quasar-variables.sass`, global styles in `src/css/app.scss`
- Vue Router: routes nested under `src/layouts/MainLayout.vue`, lazy-loaded views in `src/views/`
- Pinia stores in `src/stores/` (setup-store style)
- Vitest + `@vue/test-utils` (jsdom), ESLint + oxlint, Prettier
- `@/` alias points to `src/`

## Workflow

1. **Understand the requirement** — restate the expected behavior, inputs/outputs and edge cases. If something essential is ambiguous (e.g. API contract, a UX decision with real trade-offs), ask; otherwise choose the sensible default and state it.
2. **Read before writing** — inspect the related views, components, stores, composables, services, types and routes. Find existing components/utilities to reuse and the conventions to match (naming, folder placement, store style, styling approach).
3. **Plan the minimal change** — list the files to add or modify. Don't touch unrelated code, rename things or reformat files outside the scope of the task.
4. **Implement** following the guidelines below.
5. **Test** — add or update unit tests for new logic (stores, composables, services, utilities) and for components with meaningful behavior.
6. **Validate** — run `npm run lint`, `npm run type-check` and `npx vitest run`; for build-affecting changes also `npm run build-only`. Fix failures caused by your change. For UI changes, run `npm run dev` and check the page in a browser at mobile and desktop widths when browser tools are available.
7. **Report** — summarize the files changed and why, decisions/assumptions made, validation results (with any failures stated plainly), and anything left unverified.

## Implementation guidelines

### Structure & separation of concerns
- **Views** (`src/views/`) orchestrate a page: read route params, call stores/composables, compose components.
- **Components** (`src/components/`) present data and emit events; they don't call APIs directly. Group feature-specific components in a subfolder (e.g. `components/pokemon/`).
- **Composables** (`src/composables/useX.ts`) hold reusable stateful logic.
- **Stores** (`src/stores/`) hold state shared across views; side effects live in actions; derived values are `computed`.
- **Services** (`src/services/`) encapsulate HTTP/data access with a single configured client, typed requests/responses and centralized error mapping. Base URLs come from `import.meta.env.VITE_*` variables, never hard-coded.
- **Types** (`src/types/`) hold shared domain models.
- Introduce a new layer or abstraction only when it removes real duplication or coupling.

### Vue & TypeScript
- Typed `defineProps<T>()`, `defineEmits<T>()`, `defineModel()` for `v-model`.
- No `any`; prefer explicit interfaces and narrow types; handle `null`/`undefined` explicitly.
- Keep templates declarative; move non-trivial expressions into `computed`.
- Use `@/` imports; keep components small and single-purpose.

### Quasar & UI
- Prefer Quasar components (`q-table`, `q-card`, `q-form`, `q-input`, `q-select`, `q-dialog`…), plugins (`Notify`, `Loading`, `Dialog` — register new ones in `src/main.ts`) and utility classes (`q-pa-*`, `q-gutter-*`, `row`, `col-*`, `text-h*`) over custom CSS.
- Use theme colors (`primary`, `secondary`, `accent`, `positive`, `negative`…) instead of hard-coded values; scoped styles only when utilities aren't enough.
- Responsive, mobile-first: Quasar grid breakpoints and `$q.screen`; no horizontal scroll; touch-friendly targets.
- Accessible: `aria-label` on icon-only buttons, labelled form fields, visible focus, logical heading order, sufficient contrast.
- Keep UI patterns consistent with existing pages (button hierarchy, spacing, cards, dialogs, wording).

### Design system
Pokémon-inspired palette tuned to WCAG 2.2 AA. The values live in `src/css/quasar-variables.sass` (single source of truth) — never hard-code hex values in components; use Quasar color props/classes (`color="primary"`, `text-secondary`, `bg-accent`).

#### Colors

| Token | Hex | Text on it | Contrast | Use for |
|---|---|---|---|---|
| `primary` | `#DC0A2D` (Pokédex red) | white | ≈5.1:1 | Header, primary CTA, active navigation, links |
| `secondary` | `#3B4CCA` (Pokémon blue) | white | ≈6.8:1 | Secondary actions, tabs, chips, selected states |
| `accent` | `#FFCB05` (Pokémon yellow) | `#1D1D1D` only | ≈11:1 | Highlights, badges, focus ring — never as text on white |
| `dark` | `#1D1D1D` | white | — | Primary text color, dark surfaces |
| `dark-page` | `#121212` | — | — | Dark-mode page background |
| `positive` | `#1B7F37` | white | ≈5.1:1 | Success (e.g. "Saved") |
| `negative` | `#C10015` | white | ≈6.4:1 | Errors, destructive actions |
| `info` | `#0277BD` | white | ≈4.9:1 | Informational messages |
| `warning` | `#F2C037` | `#1D1D1D` only | ≈10:1 | Warnings |

Neutrals: page background `#F5F5F7`, surfaces/cards white, borders `grey-4`, secondary text `grey-8`. Don't use `grey-6` or lighter for text.

Rules:
- One `primary` (unelevated) button per screen; secondary actions use `secondary` outline/flat buttons; tertiary actions use flat grey buttons.
- Never put white text on `accent` or `warning` — use `text-dark`.
- Never convey state by color alone; pair it with an icon or label.

#### Typography
- **Headings:** Poppins (600/700). **Body & UI:** Inter (400/500/600). Both self-hosted via `@fontsource/poppins` and `@fontsource/inter` (no external font CDN, works offline in Docker).
- Body font is set with `$typography-font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif`; Poppins is applied to `.text-h1`–`.text-h6` in `src/css/app.scss`.
- Use Quasar's typography classes — no custom font sizes:

| Element | Class | Size |
|---|---|---|
| Page title | `text-h4` (`text-h5` on xs) | 2.125rem / 1.5rem |
| Section title | `text-h5` | 1.5rem |
| Card title / Pokémon name | `text-h6` | 1.25rem |
| Labels, supporting info | `text-subtitle1` / `text-subtitle2` | 1rem / 0.875rem |
| Body text (descriptions) | `text-body1` | 1rem, max ~70ch line length |
| Table cells, dense lists | `text-body2` | 0.875rem |
| Metadata (#ID, units) | `text-caption` | 0.75rem |

- Numbers (stats, weight, height, IDs) use tabular digits via the `.text-tabular` class (`font-variant-numeric: tabular-nums`); format IDs zero-padded (`#0025`) and always show units (`6.9 kg`, `0.7 m`).
- Sentence case for labels and buttons; use `no-caps` on buttons (no all-caps text).

### API, async state, validation & errors
- Every async view handles **loading** (`q-skeleton`, `q-inner-loading`, `:loading` on buttons), **empty**, and **error** states.
- Show user-facing feedback with `Notify` for success/failure; don't swallow errors silently and don't expose raw error details to users.
- Disable or guard actions while requests are in flight to avoid duplicate submissions; cancel or ignore stale responses when inputs change quickly.
- Forms: `q-form` with `:rules` for field validation, validate before submit, show clear inline messages, preserve user input on failure.

### Testing
- Test stores, composables, services and utilities as plain units; mock HTTP at the service boundary.
- When mounting components that use Quasar, install it in the test:
  ```ts
  import { Quasar } from 'quasar'
  mount(MyComponent, { global: { plugins: [Quasar] } })
  ```
- Test behavior (rendered output, emitted events, store calls), not implementation details.
