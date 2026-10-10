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
  /** Adding needs a login: the button says so (the parent sends the user to log in). */
  loginRequired?: boolean
}>()

const emit = defineEmits<{ sync: [] }>()
const router = useRouter()

const label = computed(() => (props.synced ? 'In collection' : 'Add to collection'))
const ariaLabel = computed(() => {
  if (props.synced) return `${props.pokemonName} is in your collection. View entry`
  if (props.loginRequired) return `Log in to add ${props.pokemonName} to your collection`
  return `Add ${props.pokemonName} to your collection`
})
const icon = computed(() => {
  if (props.synced) return 'check_circle'
  return props.loginRequired ? 'lock' : 'bookmark_add'
})

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
    :icon="icon"
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
    <q-tooltip v-if="loginRequired && !synced">Log in to add to your collection</q-tooltip>
  </q-btn>
</template>
