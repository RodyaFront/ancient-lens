#!/usr/bin/env node
/**
 * npm flattens `wrangler-upstream` (npm:wrangler) and its `wrangler` bin
 * overwrites this package's bin. Re-point .bin after install.
 *
 * On Linux `.bin/wrangler` is a symlink — must unlink before write, or
 * writeFileSync follows the link and corrupts wrangler-upstream's JS.
 */
import { chmodSync, lstatSync, unlinkSync, writeFileSync } from 'node:fs'
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

function writeBin(path, body, mode) {
  try {
    const st = lstatSync(path)
    if (st.isSymbolicLink() || st.isFile()) unlinkSync(path)
  } catch {
    // missing is fine
  }
  writeFileSync(path, body, { encoding: 'utf8' })
  if (mode) {
    try {
      chmodSync(path, mode)
    } catch {
      // Windows may ignore chmod
    }
  }
}

for (const name of ['wrangler', 'wrangler2', 'cf-wrangler']) {
  writeBin(join(binDir, name), unix, 0o755)
  writeBin(join(binDir, `${name}.cmd`), cmd)
  writeBin(join(binDir, `${name}.ps1`), ps1)
}
