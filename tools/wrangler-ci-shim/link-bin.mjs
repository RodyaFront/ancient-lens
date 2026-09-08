#!/usr/bin/env node
/**
 * npm flattens `wrangler-upstream` (npm:wrangler) and its `wrangler` bin
 * overwrites this package's bin. Re-point .bin after install.
 */
import { chmodSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const binDir = join(root, 'node_modules', '.bin')
const shimRel = '../wrangler/bin.mjs'

const unix = `#!/bin/sh
basedir=$(dirname "$0")
exec node "$basedir/${shimRel}" "$@"
`

const cmd = `@ECHO off
SETLOCAL
SET "dp0=%~dp0"
node "%dp0%${shimRel.replace(/\//g, '\\')}" %*
`

const ps1 = `#!/usr/bin/env pwsh
$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent
& node "$basedir/${shimRel}" @args
exit $LASTEXITCODE
`

for (const [name, body] of [
  ['wrangler', unix],
  ['wrangler2', unix],
  ['cf-wrangler', unix],
]) {
  const path = join(binDir, name)
  writeFileSync(path, body, { encoding: 'utf8' })
  try {
    chmodSync(path, 0o755)
  } catch {
    // Windows may ignore chmod
  }
}

for (const name of ['wrangler', 'wrangler2', 'cf-wrangler']) {
  writeFileSync(join(binDir, `${name}.cmd`), cmd, { encoding: 'utf8' })
  writeFileSync(join(binDir, `${name}.ps1`), ps1, { encoding: 'utf8' })
}
