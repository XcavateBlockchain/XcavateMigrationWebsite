<script setup lang="ts">
defineProps<{
  label: string
  value: string
}>()
</script>

<template>
  <div class="meta__row">
    <span class="meta__label">{{ label }}</span>
    <span class="meta__value">{{ value }}</span>
  </div>
</template>
