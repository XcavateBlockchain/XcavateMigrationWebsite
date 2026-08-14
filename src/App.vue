<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import StepBar from './components/StepBar.vue'
import PolkadotPanel from './components/PolkadotPanel.vue'
import SolanaPanel from './components/SolanaPanel.vue'
import DsIcon from './components/DsIcon.vue'
import AccountPickerModal from './components/AccountPickerModal.vue'
import HelpModal from './components/HelpModal.vue'
import ConfirmSignModal from './components/ConfirmSignModal.vue'
import SuccessModal from './components/SuccessModal.vue'
import {
  connectPolkadot,
  signWithPolkadot,
  NoExtensionError,
  NoAccountsError,
  type PolkadotAccount,
} from './lib/polkadot'
import { connectSolanaWallet, isValidSolanaAddress, NoSolanaWalletError } from './lib/solana'
import { ApiError, registerMigration, type WalletMigration } from './lib/api'
import { findMigrationFor } from './lib/migration-lookup'
import { canonicalMigrationBody } from './lib/signing'
import { receiptJson, type Receipt } from './lib/receipt'

// ── Step 1: the Polkadot account ────────────────────────────
const accounts = ref<PolkadotAccount[]>([])
const selected = ref<PolkadotAccount | null>(null)
const connecting = ref(false)
const pickerOpen = ref(false)
const pickerError = ref('')
const helpOpen = ref(false)

// Migration status of the selected account.
const check = ref<'idle' | 'checking' | 'unmigrated' | 'migrated' | 'error'>('idle')
const existing = ref<WalletMigration | null>(null)

// ── Step 2: the Solana destination ──────────────────────────
const walletName = ref('')
const walletAddress = ref('')
const manualAddress = ref('')
const solanaNotice = ref('')
const solanaConnecting = ref(false)

// ── Step 3: sign and register ───────────────────────────────
const signOpen = ref(false)
const signStatus = ref<'idle' | 'signing' | 'submitting'>('idle')
const submitError = ref('')
const receipt = ref<Receipt | null>(null)
const successOpen = ref(false)

const copiedAddress = ref(false)
const copiedReceipt = ref(false)

const solanaAddress = computed(() => walletAddress.value || manualAddress.value.trim())
const manualInvalid = computed(
  () => manualAddress.value.trim() !== '' && !isValidSolanaAddress(manualAddress.value),
)
const solanaReady = computed(
  () => solanaAddress.value !== '' && isValidSolanaAddress(solanaAddress.value),
)

const alreadyRegistered = computed(() => check.value === 'migrated' && existing.value !== null)

/** What the destination panel shows: a registration, once made, is fixed. */
const destination = computed(() => {
  if (existing.value) return existing.value.solanaAddress
  if (receipt.value) return receipt.value.to
  // A half-typed address is not a destination — keep the field on screen.
  return solanaReady.value ? solanaAddress.value : ''
})
const destinationFixed = computed(() => existing.value !== null || receipt.value !== null)
const destinationName = computed(() =>
  existing.value ? 'Registered destination' : walletName.value,
)

const solanaLocked = computed(
  () => !selected.value || check.value === 'checking' || check.value === 'error',
)
const solanaLockedHint = computed(() => {
  if (!selected.value) return 'Waiting for a Polkadot account to be selected.'
  if (check.value === 'checking') return 'Checking the migration status of your account…'
  return 'Could not check the migration status of your account.'
})

const signReady = computed(
  () => selected.value !== null && solanaReady.value && check.value === 'unmigrated' && !receipt.value,
)

/** The canonical request body the signature authorises. */
const payload = computed(() =>
  selected.value && solanaReady.value
    ? canonicalMigrationBody(selected.value.address, solanaAddress.value)
    : '',
)

const stepsDone = computed(() => {
  if (receipt.value || alreadyRegistered.value) return 3
  if (signReady.value) return 2
  if (selected.value) return 1
  return 0
})

const registered = computed(() => stepsDone.value === 3)

const connectorCaption = computed(() => {
  switch (stepsDone.value) {
    case 3:
      return 'Registered'
    case 2:
      return 'Migrate'
    case 1:
      return 'Choose a destination'
    default:
      return 'Connect to begin'
  }
})

/** A failure the sign modal is no longer on screen to show. */
const flowError = computed(() => (signOpen.value ? '' : submitError.value))

function copy(text: string, flag: Ref<boolean>) {
  void navigator.clipboard?.writeText(text).catch(() => {})
  flag.value = true
  setTimeout(() => (flag.value = false), 1600)
}

function openHelpFromPicker() {
  pickerOpen.value = false
  helpOpen.value = true
}

function copyAccountAddress() {
  if (selected.value) copy(selected.value.address, copiedAddress)
}

function resetSubmit() {
  signStatus.value = 'idle'
  submitError.value = ''
  receipt.value = null
}

// ── Step 1 ──────────────────────────────────────────────────

async function openPicker() {
  pickerOpen.value = true
  await loadAccounts()
}

async function loadAccounts() {
  connecting.value = true
  pickerError.value = ''
  try {
    accounts.value = await connectPolkadot()
  } catch (e) {
    accounts.value = []
    if (e instanceof NoExtensionError) {
      pickerError.value =
        'No Polkadot wallet found, or access was declined. Install the polkadot.js extension, allow this site, then try again.'
    } else if (e instanceof NoAccountsError) {
      pickerError.value =
        'Your wallet has no accounts, or none are shared with this site. Add an account in the extension and try again.'
    } else {
      pickerError.value = 'Could not connect to the wallet. Please try again.'
    }
  } finally {
    connecting.value = false
  }
}

