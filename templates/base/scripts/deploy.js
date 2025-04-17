#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import githubDeployPlugin from '@kobonostudio/vite-plugin-github-deploy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Releasing build (deploy only)\n')

const distDir = path.resolve(process.cwd(), 'dist')
const configPath = path.resolve(process.cwd(), 'starter.config.js')

if (!fs.existsSync(distDir)) {
  console.error('❌ No dist/ directory found. Run `npm run build` or `npm run build:pages` first.')
  process.exit(1)
}
if (!fs.existsSync(configPath)) {
  console.error('❌ Missing starter.config.js')
  process.exit(1)
}

process.env.DEPLOY = 'true'

// Appelle manuellement le plugin sans rebuild
const plugin = githubDeployPlugin()
if (
  plugin &&
  plugin.name === 'vite-plugin-github-deploy' &&
  typeof plugin.closeBundle === 'function'
) {
  await plugin.closeBundle()
  console.log('✅ Deploy complete!\n')
} else {
  console.error('❌ Failed to load deploy plugin.')
}
