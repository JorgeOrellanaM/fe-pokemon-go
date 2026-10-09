<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import PokemonImage from '@/components/pokemon/PokemonImage.vue'
import type { PokemonSummary } from '@/types/pokemon'
import { formatPokedexId, formatPokemonName, formatSlug, formatWeightKg } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    pokemon: PokemonSummary
    /** When set, the whole card links to this location (e.g. the details page). */
    to?: RouteLocationRaw
    /** Heading element for the name: 'h1' when the card is the page subject. */
    headingTag?: 'h1' | 'h2' | 'h3'
  }>(),
  { to: undefined, headingTag: 'h2' },
)

const displayName = computed(() => formatPokemonName(props.pokemon.name))
const headingId = computed(() => `pokemon-${props.pokemon.id}-name`)
const abilities = computed(() =>
  props.pokemon.abilities.map((ability) => ({
    key: `${ability.name}-${ability.hidden}`,
    label: formatSlug(ability.name),
    hidden: ability.hidden,
  })),
)
</script>

<template>
  <q-card
    tag="article"
    flat
    bordered
    class="pokemon-card full-height column"
    :class="{ 'pokemon-card--link': to }"
    :aria-labelledby="headingId"
  >
    <q-card-section class="row items-center no-wrap">
      <PokemonImage
        :src="pokemon.spriteUrl"
        :alt="`${displayName} sprite`"
        :placeholder-label="`No sprite available for ${displayName}`"
      />

      <div class="col q-ml-md min-width-0">
        <div class="text-caption text-grey-8 text-tabular">{{ formatPokedexId(pokemon.id) }}</div>
        <component
          :is="headingTag"
          :id="headingId"
          class="text-h6 q-my-none ellipsis"
          :title="displayName"
        >
          <router-link v-if="to" :to="to" class="pokemon-card__link" data-test="card-link">
            {{ displayName }}
          </router-link>
          <template v-else>{{ displayName }}</template>
        </component>
        <div v-if="pokemon.category" class="text-body2 text-grey-8" data-test="category">
          {{ pokemon.category }}
        </div>
        <div v-else class="text-body2 text-grey-8 text-italic" data-test="category">
          Category unknown
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="col">
      <dl class="pokemon-card__facts q-my-none">
        <dt class="text-caption text-grey-8">Weight</dt>
        <dd class="text-body2 text-tabular q-mb-sm" data-test="weight">
          {{ formatWeightKg(pokemon.weightKg) }}
        </dd>

        <dt class="text-caption text-grey-8">Abilities</dt>
        <dd>
          <ul
            v-if="abilities.length"
            class="pokemon-card__abilities row q-gutter-xs"
            data-test="abilities"
          >
            <li v-for="ability in abilities" :key="ability.key">
              <q-chip
                v-if="ability.hidden"
                dense
                outline
                color="secondary"
                icon="visibility_off"
                class="q-ma-none"
                :ripple="false"
              >
                {{ ability.label }}&nbsp;<span class="text-caption">(hidden)</span>
              </q-chip>
              <q-chip
                v-else
                dense
                color="grey-3"
                text-color="dark"
                class="q-ma-none"
                :ripple="false"
              >
                {{ ability.label }}
              </q-chip>
            </li>
          </ul>
          <span v-else class="text-body2 text-grey-8 text-italic">No abilities listed</span>
        </dd>
      </dl>
    </q-card-section>

    <!-- Extra facts, e.g. the custom fields of a collection entry. -->
    <template v-if="$slots.extra">
      <q-separator />
      <q-card-section>
        <slot name="extra" />
      </q-card-section>
    </template>

    <!-- Raised above the stretched link so its controls stay clickable. -->
    <div v-if="$slots.actions" class="pokemon-card__actions">
      <q-separator />
      <q-card-actions align="right">
        <slot name="actions" />
      </q-card-actions>
    </div>
  </q-card>
</template>

<style scoped>
.pokemon-card {
  position: relative;
  transition: box-shadow 0.2s ease;
}

.pokemon-card__actions {
  position: relative;
  z-index: 1;
}

.pokemon-card__link {
  color: inherit;
  text-decoration: none;
}

/* Stretched link: the whole card is clickable while keeping one tab stop. */
.pokemon-card__link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.pokemon-card--link:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
}

.pokemon-card--link:hover .pokemon-card__link {
  text-decoration: underline;
}

.pokemon-card__link:focus-visible {
  outline: none;
}

.pokemon-card--link:has(.pokemon-card__link:focus-visible) {
  outline: 3px solid var(--q-secondary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .pokemon-card {
    transition: none;
  }
}

.min-width-0 {
  min-width: 0;
}

.pokemon-card__facts dd {
  margin-left: 0;
}

.pokemon-card__abilities {
  list-style: none;
  padding: 0;
  margin-top: 0;
  margin-bottom: 0;
}
</style>
