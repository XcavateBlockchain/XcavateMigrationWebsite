<script setup lang="ts">
import ModalShell from './ModalShell.vue'

defineEmits<{ close: [] }>()
</script>

<template>
  <ModalShell labelled-by="help-title" @close="$emit('close')">
    <span id="help-title" class="modal__title">Get the polkadot.js extension</span>
    <ol class="help-steps">
      <li>
        Install the
        <a href="https://polkadot.js.org/extension/" target="_blank" rel="noopener">
          polkadot.js extension
        </a>
        from your browser's store.
      </li>
      <li>Import the account that holds your realXmarket tokens.</li>
      <li>Refresh this page and select CONNECT WALLET.</li>
    </ol>
    <p class="field__hint">
      Your keys stay in the extension. This page only asks it for a signature.
    </p>
    <button type="button" class="btn btn--primary btn--block" @click="$emit('close')">Close</button>
  </ModalShell>
</template>
