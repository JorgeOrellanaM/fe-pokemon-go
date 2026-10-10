<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { Notify } from 'quasar'
import { LOGIN_ROUTE, loginLocation } from '@/router/auth'
import { useAuthStore } from '@/stores/auth'

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Come back to the current page after logging in (not from login/register themselves).
const loginLink = computed<RouteLocationRaw>(() =>
  route.meta.guestOnly ? loginLocation() : loginLocation(route.fullPath),
)

async function logout() {
  // Leave pages that need a login first; stay logged in if that navigation is cancelled
  // (e.g. the user chooses to keep unsaved changes).
  if (route.meta.requiresAuth) {
    const failure = await router.push({ name: 'pokemon-catalog' })
    if (failure) return
  }
  auth.logout()
  Notify.create({ type: 'info', message: 'You have been logged out.' })
}
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>Pokémon Go</q-toolbar-title>

        <q-btn
          v-if="auth.isAuthenticated"
          flat
          no-caps
          icon="account_circle"
          :label="$q.screen.gt.xs ? (auth.username ?? undefined) : undefined"
          :aria-label="`Account menu, logged in as ${auth.username}`"
          data-test="account-menu"
        >
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 200px">
              <q-item>
                <q-item-section>
                  <q-item-label caption>Logged in as</q-item-label>
                  <q-item-label class="text-weight-medium" data-test="account-username">
                    {{ auth.username }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item v-close-popup clickable data-test="logout" @click="logout">
                <q-item-section avatar><q-icon name="logout" aria-hidden="true" /></q-item-section>
                <q-item-section>Log out</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn
          v-else-if="route.name !== LOGIN_ROUTE"
          flat
          no-caps
          icon="login"
          label="Log in"
          :to="loginLink"
          data-test="login-link"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>Navigation</q-item-label>
        <q-item clickable :to="{ name: 'pokemon-catalog' }" exact>
          <q-item-section avatar><q-icon name="catching_pokemon" /></q-item-section>
          <q-item-section>Pokédex</q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'local-collection' }">
          <q-item-section avatar><q-icon name="collections_bookmark" /></q-item-section>
          <q-item-section>My collection</q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'about' }">
          <q-item-section avatar><q-icon name="info" /></q-item-section>
          <q-item-section>About</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
