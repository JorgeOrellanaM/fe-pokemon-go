<script setup lang="ts">
import { ref } from 'vue'

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>Pokémon Go</q-toolbar-title>
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
