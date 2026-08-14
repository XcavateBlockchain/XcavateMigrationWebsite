<script setup lang="ts">
import ModalShell from './ModalShell.vue'
import { shortAddress } from '../lib/polkadot'

defineProps<{
  fromAddress: string
  toAddress: string
  copied: boolean
}>()

defineEmits<{ close: []; copy: [] }>()
</script>

<template>
  <ModalShell labelled-by="success-title" @close="$emit('close')">
    <div class="modal__centered">
      <div class="category-disc">
        <img src="/category-tick.png" alt="" />
      </div>
      <span id="success-title" class="modal__title">Migration registered</span>
      <p class="modal__body-text">
        {{ shortAddress(fromAddress) }} is now linked to {{ shortAddress(toAddress) }}
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--primary btn--block" @click="$emit('close')">
          Done
        </button>
      </div>
    </div>
  </ModalShell>
</template>
