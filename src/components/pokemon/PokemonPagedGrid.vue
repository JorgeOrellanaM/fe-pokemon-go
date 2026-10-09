<script setup lang="ts" generic="T extends PokemonSummary">
import { computed } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PokemonCardSkeleton from '@/components/pokemon/PokemonCardSkeleton.vue'
import type { ApiRequestError } from '@/services/http'
import type { Page } from '@/types/api'
import type { PokemonSummary } from '@/types/pokemon'
import { formatCount } from '@/utils/format'
import { PAGE_SIZE_OPTIONS } from '@/utils/paging'

/**
 * Paged grid of Pokémon cards with the shared toolbar (range summary, page size), loading
 * skeletons, error / empty / out-of-range states and pagination. Pages render each card
 * through the `card` slot and their own empty state through the `empty` slot.
 */
const props = defineProps<{
  data: Page<T> | null
  loading: boolean
  error: ApiRequestError | null
  /** Accessible name of the list region, e.g. "Pokémon list". */
  listLabel: string
  errorTitle: string
}>()

const emit = defineEmits<{ retry: [] }>()

/** 1-based current page. */
const currentPage = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('size', { required: true })

defineSlots<{
  card(props: { pokemon: T }): unknown
  empty(): unknown
}>()

const items = computed(() => props.data?.items ?? [])
const totalPages = computed(() => props.data?.totalPages ?? 0)
const totalElements = computed(() => props.data?.totalElements ?? 0)
const isOutOfRange = computed(
  () => !!props.data && items.value.length === 0 && totalElements.value > 0,
)
const isEmpty = computed(() => !!props.data && totalElements.value === 0)
const showSkeleton = computed(() => props.loading && !props.error)
const skeletonCount = computed(() => Math.min(pageSize.value, 8))

const rangeSummary = computed(() => {
  if (!props.data || items.value.length === 0) return ''
  const first = props.data.page * props.data.size + 1
  const last = first + items.value.length - 1
  return `Showing ${formatCount(first)}–${formatCount(last)} of ${formatCount(totalElements.value)} Pokémon`
})
</script>

<template>
  <div>
    <div class="row items-center justify-between q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm text-body2 text-grey-8" aria-live="polite" data-test="summary">
        {{ loading ? 'Loading Pokémon…' : rangeSummary }}
      </div>
      <div class="col-auto">
        <q-select
          v-model="pageSize"
          :options="PAGE_SIZE_OPTIONS"
          label="Per page"
          dense
          outlined
          bg-color="white"
          options-dense
          class="paged-grid__size-select"
          :disable="loading"
        />
      </div>
    </div>

    <section :aria-label="listLabel" :aria-busy="loading">
      <div v-if="showSkeleton" class="row q-col-gutter-md" data-test="loading">
        <div v-for="n in skeletonCount" :key="n" class="col-12 col-sm-6 col-md-4 col-lg-3">
          <PokemonCardSkeleton />
        </div>
      </div>

      <q-card v-else-if="error" flat bordered>
        <ErrorState
          :title="errorTitle"
          :message="error.message"
          :error-id="error.errorId"
          :retryable="error.retryable"
          @retry="emit('retry')"
        >
          <template v-if="!error.retryable" #actions>
            <q-btn
              outline
              no-caps
              color="secondary"
              label="Back to first page"
              :to="{ query: {} }"
            />
          </template>
        </ErrorState>
      </q-card>

      <q-card v-else-if="isOutOfRange" flat bordered>
        <EmptyState
          title="This page doesn't exist"
          :message="`There are ${formatCount(totalPages)} pages with this page size.`"
        >
          <template #actions>
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Go to first page"
              @click="currentPage = 1"
            />
          </template>
        </EmptyState>
      </q-card>

      <q-card v-else-if="isEmpty" flat bordered>
        <slot name="empty" />
      </q-card>

      <div v-else role="list" class="row q-col-gutter-md" data-test="pokemon-list">
        <div
          v-for="pokemon in items"
          :key="pokemon.id"
          role="listitem"
          class="col-12 col-sm-6 col-md-4 col-lg-3"
        >
          <slot name="card" :pokemon="pokemon" />
        </div>
      </div>
    </section>

    <div v-if="totalPages > 1 && !error" class="row justify-center q-mt-lg">
      <q-pagination
        v-model="currentPage"
        :max="totalPages"
        :max-pages="$q.screen.xs ? 3 : 7"
        :boundary-numbers="!$q.screen.xs"
        :ellipses="!$q.screen.xs"
        :boundary-links="$q.screen.xs"
        direction-links
        :disable="loading"
        color="grey-8"
        active-color="primary"
        class="paged-grid__pagination"
      />
    </div>
  </div>
</template>

<style scoped>
.paged-grid__size-select {
  min-width: 120px;
}

/* Touch-friendly pagination targets (>= 44px). */
.paged-grid__pagination :deep(.q-btn) {
  min-width: 44px;
  min-height: 44px;
}
</style>
