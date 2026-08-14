<script setup lang="ts">
/**
 * The utility glyphs the design imports from the system's icon library
 * (Arrows, Controls, Files, Generic, Security, Shop). Drawn here in the
 * library's own register — single-weight outline, rounded caps, no fills,
 * `currentColor` throughout — on the library's 24px artboard.
 */
export type IconName =
  | 'check'
  | 'close'
  | 'copy'
  | 'arrow-right'
  | 'chevron-down'
  | 'lock'
  | 'wallet'
  | 'verified'
  | 'info'

withDefaults(defineProps<{ name: IconName; size?: number | string }>(), { size: 20 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-if="name === 'check'" d="M4.5 12.5 9.5 17.5 19.5 6.5" />

    <path v-else-if="name === 'close'" d="M6 6 18 18M18 6 6 18" />

    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
    </template>

    <path v-else-if="name === 'arrow-right'" d="M3.5 12h17m0 0-6.5-6.5M20.5 12 14 18.5" />

    <path v-else-if="name === 'chevron-down'" d="m6 9.5 6 6 6-6" />

    <template v-else-if="name === 'lock'">
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3" />
    </template>

    <template v-else-if="name === 'wallet'">
      <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6.5a3 3 0 0 1-3-3z" />
      <path d="M20 11h-3a1.5 1.5 0 0 0 0 3h3" />
    </template>

    <template v-else-if="name === 'verified'">
      <path d="M12 2.75 19.25 6v5.5c0 4.2-2.9 7.6-7.25 9.75C7.65 19.1 4.75 15.7 4.75 11.5V6z" />
      <path d="m8.75 12 2.25 2.25 4.25-4.5" />
    </template>

    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 11v5.5" />
      <path d="M12 7.75v.5" />
    </template>
  </svg>
</template>
