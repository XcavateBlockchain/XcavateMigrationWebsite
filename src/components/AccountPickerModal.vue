<script setup lang="ts">
import DsIcon from './DsIcon.vue'
import ModalShell from './ModalShell.vue'
import { shortAddress, type PolkadotAccount } from '../lib/polkadot'

defineProps<{
  accounts: PolkadotAccount[]
  loading: boolean
  /** Empty unless the extension is missing or exposes no accounts. */
  error: string
}>()

defineEmits<{ pick: [account: PolkadotAccount]; close: []; retry: []; help: [] }>()

function initialsOf(name: string | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '··'
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
</script>

<template>
  <ModalShell labelled-by="picker-title" @close="$emit('close')">
    <div class="modal__head">
      <div class="panel__titles">
        <span id="picker-title" class="modal__title">Select an account</span>
        <span class="modal__subtitle">via the polkadot.js extension</span>
      </div>
      <button type="button" class="btn-icon" aria-label="Close" @click="$emit('close')">
        <DsIcon name="close" :size="16" />
      </button>
    </div>

    <div v-if="error" class="modal__centered">
      <div class="category-disc">
        <img src="/category-exclamation.png" alt="" />
      </div>
      <span class="modal__title">No accounts available</span>
      <p class="modal__body-text">{{ error }}</p>
      <div class="modal__actions">
        <button type="button" class="btn btn--primary btn--block" @click="$emit('help')">
          Get the extension
        </button>
        <button type="button" class="btn btn--secondary btn--block" @click="$emit('retry')">
          Try again
        </button>
      </div>
    </div>

    <div v-else-if="loading" class="modal__centered">
      <span class="progress-note">
        <span class="spinner spinner--lg" aria-hidden="true" />
        Waiting for the extension…
      </span>
    </div>

    <ul v-else class="account-list">
      <li v-for="account in accounts" :key="account.address">
        <button type="button" class="account-row" @click="$emit('pick', account)">
          <span class="avatar">{{ initialsOf(account.name) }}</span>
          <span class="identity__text">
            <span class="identity__name">{{ account.name || 'Unnamed account' }}</span>
            <span class="identity__address">{{ shortAddress(account.address) }}</span>
          </span>
          <span class="account-row__source">{{ account.source }}</span>
        </button>
      </li>
    </ul>
  </ModalShell>
</template>
