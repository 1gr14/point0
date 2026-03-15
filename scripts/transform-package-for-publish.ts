#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get root directory (scripts/ is at root level)
const rootDir = resolve(__dirname, '..')

// Get package directory from process.cwd() (where the script is called from)
// This allows the script to work from any package
const packageDir = process.cwd()
const packageJsonPath = join(packageDir, 'package.json')

// Verify we're in a package directory
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

const resolveWorkspaceVersion = (dep: string): string | null => {
  // Try to find the package in packages directory
  try {
    const workspacePackagePath = join(rootDir, 'packages', dep.replace('@point0/', ''), 'package.json')
    const workspacePackage = JSON.parse(readFileSync(workspacePackagePath, 'utf-8'))
    return workspacePackage.version
  } catch {
    // Package not found, try to get version from catalog or use current package version
    return catalog[dep] || packageJson.version || null
  }
}

// Transform dependency sections.
// This runs during prepublishOnly, which happens AFTER @semantic-release/npm bumps versions.
// So workspace package versions will already be updated when we read them.
for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] as const) {
  if (!packageJson[section]) continue

  const transformed = { ...packageJson[section] }
  console.info(`Transforming ${section}:`)

  for (const [dep, version] of Object.entries(transformed)) {
    // Transform catalog: references
    if (version === 'catalog:') {
      if (catalog[dep]) {
        transformed[dep] = catalog[dep]
        console.info(`  ${dep}: catalog: -> ${catalog[dep]}`)
      } else {
        console.warn(`Warning: No catalog entry found for ${dep} in ${section}`)
      }
    }
    // Transform workspace:* references
    else if (version === 'workspace:*') {
      const workspaceVersion = resolveWorkspaceVersion(dep)
      if (workspaceVersion) {
        // Use caret range to allow compatible versions
        // This ensures users can install compatible versions.
        transformed[dep] = `^${workspaceVersion}`
        console.info(`  ${dep}: workspace:* -> ^${workspaceVersion}`)
      } else {
        console.warn(`Warning: Could not determine version for workspace package ${dep} in ${section}`)
      }
    }
  }

  packageJson[section] = transformed
}

// Backup original and write transformed version
const backupPath = join(packageDir, 'package.json.backup')
writeFileSync(backupPath, readFileSync(packageJsonPath, 'utf-8'))
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

console.info('✓ Transformed package.json for publishing (backup saved to package.json.backup)')
