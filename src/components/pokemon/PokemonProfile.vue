<script setup lang="ts">
import { computed } from 'vue'
import PokemonImage from '@/components/pokemon/PokemonImage.vue'
import type { PokemonDetails } from '@/types/pokemon'
import { formatFlavorText, formatPokedexId, formatPokemonName, formatSlug } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    pokemon: PokemonDetails
    /** Rendered artwork size in px. */
    imageSize?: number
  }>(),
  { imageSize: 240 },
)

const displayName = computed(() => formatPokemonName(props.pokemon.name))
const types = computed(() => props.pokemon.types.map(formatSlug))
const description = computed(() => formatFlavorText(props.pokemon.description))
</script>

<template>
  <div class="column items-center text-center q-gutter-y-sm">
    <PokemonImage
      :src="pokemon.imageUrl"
      :alt="`Official artwork of ${displayName}`"
      :placeholder-label="`No image available for ${displayName}`"
      :size="imageSize"
      :lazy="false"
    />

    <div>
      <div class="text-subtitle2 text-grey-8 text-tabular">{{ formatPokedexId(pokemon.id) }}</div>
      <h1 class="q-my-none" :class="$q.screen.xs ? 'text-h5' : 'text-h4'" data-test="name">
        {{ displayName }}
      </h1>
      <div v-if="pokemon.category" class="text-subtitle1 text-grey-8" data-test="category">
        {{ pokemon.category }}
      </div>
      <div v-else class="text-subtitle1 text-grey-8 text-italic" data-test="category">
        Category unknown
      </div>
    </div>

    <ul
      v-if="types.length"
      class="pokemon-profile__types row justify-center q-gutter-xs"
      aria-label="Types"
      data-test="types"
    >
      <li v-for="(type, index) in types" :key="type">
        <q-chip
          :color="index === 0 ? 'secondary' : undefined"
          :text-color="index === 0 ? 'white' : 'secondary'"
          :outline="index !== 0"
          class="q-ma-none"
          :ripple="false"
        >
          {{ type }}
        </q-chip>
      </li>
    </ul>

    <section class="full-width text-left q-pt-sm" aria-labelledby="pokemon-description-heading">
      <h2 id="pokemon-description-heading" class="text-h6 q-my-none">Description</h2>
      <p
        v-if="description"
        class="text-body1 q-mt-xs q-mb-none pokemon-profile__description"
        data-test="description"
      >
        {{ description }}
      </p>
      <p
        v-else
        class="text-body1 text-grey-8 text-italic q-mt-xs q-mb-none"
        data-test="description"
      >
        No description available.
      </p>
    </section>
  </div>
</template>

<style scoped>
.pokemon-profile__types {
  list-style: none;
  padding: 0;
  margin-top: 0;
}

.pokemon-profile__description {
  max-width: 70ch;
}
</style>
