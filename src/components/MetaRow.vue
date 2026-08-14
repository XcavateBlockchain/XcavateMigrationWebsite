<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    /** Addresses, hashes and IDs are set in Mona Sans, the wallet/ID face. */
    wide?: boolean
  }>(),
  { wide: false },
)
</script>

<template>
  <div class="meta__row">
    <span class="meta__label">{{ label }}</span>
    <span class="meta__value" :class="{ 'meta__value--wide': wide }">{{ value }}</span>
  </div>
</template>
