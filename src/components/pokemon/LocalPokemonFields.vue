<script setup lang="ts">
import type { LocalPokemon } from '@/types/pokemon'

defineProps<{
  pokemon: Pick<LocalPokemon, 'localizedName' | 'region' | 'tags'>
}>()
</script>

<template>
  <dl class="local-fields q-my-none">
    <dt class="text-caption text-grey-8">Localized name</dt>
    <dd class="text-body2 q-mb-sm" data-test="localized-name">
      <template v-if="pokemon.localizedName">{{ pokemon.localizedName }}</template>
      <span v-else class="text-grey-8 text-italic">Not set</span>
    </dd>

    <dt class="text-caption text-grey-8">Region</dt>
    <dd class="text-body2 q-mb-sm" data-test="region">
      <template v-if="pokemon.region">{{ pokemon.region }}</template>
      <span v-else class="text-grey-8 text-italic">Not set</span>
    </dd>

    <dt class="text-caption text-grey-8">Tags</dt>
    <dd data-test="tags">
      <ul v-if="pokemon.tags.length" class="local-fields__tags row q-gutter-xs">
        <li v-for="tag in pokemon.tags" :key="tag">
          <q-chip dense outline color="secondary" icon="sell" class="q-ma-none" :ripple="false">
            {{ tag }}
          </q-chip>
        </li>
      </ul>
      <span v-else class="text-body2 text-grey-8 text-italic">No tags</span>
    </dd>
  </dl>
</template>

<style scoped>
.local-fields dd {
  margin-left: 0;
}

.local-fields__tags {
  list-style: none;
  padding: 0;
  margin-top: 0;
  margin-bottom: 0;
}
</style>
