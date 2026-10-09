<script setup lang="ts">
import { watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import LocalPokemonFields from '@/components/pokemon/LocalPokemonFields.vue'
import PokemonCard from '@/components/pokemon/PokemonCard.vue'
import PokemonPagedGrid from '@/components/pokemon/PokemonPagedGrid.vue'
import { usePagedResource } from '@/composables/usePagedResource'
import { useRoutePaging } from '@/composables/useRoutePaging'
import { localPokemonService } from '@/services/localPokemonService'
import { useCollectionStore } from '@/stores/collection'

const { data, loading, error, load, retry } = usePagedResource(localPokemonService.list)
const { pageRequest, pagingQuery, currentPage, pageSize, normalizeQuery } = useRoutePaging()
const collection = useCollectionStore()

watch(
  () => [pageRequest.value.page, pageRequest.value.size] as const,
  () => {
    normalizeQuery()
    void load(pageRequest.value)
  },
  { immediate: true },
)

// Everything listed here is synced: let the catalog and details pages know.
watch(data, (page) => {
  if (page) collection.markSynced(page.items.map((pokemon) => pokemon.id))
})

// Entry links carry the collection paging so "Back" returns to this page.
function entryLink(id: number): RouteLocationRaw {
  return { name: 'local-pokemon', params: { id: String(id) }, query: pagingQuery.value }
}
</script>

<template>
  <q-page padding>
    <div class="collection q-mx-auto">
      <header class="q-mb-md">
        <h1 class="q-my-none" :class="$q.screen.xs ? 'text-h5' : 'text-h4'">My collection</h1>
        <p class="text-subtitle1 text-grey-8 q-mb-none">
          Pokémon saved to your local collection, with your own names, regions and tags.
        </p>
      </header>

      <PokemonPagedGrid
        v-model:page="currentPage"
        v-model:size="pageSize"
        :data="data"
        :loading="loading"
        :error="error"
        list-label="Collection list"
        error-title="We couldn't load your collection"
        @retry="retry"
      >
        <template #card="{ pokemon }">
          <PokemonCard :pokemon="pokemon" :to="entryLink(pokemon.id)">
            <template #extra>
              <LocalPokemonFields :pokemon="pokemon" />
            </template>
          </PokemonCard>
        </template>
        <template #empty>
          <EmptyState
            icon="collections_bookmark"
            title="Your collection is empty"
            message="Add Pokémon from the Pokédex to save them here and give them your own details."
          >
            <template #actions>
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="catching_pokemon"
                label="Browse the Pokédex"
                :to="{ name: 'pokemon-catalog' }"
              />
            </template>
          </EmptyState>
        </template>
      </PokemonPagedGrid>
    </div>
  </q-page>
</template>

<style scoped>
.collection {
  max-width: 1440px;
}
</style>
