<script setup lang="ts">
import { computed, ref } from 'vue'
import StepCard from './components/StepCard.vue'
import MetaRow from './components/MetaRow.vue'
import {
  connectPolkadot,
  signWithPolkadot,
  shortAddress,
  NoExtensionError,
  NoAccountsError,
  type PolkadotAccount,
} from './lib/polkadot'
import { connectSolanaWallet, isValidSolanaAddress, NoSolanaWalletError } from './lib/solana'
import { ApiError, findMigrationFor, registerMigration, type WalletMigration } from './lib/api'

// ── Step 1 — Polkadot wallet ────────────────────────────────
const polkadotStatus = ref<'idle' | 'connecting' | 'ready'>('idle')
const polkadotError = ref('')
const accounts = ref<PolkadotAccount[]>([])
const selected = ref<PolkadotAccount | null>(null)

// Migration status of the selected account
const check = ref<'idle' | 'checking' | 'unmigrated' | 'migrated' | 'error'>('idle')
const existing = ref<WalletMigration | null>(null)

// ── Step 2 — Solana destination ─────────────────────────────
const walletName = ref('')
const walletAddress = ref('')
const manualAddress = ref('')
const solanaNotice = ref('')
const solanaConnecting = ref(false)

// ── Step 3 — convert ────────────────────────────────────────
const submitStatus = ref<'idle' | 'signing' | 'submitting' | 'done'>('idle')
const submitError = ref('')
const result = ref<WalletMigration | null>(null)

const solanaAddress = computed(() => walletAddress.value || manualAddress.value.trim())
const manualInvalid = computed(
  () => manualAddress.value.trim() !== '' && !isValidSolanaAddress(manualAddress.value),
)
const solanaReady = computed(
  () => solanaAddress.value !== '' && isValidSolanaAddress(solanaAddress.value),
)

const step2Locked = computed(() => !selected.value || check.value !== 'unmigrated')
const step2LockedHint = computed(() => {
  if (!selected.value) return 'Connect your Polkadot wallet and choose an account first.'
  if (check.value === 'checking') return 'Checking the migration status of your account…'
  return 'Choose an account that has not been migrated yet.'
})
const step3Locked = computed(() => step2Locked.value || !solanaReady.value)
const step3LockedHint = computed(() =>
  step2Locked.value ? step2LockedHint.value : 'Choose a Solana destination first.',
)

function resetSubmit() {
  submitStatus.value = 'idle'
  submitError.value = ''
  result.value = null
}

async function onConnectPolkadot() {
  polkadotStatus.value = 'connecting'
  polkadotError.value = ''
  try {
    accounts.value = await connectPolkadot()
    polkadotStatus.value = 'ready'
  } catch (e) {
    polkadotStatus.value = 'idle'
    if (e instanceof NoExtensionError) {
      polkadotError.value =
        'No Polkadot wallet found, or access was declined. Install the polkadot.js extension, allow this site, then try again.'
    } else if (e instanceof NoAccountsError) {
      polkadotError.value =
        'Your wallet has no accounts, or none are shared with this site. Add an account in the extension and try again.'
    } else {
      polkadotError.value = 'Could not connect to the wallet. Please try again.'
    }
  }
}

async function onSelectAccount(account: PolkadotAccount) {
  if (selected.value?.address === account.address) return
  selected.value = account
  resetSubmit()
  await checkMigration(account)
}

async function checkMigration(account: PolkadotAccount) {
  check.value = 'checking'
  existing.value = null
  try {
    const found = await findMigrationFor(account.address)
    if (selected.value?.address !== account.address) return
    existing.value = found
    check.value = found ? 'migrated' : 'unmigrated'
  } catch {
    if (selected.value?.address !== account.address) return
    check.value = 'error'
  }
}

async function onConnectSolana() {
  solanaConnecting.value = true
  solanaNotice.value = ''
  try {
    const wallet = await connectSolanaWallet()
    walletName.value = wallet.name
    walletAddress.value = wallet.address
    manualAddress.value = ''
  } catch (e) {
    if (e instanceof NoSolanaWalletError) {
      solanaNotice.value =
        'No Solana wallet found in this browser. Install Phantom or Solflare, or paste an address below.'
    } else {
      solanaNotice.value = 'Could not connect to the Solana wallet. Please try again.'
    }
  } finally {
    solanaConnecting.value = false
  }
}

