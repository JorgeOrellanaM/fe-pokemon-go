<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  /** Display name, used to give the button context when several are on screen. */
  pokemonName: string
  synced: boolean
  syncing: boolean
  /** The local collection entry, opened once the Pokémon is synced. */
  to: RouteLocationRaw
}>()

const emit = defineEmits<{ sync: [] }>()
const router = useRouter()

const label = computed(() => (props.synced ? 'In collection' : 'Add to collection'))
const ariaLabel = computed(() =>
  props.synced
    ? `${props.pokemonName} is in your collection. View entry`
    : `Add ${props.pokemonName} to your collection`,
)

// One <button> for both states, so keyboard focus stays put when the sync completes.
function onClick() {
  if (props.synced) void router.push(props.to)
  else emit('sync')
}
</script>

<template>
  <q-btn
    no-caps
    :outline="!synced"
    :flat="synced"
    :color="synced ? 'positive' : 'secondary'"
    :icon="synced ? 'check_circle' : 'bookmark_add'"
    :label="label"
    :aria-label="ariaLabel"
    :loading="syncing"
    data-test="sync-button"
    @click="onClick"
  >
    <template #loading>
      <q-spinner size="1em" class="q-mr-sm" />
      Adding…
    </template>
  </q-btn>
</template>
