<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import EvolutionNode from '@/components/pokemon/EvolutionNode.vue'
import type { EvolutionStage } from '@/types/pokemon'

withDefaults(
  defineProps<{
    /** Root of the chain (the base form), not necessarily the current Pokémon. */
    chain: EvolutionStage
    currentId: number
    /** Builds the link to a stage's details page (keeps routing out of this component). */
    linkFor: (id: number) => RouteLocationRaw
    /** Stack stages top-to-bottom (small screens) instead of left-to-right. */
    vertical?: boolean
  }>(),
  { vertical: false },
)
</script>

<template>
  <div class="evolution-chain">
    <ul class="evolution-chain__root" :class="{ 'evolution-chain__root--vertical': vertical }">
      <EvolutionNode
        :stage="chain"
        :current-id="currentId"
        :link-for="linkFor"
        :vertical="vertical"
      />
    </ul>
    <p
      v-if="chain.evolvesTo.length === 0"
      class="text-body2 text-grey-8 q-mt-md q-mb-none"
      data-test="no-evolutions"
    >
      This Pokémon does not evolve.
    </p>
  </div>
</template>

<style scoped>
.evolution-chain {
  overflow-x: auto;
}

.evolution-chain__root {
  display: flex;
  list-style: none;
  padding: 4px;
  margin: 0;
}

.evolution-chain__root--vertical {
  justify-content: center;
}
</style>
