import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { LOGIN_ROUTE, REGISTER_ROUTE, createAuthGuard } from '@/router/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'pokemon-catalog',
          component: () => import('@/views/PokemonCatalogView.vue'),
        },
        {
          // The id is validated by the view so invalid values get a helpful message.
          path: 'pokemon/:id',
          name: 'pokemon-details',
          component: () => import('@/views/PokemonDetailsView.vue'),
        },
        {
          path: 'collection',
          name: 'local-collection',
          component: () => import('@/views/LocalCollectionView.vue'),
        },
        {
          // The id is validated by the view, like the details page.
          path: 'collection/:id',
          name: 'local-pokemon',
          component: () => import('@/views/LocalPokemonView.vue'),
        },
        {
          // Saving needs a login (PUT /local-pokemon/{id} is protected).
          path: 'collection/:id/edit',
          name: 'local-pokemon-edit',
          component: () => import('@/views/LocalPokemonEditView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'login',
          name: LOGIN_ROUTE,
          component: () => import('@/views/LoginView.vue'),
          meta: { guestOnly: true },
        },
        {
          path: 'register',
          name: REGISTER_ROUTE,
          component: () => import('@/views/RegisterView.vue'),
          meta: { guestOnly: true },
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/AboutView.vue'),
        },
      ],
    },
  ],
  // Restore the position on back/forward; otherwise start at the top (e.g. on page change).
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach(createAuthGuard(router))

export default router
