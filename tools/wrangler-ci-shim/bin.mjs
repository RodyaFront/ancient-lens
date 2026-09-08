#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const upstreamRoot = dirname(require.resolve('wrangler-upstream/package.json'))
const upstreamBin = join(upstreamRoot, 'bin', 'wrangler.js')

let args = process.argv.slice(2)

// Workers Builds dashboard still has `npx wrangler pages deploy .output/public`.
// Builds tokens can edit Workers Scripts, not Pages — rewrite to assets deploy.
if (args[0] === 'pages' && args[1] === 'deploy') {
  const cleaned = []
  for (let i = 2; i < args.length; i++) {
    const arg = args[i]
    if (arg === '.output/public') continue
    if (arg === '--project-name') {
      i++
      continue
    }
    if (arg.startsWith('--project-name=')) continue
    cleaned.push(arg)
  }
  args = ['deploy', ...cleaned]
}

const result = spawnSync(process.execPath, [upstreamBin, ...args], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
