#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get root directory (scripts/ is at root level)
const rootDir = resolve(__dirname, '..')
const localRegistryRoot = resolve(rootDir, '..', 'point0-npm')

// Get package directory from process.cwd() (where the script is called from)
const packageDir = process.cwd()
const packageJsonPath = join(packageDir, 'package.json')

if (!packageJsonPath.includes('packages/')) {
  console.error('Error: This script must be run from a package directory')
  process.exit(1)
}

// Read root package.json for catalog
const rootPackageJsonPath = join(rootDir, 'package.json')
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8'))
const catalog = rootPackageJson.workspaces?.catalog || {}

// Read current package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

const resolveWorkspaceLocalFile = (dep: string): string | null => {
  if (!dep.startsWith('@point0/')) return null
  const pkgName = dep.replace('@point0/', '')
  const tarballPath = join(localRegistryRoot, pkgName, 'package.tgz')
  return `file:${tarballPath}`
}

for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] as const) {
  if (!packageJson[section]) continue

  const transformed = { ...packageJson[section] }
  console.info(`Transforming ${section}:`)

  for (const [dep, version] of Object.entries(transformed)) {
    if (version === 'catalog:') {
      if (catalog[dep]) {
        transformed[dep] = catalog[dep]
        console.info(`  ${dep}: catalog: -> ${catalog[dep]}`)
      } else {
        console.warn(`Warning: No catalog entry found for ${dep} in ${section}`)
      }
    } else if (version === 'workspace:*') {
      const localFile = resolveWorkspaceLocalFile(dep)
      if (localFile) {
        transformed[dep] = localFile
        console.info(`  ${dep}: workspace:* -> ${localFile}`)
      } else {
        console.warn(`Warning: Could not resolve local tarball path for ${dep} in ${section}`)
      }
    }
  }

  packageJson[section] = transformed
}

const backupPath = join(packageDir, 'package.json.backup')
writeFileSync(backupPath, readFileSync(packageJsonPath, 'utf-8'))
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

console.info('✓ Transformed package.json for local tarball usage (backup saved to package.json.backup)')
