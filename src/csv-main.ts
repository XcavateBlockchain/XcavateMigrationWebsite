import { createApp } from 'vue'
import './style.css'
import './styles/export.css'
import CsvPage from './CsvPage.vue'

// This page only reads the migration list — none of the SS58 decoding the
// main flow warms up its WASM crypto for.
createApp(CsvPage).mount('#app')
