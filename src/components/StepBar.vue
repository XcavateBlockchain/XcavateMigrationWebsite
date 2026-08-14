<script setup lang="ts">
import { computed } from 'vue'
import DsIcon from './DsIcon.vue'

const props = defineProps<{
  /** How many of the three steps are complete. */
  done: number
}>()

const LABELS = ['Connect Polkadot Wallet', 'Connect Solana Wallet', 'Sign & Migrate']

const steps = computed(() =>
  LABELS.map((label, i) => {
    const done = i < props.done
    return {
      n: String(i + 1),
      label,
      done,
      active: i === props.done,
      // The rule leading into a step is filled once the step before it is done.
      ruleDone: i > 0 && i - 1 < props.done,
      hasRule: i > 0,
    }
  }),
)
</script>

<template>
  <ol class="steps">
    <li v-for="step in steps" :key="step.n" class="steps__item">
      <span v-if="step.hasRule" class="steps__rule" :class="{ 'steps__rule--done': step.ruleDone }" />
      <span class="steps__label-group">
        <span
          class="steps__disc"
          :class="{ 'steps__disc--done': step.done, 'steps__disc--active': step.active }"
        >
          <DsIcon v-if="step.done" name="check" :size="16" />
          <template v-else>{{ step.n }}</template>
        </span>
        <span
          class="steps__label"
          :class="{ 'steps__label--done': step.done, 'steps__label--active': step.active }"
        >
          {{ step.label }}
        </span>
      </span>
    </li>
  </ol>
</template>