async function pickAccount(account: PolkadotAccount) {
  pickerOpen.value = false
  if (selected.value?.address === account.address) return
  selected.value = account
  resetSubmit()
  await checkMigration(account)
}

function changeAccount() {
  selected.value = null
  check.value = 'idle'
  existing.value = null
  resetSubmit()
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

// ── Step 2 ──────────────────────────────────────────────────

async function connectSolana() {
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

function changeWallet() {
  walletName.value = ''
  walletAddress.value = ''
  manualAddress.value = ''
}

// ── Step 3 ──────────────────────────────────────────────────

function openSign() {
  submitError.value = ''
  signStatus.value = 'idle'
  signOpen.value = true
}

function cancelSign() {
  if (signStatus.value !== 'idle') return
  signOpen.value = false
}

async function doSign() {
  const account = selected.value
  if (!account || !solanaReady.value || signStatus.value !== 'idle') return

  const destinationAddress = solanaAddress.value
  submitError.value = ''
  signStatus.value = 'signing'
  let signature = ''
  try {
    await registerMigration(account.address, destinationAddress, async (digest) => {
      signature = await signWithPolkadot(account.address, digest)
      signStatus.value = 'submitting'
      return signature
    })
    receipt.value = {
      from: account.address,
      to: destinationAddress,
      signature,
      signedAt: new Date().toISOString(),
    }
    signStatus.value = 'idle'
    signOpen.value = false
    successOpen.value = true
  } catch (e) {
    signStatus.value = 'idle'
    submitError.value = convertErrorMessage(e)
    if (e instanceof ApiError && e.status === 400 && /already registered/i.test(e.message)) {
      // Someone (or another tab) registered this account meanwhile — refresh.
      signOpen.value = false
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

function copyReceipt() {
  if (!receipt.value) return
  copy(receiptJson(receipt.value), copiedReceipt)
}
</script>

<template>
  <div class="page">
    <SiteHeader @help="helpOpen = true" />

    <main class="page__main">
      <section class="hero">
        <h1 class="hero__title">
          Migrate your account to Solana.
          <span>One signature. Same ownership.</span>
        </h1>
        <p class="hero__lede">
          Xcavate & realXmarket are moving from Polkadot to Solana. Connect both wallets below and sign one
          message to register the move. 
        </p>
      </section>

      <StepBar :done="stepsDone" />

      <div class="flow">
        <PolkadotPanel
          :account="selected"
          :connecting="connecting"
          :check="check"
          :copied="copiedAddress"
          :locked="destinationFixed"
          @connect="openPicker"
          @change="changeAccount"
          @copy="copyAccountAddress"
          @help="helpOpen = true"
          @recheck="selected && checkMigration(selected)"
        />

        <div class="connector">
          <!-- Step 3 lives here: once both wallets are in, the arrow grows into
               the primary action and shimmers until it is pressed. -->
          <button
            v-if="signReady"
            type="button"
            class="connector__disc connector__disc--action"
            aria-label="Sign the message and register the migration"
            @click="openSign"
          >
            <DsIcon name="arrow-right" :size="40" />
          </button>
          <div v-else class="connector__disc" :class="{ 'connector__disc--done': registered }">
            <DsIcon :name="registered ? 'verified' : 'arrow-right'" :size="28" />
          </div>
          <span
            class="connector__caption"
            :class="{
              'connector__caption--action': signReady,
              'connector__caption--done': registered,
            }"
          >
            {{ connectorCaption }}
          </span>
        </div>

        <SolanaPanel
          :address="destination"
          :wallet-name="destinationName"
          :manual-address="manualAddress"
          :manual-invalid="manualInvalid"
          :connecting="solanaConnecting"
          :notice="solanaNotice"
          :locked="solanaLocked"
          :locked-hint="solanaLockedHint"
          :fixed="destinationFixed"
          @connect="connectSolana"
          @change="changeWallet"
          @update:manualAddress="manualAddress = $event"
        />
      </div>

      <!-- What the sign panel used to carry: the outcome, and any failure the
           modal closed on. Both read as a line under the flow, not a card. -->
      <div v-if="registered" class="outcome">
      </div>

      <div v-else-if="flowError" class="outcome">
        <div class="banner banner--error">{{ flowError }}</div>
      </div>
    </main>

    <SiteFooter />

    <AccountPickerModal
      v-if="pickerOpen"
      :accounts="accounts"
      :loading="connecting"
      :error="pickerError"
      @pick="pickAccount"
      @close="pickerOpen = false"
      @retry="loadAccounts"
      @help="openHelpFromPicker"
    />

    <HelpModal v-if="helpOpen" @close="helpOpen = false" />

    <ConfirmSignModal
      v-if="signOpen && selected"
      :account="selected"
      :solana-address="solanaAddress"
      :payload="payload"
      :status="signStatus"
      :error="submitError"
      @confirm="doSign"
      @cancel="cancelSign"
    />

    <SuccessModal
      v-if="successOpen && receipt"
      :from-address="receipt.from"
      :to-address="receipt.to"
      :copied="copiedReceipt"
      @close="successOpen = false"
      @copy="copyReceipt"
    />
  </div>
</template>
