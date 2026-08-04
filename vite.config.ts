import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/" so built
// asset URLs resolve under the project page. Local dev serves from "/".
export default defineConfig({
  plugins: [vue()],
  base: process.env.BASE_PATH || '/',
})
