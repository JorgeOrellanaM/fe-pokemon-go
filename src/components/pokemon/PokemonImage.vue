<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string | null
    alt: string
    /** Rendered width/height in px (the box is always square). */
    size?: number
    /** Accessible label for the placeholder shown when there is no usable image. */
    placeholderLabel: string
    lazy?: boolean
  }>(),
  { size: 96, lazy: true },
)

// Fall back to a placeholder when there is no image or it fails to load.
const failed = ref(false)
watch(
  () => props.src,
  () => (failed.value = false),
)
const showImage = computed(() => Boolean(props.src) && !failed.value)
// Square box that shrinks with its container (max-width) instead of overflowing.
const boxStyle = computed(() => ({ width: `${props.size}px`, aspectRatio: '1 / 1' }))
const iconSize = computed(() => `${Math.round(props.size * 0.4)}px`)
</script>

<template>
  <div class="pokemon-image flex flex-center bg-grey-2 rounded-borders" :style="boxStyle">
    <img
      v-if="showImage"
      :src="src ?? undefined"
      :alt="alt"
      :width="size"
      :height="size"
      :loading="lazy ? 'lazy' : 'eager'"
      decoding="async"
      class="pokemon-image__img"
      data-test="image"
      @error="failed = true"
    />
    <q-icon
      v-else
      name="image_not_supported"
      :size="iconSize"
      color="grey-7"
      role="img"
      :aria-label="placeholderLabel"
      data-test="image-placeholder"
    />
  </div>
</template>

<style scoped>
.pokemon-image {
  flex-shrink: 0;
  max-width: 100%;
}

.pokemon-image__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
