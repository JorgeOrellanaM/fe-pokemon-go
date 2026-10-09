<script setup lang="ts">
import { watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import PokemonCard from '@/components/pokemon/PokemonCard.vue'
import PokemonPagedGrid from '@/components/pokemon/PokemonPagedGrid.vue'
import SyncPokemonButton from '@/components/pokemon/SyncPokemonButton.vue'
import { usePagedResource } from '@/composables/usePagedResource'
import { localEntryLink, usePokemonSync } from '@/composables/usePokemonSync'
import { useRoutePaging } from '@/composables/useRoutePaging'
import { pokemonService } from '@/services/pokemonService'
import { formatPokemonName } from '@/utils/format'

const { data, loading, error, load, retry } = usePagedResource(pokemonService.list)
const { pageRequest, pagingQuery, currentPage, pageSize, normalizeQuery } = useRoutePaging()
const { sync, isSynced, isSyncing } = usePokemonSync()

// The URL is the single source of truth for paging (shareable, back/forward friendly).
watch(
  () => [pageRequest.value.page, pageRequest.value.size] as const,
  () => {
    normalizeQuery()
    void load(pageRequest.value)
  },
  { immediate: true },
)

// Details links carry the catalog paging so "Back" returns to this page.
function detailsLink(id: number): RouteLocationRaw {
  return { name: 'pokemon-details', params: { id: String(id) }, query: pagingQuery.value }
}
</script>

<template>
  <q-page padding>
    <div class="catalog q-mx-auto">
      <header class="q-mb-md">
        <h1 class="q-my-none" :class="$q.screen.xs ? 'text-h5' : 'text-h4'">Pokédex</h1>
        <p class="text-subtitle1 text-grey-8 q-mb-none">
          Browse every Pokémon with its sprite, category, weight and abilities.
        </p>
      </header>

      <PokemonPagedGrid
        v-model:page="currentPage"
        v-model:size="pageSize"
        :data="data"
        :loading="loading"
        :error="error"
        list-label="Pokémon list"
        error-title="We couldn't load the Pokédex"
        @retry="retry"
      >
        <template #card="{ pokemon }">
          <PokemonCard :pokemon="pokemon" :to="detailsLink(pokemon.id)">
            <template #actions>
              <SyncPokemonButton
                :pokemon-name="formatPokemonName(pokemon.name)"
                :synced="isSynced(pokemon.id)"
                :syncing="isSyncing(pokemon.id)"
                :to="localEntryLink(pokemon.id)"
                @sync="sync(pokemon.id, pokemon.name)"
              />
            </template>
          </PokemonCard>
        </template>
        <template #empty>
          <EmptyState
            icon="catching_pokemon"
            title="No Pokémon found"
            message="The catalog is empty right now. Please check back later."
          />
        </template>
      </PokemonPagedGrid>
    </div>
  </q-page>
</template>

<style scoped>
.catalog {
  max-width: 1440px;
}
</style>
