# fe-pokemon-go

This template should help get you started developing with Vue 3 in Vite.

## Authentication

Browsing the Pokédex and the collection is public. Adding a Pokémon to the collection (Sync)
and editing its details need a login (see [AUTH.md](AUTH.md) for the backend contract).

- **Demo account:** `demo` / `Pokemon123!` (the login page can fill it in), or create one at `/register`.
  Registering does not log you in: you are sent to the login page with your username filled in.
- **Session:** the JWT is kept in `sessionStorage` (never `localStorage`) and restored on reload
  with `GET /auth/me`. It is dropped when it expires or when the API answers `401`, and the
  user is sent to the login page, then back to where they were (`?redirect=`).
- **Code:** `src/stores/auth.ts` (session state), `src/services/authService.ts` (endpoints),
  `src/router/auth.ts` (route guard, token attachment, 401/expiry handling),
  `src/utils/authForm.ts` (client-side validation mirroring the backend rules),
  `src/views/LoginView.vue` and `src/views/RegisterView.vue`.
- Routes with `meta.requiresAuth` (the edit page) need a login; `meta.guestOnly` (login,
  register) redirect logged-in users away.
- In development, Vite proxies `/api` to `http://localhost:8080` (override with
  `VITE_API_PROXY_TARGET`), since the backend has no CORS configuration.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
