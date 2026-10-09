<script setup lang="ts">
import { computed } from 'vue'
import type { BaseStat } from '@/types/pokemon'
import { formatStatName } from '@/utils/format'

/** Base stats range from 0 to 255 (API contract). */
const MAX_STAT = 255

const props = defineProps<{ stats: BaseStat[] }>()

const rows = computed(() =>
  props.stats.map((stat) => ({
    key: stat.name,
    labelId: `stat-${stat.name}-label`,
    label: formatStatName(stat.name),
    value: stat.value,
    percent: Math.min(100, Math.max(0, (stat.value / MAX_STAT) * 100)),
  })),
)

const total = computed(() => props.stats.reduce((sum, stat) => sum + stat.value, 0))
</script>

<template>
  <div v-if="rows.length">
    <ul class="pokemon-stats q-pa-none q-ma-none">
      <li v-for="row in rows" :key="row.key" class="pokemon-stats__row" data-test="stat">
        <span :id="row.labelId" class="text-body2 text-grey-8">{{ row.label }}</span>
        <span class="text-body2 text-weight-medium text-tabular text-right">{{ row.value }}</span>
        <div
          class="pokemon-stats__track bg-grey-3"
          role="meter"
          :aria-labelledby="row.labelId"
          aria-valuemin="0"
          :aria-valuemax="MAX_STAT"
          :aria-valuenow="row.value"
          :aria-valuetext="`${row.value} out of ${MAX_STAT}`"
        >
          <div class="pokemon-stats__fill bg-secondary" :style="{ width: `${row.percent}%` }" />
        </div>
      </li>
    </ul>
    <p class="text-body2 text-grey-8 q-mt-md q-mb-none">
      Total
      <span class="text-weight-medium text-dark text-tabular" data-test="stat-total">{{
        total
      }}</span>
      <span class="text-caption"> · each stat ranges from 0 to {{ MAX_STAT }}</span>
    </p>
  </div>
  <p v-else class="text-body2 text-grey-8 text-italic q-mb-none">No base stats available.</p>
</template>

<style scoped>
.pokemon-stats {
  list-style: none;
}

.pokemon-stats__row {
  display: grid;
  grid-template-columns: minmax(7.5rem, auto) 2.5rem 1fr;
  align-items: center;
  column-gap: 12px;
  padding: 6px 0;
}

.pokemon-stats__track {
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
}

.pokemon-stats__fill {
  height: 100%;
  border-radius: inherit;
}
</style>
