<script setup lang="ts">
const props = defineProps<{ chain: 'polkadot' | 'solana' }>()

const src = () => (props.chain === 'polkadot' ? '/polkadot-logo.png' : '/solana-logo.png')
</script>

<template>
  <img class="chain-mark" :src="src()" alt="" aria-hidden="true" />
</template>
