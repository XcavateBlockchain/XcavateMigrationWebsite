<script setup lang="ts">
/**
 * /csv — the migration list as a CSV file. The download fires on load; the
 * button behind it is the fallback for browsers that suppress a download no
 * one clicked for.
 */
import { computed, onMounted, ref } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import DsIcon from './components/DsIcon.vue'
import { listMigrations, type WalletMigration } from './lib/api'
import { downloadCsv, toCsv } from './lib/csv'

const FILENAME = 'migrations.csv'

const status = ref<'loading' | 'ready' | 'error'>('loading')
const rows = ref<WalletMigration[]>([])
const error = ref('')

const count = computed(() =>
  rows.value.length === 1 ? '1 record' : `${rows.value.length} records`,
)

function save() {
  downloadCsv(FILENAME, toCsv(rows.value))
}

async function load() {
  status.value = 'loading'
  error.value = ''
  try {
    rows.value = await listMigrations()
    status.value = 'ready'
    save()
  } catch {
    status.value = 'error'
    error.value = 'Could not load the migrations. Check your connection and try again.'
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <SiteHeader />

    <main class="page__main export">
      <section class="export__card">
        <h1 class="export__title">Migrations export</h1>

        <p v-if="status === 'loading'" class="progress-note">
          <span class="spinner spinner--lg" />
          Preparing {{ FILENAME }}…
        </p>

        <template v-else-if="status === 'ready'">
          <p class="export__done">
            <DsIcon name="verified" :size="20" />
            Downloaded {{ count }}
          </p>
          <p class="export__hint">
            Saved as {{ FILENAME }}. If your browser held the download back, use the button below.
          </p>
          <button type="button" class="btn btn--primary btn--block" @click="save">
            Download again
          </button>
        </template>

        <template v-else>
          <div class="banner banner--error">{{ error }}</div>
          <button type="button" class="btn btn--secondary btn--block" @click="load">Retry</button>
        </template>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
