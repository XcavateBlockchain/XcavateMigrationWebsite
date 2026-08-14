import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/" so built
// asset URLs resolve under the project page. Local dev serves from "/".
export default defineConfig({
  plugins: [vue()],
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      // Two entries, each emitted at its source path: the migration flow at
      // "/", and the CSV export at "/csv" — Pages serves csv/index.html there
      // without a router or an SPA fallback.
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        csv: fileURLToPath(new URL('csv/index.html', import.meta.url)),
      },
    },
  },
})
