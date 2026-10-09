<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { EvolutionStage } from '@/types/pokemon'
import { formatPokedexId, formatPokemonName } from '@/utils/format'

defineOptions({ name: 'EvolutionNode' })

const props = defineProps<{
  stage: EvolutionStage
  currentId: number
  linkFor: (id: number) => RouteLocationRaw
  vertical: boolean
}>()

const displayName = computed(() => formatPokemonName(props.stage.name))
const isCurrent = computed(() => props.stage.id === props.currentId)
</script>

<template>
  <li class="evolution-node" :class="{ 'evolution-node--vertical': vertical }">
    <div
      v-if="isCurrent"
      class="evolution-node__stage evolution-node__stage--current bg-primary text-white"
      aria-current="page"
      data-test="evolution-current"
    >
      <span class="text-caption text-tabular">{{ formatPokedexId(stage.id) }}</span>
      <span class="text-weight-bold">{{ displayName }}</span>
      <span class="text-caption row items-center no-wrap">
        <q-icon name="place" size="14px" class="q-mr-xs" aria-hidden="true" />
        Viewing
      </span>
    </div>
    <q-btn
      v-else
      outline
      no-caps
      color="secondary"
      class="evolution-node__stage"
      :to="linkFor(stage.id)"
      data-test="evolution-link"
    >
      <span class="column items-center">
        <span class="text-caption text-tabular text-grey-8">{{ formatPokedexId(stage.id) }}</span>
        <span class="text-weight-medium">{{ displayName }}</span>
      </span>
    </q-btn>

    <template v-if="stage.evolvesTo.length">
      <q-icon
        :name="vertical ? 'arrow_downward' : 'arrow_forward'"
        size="20px"
        color="grey-7"
        class="evolution-node__arrow"
        aria-hidden="true"
      />
      <ul class="evolution-node__children" :aria-label="`Evolutions of ${displayName}`">
        <EvolutionNode
          v-for="child in stage.evolvesTo"
          :key="child.id"
          :stage="child"
          :current-id="currentId"
          :link-for="linkFor"
          :vertical="vertical"
        />
      </ul>
    </template>
  </li>
</template>

<style scoped>
.evolution-node {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.evolution-node--vertical {
  flex-direction: column;
}

.evolution-node__children {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.evolution-node--vertical > .evolution-node__children {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}

.evolution-node__stage {
  min-width: 120px;
  min-height: 56px;
  border-radius: 8px;
  text-align: center;
}

.evolution-node__stage--current {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
}

.evolution-node__arrow {
  flex-shrink: 0;
}
</style>
