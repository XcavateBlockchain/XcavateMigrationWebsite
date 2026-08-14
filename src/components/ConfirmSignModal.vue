<script setup lang="ts">
import { computed } from 'vue'
import DsIcon from './DsIcon.vue'
import ModalShell from './ModalShell.vue'
import { shortAddress, type PolkadotAccount } from '../lib/polkadot'

const props = defineProps<{
  account: PolkadotAccount
  solanaAddress: string
  /** The canonical request body the signature authorises. */
  payload: string
  status: 'idle' | 'signing' | 'submitting'
  error: string
}>()

defineEmits<{ confirm: []; cancel: [] }>()

const pending = computed(() => props.status !== 'idle')
</script>

<template>
  <ModalShell labelled-by="sign-title" :dismissible="!pending" @close="$emit('cancel')">
    <div class="panel__titles">
      <span id="sign-title" class="modal__title">Confirm migration</span>
      <span class="modal__subtitle">migration.xcavate.io · polkadot.js</span>
    </div>

    <div class="identity">
      <span class="avatar"><DsIcon name="arrow-right" :size="20" /></span>
      <span class="identity__text">
        <span class="identity__name">{{ account.name || 'Unnamed account' }}</span>
        <span class="identity__address">
          {{ shortAddress(account.address) }} → {{ shortAddress(solanaAddress) }}
        </span>
      </span>
    </div>

    <div class="payload">{{ payload }}</div>

    <p class="field__hint">
      Your wallet will show a hashed form of this request. Signing is free and nothing leaves your
      wallet. We need the signature for account verification.
    </p>

    <div v-if="error" class="banner banner--error">{{ error }}</div>

    <div v-if="status === 'idle'" class="modal__actions modal__actions--split">
      <button type="button" class="btn btn--secondary" @click="$emit('cancel')">Cancel</button>
      <button type="button" class="btn btn--primary" @click="$emit('confirm')">Sign</button>
    </div>
    <div v-else class="progress-note" style="justify-content: center; padding: 12px 0">
      <span class="spinner spinner--lg" aria-hidden="true" />
      <span>{{ status === 'signing' ? 'Waiting for signature…' : 'Registering your migration…' }}</span>
    </div>
  </ModalShell>
</template>
