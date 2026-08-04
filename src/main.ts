import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { cryptoWaitReady } from '@polkadot/util-crypto'

// Warm up the WASM crypto used for SS58 address decoding; the JS fallbacks
// cover the gap if it is slow to arrive.
void cryptoWaitReady().catch(() => {})

createApp(App).mount('#app')
