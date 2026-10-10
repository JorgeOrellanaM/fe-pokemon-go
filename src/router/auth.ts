import { watch } from 'vue'
import { Notify } from 'quasar'
import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { setAuthHandlers } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/utils/authForm'

declare module 'vue-router' {
  interface RouteMeta {
    /** Only for logged-in users: others are sent to the login page and brought back after. */
    requiresAuth?: boolean
    /** Only for logged-out users (login, register): others are sent on to `?redirect` or home. */
    guestOnly?: boolean
  }
}

export const LOGIN_ROUTE = 'login'
export const REGISTER_ROUTE = 'register'

/** The login page, set to come back to `returnTo` (a path of this app) afterwards. */
export function loginLocation(returnTo?: string): RouteLocationRaw {
  return returnTo && returnTo !== '/'
    ? { name: LOGIN_ROUTE, query: { redirect: returnTo } }
    : { name: LOGIN_ROUTE }
}

/**
 * Global guard: restores the session once (after a reload), keeps logged-out users away from
 * `requiresAuth` routes and logged-in users away from `guestOnly` ones.
 */
export function createAuthGuard(router: Router) {
  return async (to: RouteLocationNormalized): Promise<true | RouteLocationRaw> => {
    const auth = useAuthStore()
    await auth.restore()
    const loggedIn = auth.hasValidSession()

    if (to.meta.requiresAuth && !loggedIn) return loginLocation(to.fullPath)

    if (to.meta.guestOnly && loggedIn) {
      const target = safeRedirect(to.query.redirect)
      // Never bounce between guest pages (e.g. `/login?redirect=/register`).
      return router.resolve(target).meta.guestOnly ? '/' : target
    }
    return true
  }
}

/**
 * Connects the HTTP client to the session: sends the token, and on a 401 (outside login)
 * or once the token expires, forgets it and sends the user to the login page, set to come
 * back to where they were. Call it once, after `app.use(pinia)`.
 */
export function installSessionHandlers(router: Router): void {
  const auth = useAuthStore()

  function redirectToLogin(message: string) {
    const current = router.currentRoute.value
    // Not before the first navigation (the guard decides then), nor from login/register itself.
    if (current.matched.length === 0 || current.meta.guestOnly) return
    Notify.create({ type: 'warning', message, icon: 'lock_clock' })
    void router.push(loginLocation(current.fullPath))
  }

  setAuthHandlers({
    getAuthorization: () => auth.authorizationHeader(),
    onUnauthorized: () => {
      if (auth.isAuthenticated) {
        auth.handleUnauthorized() // the watcher below redirects
      } else if (!auth.restoring) {
        // A protected call without a session (the UI normally prevents this).
        redirectToLogin('Please log in to continue.')
      }
    },
  })

  // Sync: react within the call that ended the session, while `restoring` is still accurate.
  watch(
    () => auth.isAuthenticated,
    (loggedIn) => {
      if (loggedIn || auth.endReason !== 'expired' || auth.restoring) return
      redirectToLogin('Your session has expired. Please log in again.')
    },
    { flush: 'sync' },
  )
}
