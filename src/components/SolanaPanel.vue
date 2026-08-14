<script setup lang="ts">
import { computed } from 'vue'
import ChainMark from './ChainMark.vue'
import DsIcon from './DsIcon.vue'
import StatusBadge from './StatusBadge.vue'
import { shortAddress } from '../lib/polkadot'

const props = defineProps<{
  /** '' until a wallet is connected or a valid address is pasted. */
  address: string
  walletName: string
  manualAddress: string
  manualInvalid: boolean
  connecting: boolean
  notice: string
  /** Set while there is no Polkadot account to migrate from. */
  lockedHint: string
  locked: boolean
  /** True once the registration is recorded — the destination is then fixed. */
  fixed: boolean
}>()

const emit = defineEmits<{
  connect: []
  change: []
  'update:manualAddress': [value: string]
}>()

const chosen = computed(() => props.address !== '')

function onManualInput(event: Event) {
  emit('update:manualAddress', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="panel" aria-labelledby="to-title">
    <div class="panel__head">
      <div class="panel__ident">
        <ChainMark chain="solana" />
        <div class="panel__titles">
          <span class="panel__eyebrow">To</span>
          <h2 id="to-title" class="panel__title">Solana</h2>
        </div>
      </div>
      <StatusBadge :tone="chosen ? 'success' : 'neutral'">
        {{ chosen ? 'Connected' : 'Not connected' }}
      </StatusBadge>
    </div>

    <div v-if="locked" class="panel__locked">
      <DsIcon name="lock" :size="24" />
      <p>{{ lockedHint }}</p>
    </div>

    <div v-else-if="chosen" class="panel__body">
      <div class="identity">
        <span class="avatar avatar--sol"><DsIcon name="wallet" :size="20" /></span>
        <span class="identity__text">
          <span class="identity__name">{{ walletName || 'Pasted address' }}</span>
          <span class="identity__address">{{ shortAddress(address) }}</span>
        </span>
      </div>
      <p class="panel__hint">This address will own your account and holdings on Solana.</p>
      <button
        v-if="!fixed"
        type="button"
        class="btn-inline"
        style="margin-top: auto"
        @click="$emit('change')"
      >
        Change account
      </button>
    </div>

    <div v-else class="panel__body">
      <p class="panel__hint">
        Choose the Solana wallet that will own the account after the move, or paste its address.
      </p>
      <div v-if="notice" class="banner banner--info">{{ notice }}</div>

      <div class="panel__actions">
        <button
          type="button"
          class="btn btn--primary btn--block"
          :disabled="connecting"
          @click="$emit('connect')"
        >
          <span v-if="connecting" class="spinner" aria-hidden="true" />
          Connect Solana wallet
        </button>

        <div class="field">
          <label class="field__label" for="solana-address">Or paste an address</label>
          <input
            id="solana-address"
            class="field__input"
            :class="{ 'field__input--invalid': manualInvalid }"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Solana address"
            :value="manualAddress"
            @input="onManualInput"
          />
          <span v-if="manualInvalid" class="field__hint field__hint--error">
            This is not a valid Solana address
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
