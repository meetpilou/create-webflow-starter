import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

import webflowBundlerPlugin from '@kobonostudio/vite-plugin-webflow-bundler'
import githubDeployPlugin from '@kobonostudio/vite-plugin-github-deploy'

const isPages = process.env.PAGES === 'true'

function getFlatPageInputs() {
  const baseDir = path.resolve(__dirname, 'src/pages')
  const inputs = {}
  if (!fs.existsSync(baseDir)) return null
  for (const file of fs.readdirSync(baseDir)) {
    const full = path.join(baseDir, file)
    if (fs.statSync(full).isFile() && file.endsWith('.js')) {
      const name = file.replace('.js', '') // ex: "home"
      inputs[name] = full
    }
  }
  return Object.keys(inputs).length > 0 ? inputs : null
}

const baseInputs = {
  main: path.resolve(__dirname, 'src/main.js'),
  ...(getFlatPageInputs() || {}),
}

export default defineConfig({
  plugins: [webflowBundlerPlugin(), githubDeployPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: isPages ? baseInputs : { main: baseInputs.main },
      output: {
        entryFileNames: 'scripts/[name].min.js',
        chunkFileNames: 'chunks/[name]-[hash].min.js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('/modules/')) {
            const name = id.split('/modules/')[1].split('/')[0].replace('.js', '')
            return `mod-${name}`
          }
        },
      },
    },
  },
  server: {
    port: 3000,
  },
})
