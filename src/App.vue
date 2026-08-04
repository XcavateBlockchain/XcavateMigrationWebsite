<script setup lang="ts">
import { computed, ref } from 'vue'
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

// ── Polkadot square ─────────────────────────────────────────
const polkadotStatus = ref<'idle' | 'connecting' | 'ready'>('idle')
const polkadotError = ref('')
const accounts = ref<PolkadotAccount[]>([])
const selected = ref<PolkadotAccount | null>(null)

// Migration status of the selected account
const check = ref<'idle' | 'checking' | 'unmigrated' | 'migrated' | 'error'>('idle')
const existing = ref<WalletMigration | null>(null)

// ── Solana square ───────────────────────────────────────────
const walletName = ref('')
const walletAddress = ref('')
const manualAddress = ref('')
const solanaNotice = ref('')
const solanaConnecting = ref(false)

// ── Convert ─────────────────────────────────────────────────
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

const solanaLocked = computed(() => !selected.value || check.value !== 'unmigrated')
const solanaLockedHint = computed(() => {
  if (!selected.value) return 'Waiting for a Polkadot account to be selected.'
  if (check.value === 'checking') return 'Checking the migration status of your account…'
  return 'Choose an account that has not been migrated yet.'
})
const convertLocked = computed(() => solanaLocked.value || !solanaReady.value)

// Text above the arrow: always the one next thing to do.
const guidance = computed(() => {
  if (submitStatus.value === 'done') return 'Migration registered.'
  if (check.value === 'migrated')
    return 'This account has already registered its migration. A Polkadot account can register only one Solana destination.'
  if (!selected.value) return 'Connect your Polkadot wallet and choose the account to migrate.'
  if (check.value === 'checking') return 'Checking the migration status of your account…'
  if (check.value === 'error') return 'Could not check the migration status.'
  if (!solanaReady.value) return 'Choose the Solana wallet that should receive your account.'
  return 'Ready — press convert and sign one message in your Polkadot wallet.'
})

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
    <img class="top-bar__logo" src="/xcavate-logo.png" alt="Xcavate" />
  </header>

  <main>
    <section class="hero">
      <h1>
        Move your account to Solana.
        <span class="accent">One signature. Same ownership.</span>
      </h1>
      <p>
        realXmarket is moving from Polkadot to Solana. Connect both wallets below and sign one
        message to register the move.
      </p>
    </section>

    <div class="flow">
      <!-- ── Polkadot square ──────────────────────────────── -->
      <section class="square" aria-label="Polkadot — from">
        <div class="square__head">
          <svg class="chain-mark" viewBox="0 0 36 36" aria-hidden="true">
            <g fill="#E6007A">
              <ellipse cx="18" cy="7" rx="5" ry="3.7" />
              <ellipse cx="18" cy="29" rx="5" ry="3.7" />
              <ellipse cx="8.5" cy="12.5" rx="5" ry="3.7" transform="rotate(60 8.5 12.5)" />
              <ellipse cx="27.5" cy="23.5" rx="5" ry="3.7" transform="rotate(60 27.5 23.5)" />
              <ellipse cx="8.5" cy="23.5" rx="5" ry="3.7" transform="rotate(-60 8.5 23.5)" />
              <ellipse cx="27.5" cy="12.5" rx="5" ry="3.7" transform="rotate(-60 27.5 12.5)" />
            </g>
          </svg>
          <div>
            <span class="square__eyebrow">FROM</span>
            <h2 class="square__title">Polkadot</h2>
          </div>
        </div>

        <div class="square__body">
          <template v-if="polkadotStatus === 'idle'">
            <p class="square__hint">
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
            <div class="account-list square__scroll" style="margin-top: 12px">
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
        </div>
      </section>

      <!-- ── The conversion arrow ─────────────────────────── -->
      <div class="flow__mid">
        <p class="flow__hint">{{ guidance }}</p>

        <div
          class="flow__arrow"
          :class="{
            'flow__arrow--done': submitStatus === 'done' || check === 'migrated',
            'flow__arrow--locked':
              convertLocked && submitStatus !== 'done' && check !== 'migrated',
          }"
        >
          <div class="flow__arrow-shape" aria-hidden="true"></div>
          <div class="flow__center">
            <div v-if="submitStatus === 'done'" class="tick-disc tick-disc--arrow">
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
            <span v-else-if="check === 'migrated'" class="badge badge--success badge--arrow">
              MIGRATED
            </span>
            <button
              v-else
              class="btn btn--convert"
              :disabled="convertLocked || submitStatus !== 'idle'"
              @click="onConvert"
            >
              CONVERT
            </button>
          </div>
        </div>

        <div class="flow__status">
          <div v-if="submitStatus === 'signing'" class="progress-note flow__status-note">
            <span class="spinner" aria-hidden="true"></span>
            Waiting for your signature…
          </div>
          <div v-else-if="submitStatus === 'submitting'" class="progress-note flow__status-note">
            <span class="spinner" aria-hidden="true"></span>
            Registering your migration…
          </div>
          <div v-else-if="submitError" class="banner banner--error">
            {{ submitError }}
          </div>
          <p v-else-if="submitStatus === 'done'" class="flow__success">
            Submitted successfully. Your Polkadot account is now registered to migrate to your
            Solana wallet.
          </p>
          <p v-else class="flow__fineprint">
            Signing is free — nothing leaves your wallet except the signature. A registration
            cannot be changed later.
          </p>
        </div>
      </div>

      <!-- ── Solana square ────────────────────────────────── -->
      <section class="square" aria-label="Solana — to">
        <div class="square__head">
          <svg class="chain-mark" viewBox="0 0 36 36" aria-hidden="true">
            <defs>
              <linearGradient id="sol-grad" x1="0" y1="36" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#9945FF" />
                <stop offset="1" stop-color="#14F195" />
              </linearGradient>
            </defs>
            <g fill="url(#sol-grad)">
              <path d="M12 7 H32 L26 13.5 H6 Z" />
              <path d="M6 15 H26 L32 21.5 H12 Z" />
              <path d="M12 22.5 H32 L26 29 H6 Z" />
            </g>
          </svg>
          <div>
            <span class="square__eyebrow">TO</span>
            <h2 class="square__title">Solana</h2>
          </div>
        </div>

        <div class="square__body">
          <template v-if="check === 'migrated' && existing">
            <div class="banner banner--info">
              This account already migrated to the Solana address below.
            </div>
            <div class="meta" style="margin-top: 16px">
              <MetaRow label="Migrates to" :value="existing.solanaAddress" />
            </div>
          </template>

          <template v-else-if="submitStatus === 'done' && result">
            <div class="meta">
              <MetaRow label="Destination" :value="result.solanaAddress" />
            </div>
            <p class="square__hint" style="margin-top: 12px">
              This is where your account will live on Solana.
            </p>
          </template>

          <p v-else-if="solanaLocked" class="square__hint">{{ solanaLockedHint }}</p>

          <template v-else-if="walletAddress">
            <div class="meta">
              <MetaRow :label="`Connected ${walletName}`" :value="walletAddress" />
            </div>
            <button class="btn-link" style="margin-top: 12px" @click="clearSolanaWallet">
              Use a different address
            </button>
          </template>

          <template v-else>
            <p class="square__hint">
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
        </div>
      </section>
    </div>
  </main>
</template>
