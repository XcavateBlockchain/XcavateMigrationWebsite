<script setup lang="ts">
defineProps<{
  step: number
  title: string
  done?: boolean
  locked?: boolean
  lockedHint?: string
}>()
</script>

<template>
  <section class="card" :class="{ 'card--locked': locked }">
    <div class="card__head">
      <span class="card__step" :class="{ 'card__step--done': done }">
        <svg v-if="done" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M2.5 7.5 L5.5 10.5 L11.5 3.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <template v-else>{{ step }}</template>
      </span>
      <h2 class="card__title">{{ title }}</h2>
      <slot name="head-end" />
    </div>
    <p v-if="locked" class="card__hint">{{ lockedHint }}</p>
    <div v-else class="card__body">
      <slot />
    </div>
  </section>
</template>
