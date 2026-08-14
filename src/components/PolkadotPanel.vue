<script setup lang="ts">
import { computed } from 'vue'
import ChainMark from './ChainMark.vue'
import DsIcon from './DsIcon.vue'
import MetaRow from './MetaRow.vue'
import StatusBadge from './StatusBadge.vue'
import { shortAddress, type PolkadotAccount } from '../lib/polkadot'

const props = defineProps<{
  account: PolkadotAccount | null
  connecting: boolean
  check: 'idle' | 'checking' | 'unmigrated' | 'migrated' | 'error'
  copied: boolean
  /** Once the registration is recorded the account can no longer be swapped. */
  locked: boolean
}>()

defineEmits<{ connect: []; change: []; copy: []; help: []; recheck: [] }>()

function initialsOf(name: string | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '··'
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const initials = computed(() => initialsOf(props.account?.name))

const status = computed(() => {
  switch (props.check) {
    case 'checking':
      return 'Checking…'
    case 'unmigrated':
      return 'Not yet registered'
    case 'migrated':
      return 'Already registered'
    case 'error':
      return 'Could not check'
    default:
      return '—'
  }
})
</script>

<template>
  <section class="panel" aria-labelledby="from-title">
    <div class="panel__head">
      <div class="panel__ident">
        <ChainMark chain="polkadot" />
        <div class="panel__titles">
          <span class="panel__eyebrow">From</span>
          <h2 id="from-title" class="panel__title">Polkadot</h2>
        </div>
      </div>
      <StatusBadge :tone="account ? 'success' : 'neutral'">
        {{ account ? 'Connected' : 'Not connected' }}
      </StatusBadge>
    </div>

    <div v-if="!account" class="panel__body">
      <p class="panel__hint">
        Sign in with the polkadot.js extension to prove you own the account being migrated.
      </p>
      <div class="panel__actions">
        <button
          type="button"
          class="btn btn--primary btn--block"
          :disabled="connecting"
          @click="$emit('connect')"
        >
          <span v-if="connecting" class="spinner" aria-hidden="true" />
          Connect wallet
        </button>
      </div>
    </div>

    <div v-else class="panel__body">
      <div class="identity">
        <span class="avatar">{{ initials }}</span>
        <span class="identity__text">
          <span class="identity__name">{{ account.name || 'Unnamed account' }}</span>
          <span class="identity__address">{{ shortAddress(account.address) }}</span>
        </span>
        <button
          type="button"
          class="identity__action"
          :title="account.address"
          @click="$emit('copy')"
        >
          <DsIcon name="copy" :size="16" />
          <span>{{ copied ? 'Copied' : 'Copy' }}</span>
        </button>
      </div>

      <div class="meta">
        <MetaRow label="Wallet" :value="account.source" />
        <MetaRow label="Status" :value="status" />
      </div>

      <button
        v-if="check === 'error'"
        type="button"
        class="btn-inline"
        @click="$emit('recheck')"
      >
        Retry check
      </button>

      <button v-if="!locked" type="button" class="btn-inline" style="margin-top: auto" @click="$emit('change')">
        Change account
      </button>
    </div>
  </section>
</template>
