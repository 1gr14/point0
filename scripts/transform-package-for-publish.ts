#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
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

// Transform peerDependencies
// This runs during prepublishOnly, which happens AFTER @semantic-release/npm bumps versions
// So workspace package versions will already be updated when we read them
if (packageJson.peerDependencies) {
  const transformed = { ...packageJson.peerDependencies }
  console.log('Transforming peerDependencies:')

  for (const [dep, version] of Object.entries(transformed)) {
    // Transform catalog: references
    if (version === 'catalog:') {
      if (catalog[dep]) {
        transformed[dep] = catalog[dep]
        console.log(`  ${dep}: catalog: -> ${catalog[dep]}`)
      } else {
        console.warn(`Warning: No catalog entry found for ${dep}`)
      }
    }
    // Transform workspace:* references
    else if (version === 'workspace:*') {
      // Find the workspace package
      let workspaceVersion = null

      // Try to find the package in packages directory
      try {
        const workspacePackagePath = join(rootDir, 'packages', dep.replace('@point0/', ''), 'package.json')
        const workspacePackage = JSON.parse(readFileSync(workspacePackagePath, 'utf-8'))
        workspaceVersion = workspacePackage.version

        // Note: When running via semantic-release, this will read the already-bumped version
        // because @semantic-release/npm bumps the version BEFORE running prepublishOnly
        console.log(`  ${dep}: workspace:* -> ^${workspaceVersion}`)
      } catch {
        // Package not found, try to get version from catalog or use current package version
        workspaceVersion = catalog[dep] || packageJson.version
        console.warn(`Warning: Could not find workspace package ${dep}, using fallback: ${workspaceVersion}`)
      }

      if (workspaceVersion) {
        // Use caret range to allow compatible versions
        // This ensures users can install compatible versions (e.g., ^0.1.0 allows 0.1.0, 0.1.1, 0.2.0, etc.)
        transformed[dep] = `^${workspaceVersion}`
      } else {
        console.warn(`Warning: Could not determine version for workspace package ${dep}`)
      }
    }
  }

  packageJson.peerDependencies = transformed
}

// Backup original and write transformed version
const backupPath = join(packageDir, 'package.json.backup')
writeFileSync(backupPath, readFileSync(packageJsonPath, 'utf-8'))
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

console.log('✓ Transformed package.json for publishing (backup saved to package.json.backup)')
