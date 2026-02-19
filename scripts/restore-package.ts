#!/usr/bin/env bun

import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Get package directory from process.cwd() (where the script is called from)
const packageDir = process.cwd()
const packageJsonPath = join(packageDir, 'package.json')
const backupPath = join(packageDir, 'package.json.backup')

try {
  const backup = readFileSync(backupPath, 'utf-8')
  writeFileSync(packageJsonPath, backup)
  unlinkSync(backupPath)
  console.info('✓ Restored original package.json')
} catch {
  console.warn('No backup found, skipping restore')
}