function clearSolanaWallet() {
  walletName.value = ''
  walletAddress.value = ''
}

async function onConvert() {
  const account = selected.value
  if (!account || !solanaReady.value || submitStatus.value !== 'idle') return
  submitError.value = ''
  submitStatus.value = 'signing'
  try {
    result.value = await registerMigration(account.address, solanaAddress.value, async (digest) => {
      const signature = await signWithPolkadot(account.address, digest)
      submitStatus.value = 'submitting'
      return signature
    })
    submitStatus.value = 'done'
  } catch (e) {
    submitStatus.value = 'idle'
    submitError.value = convertErrorMessage(e)
    if (e instanceof ApiError && e.status === 400 && /already registered/i.test(e.message)) {
      // Someone (or another tab) registered this account meanwhile — refresh.
      void checkMigration(account)
    }
  }
}

function convertErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'The signature could not be verified. Please try again.'
    return e.message
  }
  if (e instanceof Error && /cancel/i.test(e.message)) return 'The signature request was cancelled.'
  return 'Something went wrong. Check your connection and try again.'
}
</script>

<template>
  <header class="top-bar">
    <span class="top-bar__brand">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="rgb(59, 79, 116)" />
        <path
          d="M10.5 10.5 L21.5 21.5 M21.5 10.5 L10.5 21.5"
          stroke="#FFFFFF"
          stroke-width="3"
          stroke-linecap="round"
        />
      </svg>
      realXmarket
    </span>
    <span class="top-bar__powered">POWERED BY XCAVATE</span>
  </header>

  <main>
    <section class="hero">
      <h1>
        Move your account to Solana.
        <span class="accent">One signature. Same ownership.</span>
      </h1>
      <p>
        realXmarket is moving from Polkadot to Solana. Connect the Polkadot wallet you use today,
        choose the Solana wallet that should receive your account, and sign one message to register
        the move. Registration is free — nothing is sent on-chain.
      </p>
    </section>

    <div class="steps">
      <StepCard :step="1" title="Connect your Polkadot wallet" :done="!!selected">
        <template v-if="polkadotStatus === 'idle'">
          <p class="card__hint" style="margin-top: 0">
            Sign in with the polkadot.js extension to prove you own the account being migrated.
          </p>
          <div v-if="polkadotError" class="banner banner--error" style="margin-top: 12px">
            {{ polkadotError }}
            <a href="https://polkadot.js.org/extension/" target="_blank" rel="noopener">
              Get the extension
            </a>
          </div>
          <button class="btn btn--gradient" style="margin-top: 16px" @click="onConnectPolkadot">
            CONNECT WALLET
          </button>
        </template>

        <div v-else-if="polkadotStatus === 'connecting'" class="progress-note">
          <span class="spinner" aria-hidden="true"></span>
          Waiting for the extension…
        </div>

        <template v-else>
          <p class="field__label" style="padding: 0">Choose the account to migrate</p>
          <div class="account-list" style="margin-top: 12px">
            <button
              v-for="account in accounts"
              :key="account.address"
              class="account-row"
              :class="{ 'account-row--selected': selected?.address === account.address }"
              :title="account.address"
              @click="onSelectAccount(account)"
            >
              <span>
                <span class="account-row__name">{{ account.name || 'Unnamed account' }}</span>
                <br />
                <span class="account-row__address">{{ shortAddress(account.address, 10) }}</span>
              </span>
              <span v-if="selected?.address === account.address" class="badge badge--success">
                SELECTED
              </span>
            </button>
          </div>

          <div v-if="check === 'checking'" class="progress-note" style="margin-top: 12px">
            <span class="spinner" aria-hidden="true"></span>
            Checking migration status…
          </div>
          <div v-else-if="check === 'error'" class="banner banner--error" style="margin-top: 12px">
            Could not check the migration status.
            <button class="btn-link" @click="selected && checkMigration(selected)">Retry</button>
          </div>
        </template>
      </StepCard>

      <section v-if="check === 'migrated' && existing" class="card">
        <div class="card__head">
          <span class="card__step card__step--done">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2.5 7.5 L5.5 10.5 L11.5 3.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <h2 class="card__title">Already migrated</h2>
          <span class="badge badge--success" style="margin-left: auto">MIGRATED</span>
        </div>
        <div class="card__body">
          <p style="font-size: 14px; line-height: 22px">
            This account has already registered its migration. A Polkadot account can register only
            one Solana destination.
          </p>
          <div class="meta" style="margin-top: 16px">
            <MetaRow label="Polkadot account" :value="existing.ss58address" />
            <MetaRow label="Migrates to" :value="existing.solanaAddress" />
          </div>
        </div>
      </section>

      <template v-else>
        <StepCard
          :step="2"
          title="Choose your Solana destination"
          :done="solanaReady && !step2Locked"
          :locked="step2Locked"
          :locked-hint="step2LockedHint"
        >
          <template v-if="walletAddress">
            <div class="meta">
              <MetaRow :label="`Connected ${walletName}`" :value="walletAddress" />
            </div>
            <button class="btn-link" style="margin-top: 12px" @click="clearSolanaWallet">
              Use a different address
            </button>
          </template>

          <template v-else>
            <p class="card__hint" style="margin-top: 0">
              Connect a Solana wallet, or paste the address that should receive your account.
            </p>
            <div v-if="solanaNotice" class="banner banner--info" style="margin-top: 12px">
              {{ solanaNotice }}
            </div>
            <button
              class="btn btn--connect"
              style="margin-top: 16px"
              :disabled="solanaConnecting"
              @click="onConnectSolana"
            >
              <span v-if="solanaConnecting" class="spinner" aria-hidden="true"></span>
              CONNECT SOLANA WALLET
            </button>

            <div class="divider">or</div>

            <div class="field">
              <label class="field__label" for="solana-address">Solana address</label>
              <input
                id="solana-address"
                v-model="manualAddress"
                class="field__input"
                :class="{ 'field__input--invalid': manualInvalid }"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="Paste a Solana address"
              />
              <span v-if="manualInvalid" class="field__hint field__hint--error">
                This is not a valid Solana address
              </span>
            </div>
          </template>
        </StepCard>

        <StepCard
          :step="3"
          title="Convert"
          :done="submitStatus === 'done'"
          :locked="step3Locked"
          :locked-hint="step3LockedHint"
        >
          <template v-if="submitStatus === 'done' && result">
            <div class="success">
              <div class="tick-disc">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <path
                    d="M6 14.5 L11.5 20 L22 8"
                    stroke="rgb(69, 116, 97)"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h3>Submitted successfully</h3>
              <p>Your Polkadot account is now registered to migrate to your Solana wallet.</p>
              <div class="meta" style="text-align: left; margin-top: 16px">
                <MetaRow label="From (Polkadot)" :value="result.ss58address" />
                <MetaRow label="To (Solana)" :value="result.solanaAddress" />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="meta">
              <MetaRow label="From (Polkadot)" :value="selected?.address ?? ''" />
              <MetaRow label="To (Solana)" :value="solanaAddress" />
            </div>
            <p class="card__hint">
              You will be asked to sign a message in your Polkadot wallet. Signing is free and
              nothing leaves your wallet except the signature. A registration cannot be changed
              later.
            </p>
            <div v-if="submitError" class="banner banner--error" style="margin-top: 12px">
              {{ submitError }}
            </div>
            <div style="display: flex; align-items: center; gap: 16px; margin-top: 16px">
              <button
                class="btn btn--primary"
                :disabled="submitStatus !== 'idle'"
                @click="onConvert"
              >
                CONVERT
              </button>
              <div v-if="submitStatus === 'signing'" class="progress-note">
                <span class="spinner" aria-hidden="true"></span>
                Waiting for your signature…
              </div>
              <div v-else-if="submitStatus === 'submitting'" class="progress-note">
                <span class="spinner" aria-hidden="true"></span>
                Registering your migration…
              </div>
            </div>
          </template>
        </StepCard>
      </template>
    </div>
  </main>

  <footer class="footer">
    <div class="footer__row">
      <span>Powered by Xcavate</span>
      <span>
        <a href="https://xcavate.io" target="_blank" rel="noopener">xcavate.io</a>
        ·
        <a href="https://github.com/pyrahermesagent/XcavateProfile" target="_blank" rel="noopener">
          Migration API
        </a>
      </span>
    </div>
  </footer>
</template>
