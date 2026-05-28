#!/usr/bin/env bun

import { execa } from 'execa'
import { cpSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')
const outputRoot = resolve(rootDir, '..', 'point0-npm')

const publishablePackages = [
  'core',
  'compiler',
  'engine',
  'react-dom',
  'cookie-store',
  'cors',
  'openapi',
  'basic-auth',
  'create-app',
]

const run = async (command: string, args: string[], cwd: string) => {
  const result = await execa(command, args, { cwd })
  return result.stdout.trim()
}

const findPackedTarball = (dir: string): string => {
  const tgzs = readdirSync(dir).filter((file) => file.endsWith('.tgz'))
  if (tgzs.length !== 1) {
    throw new Error(`Expected exactly one .tgz in ${dir}, found ${tgzs.length}`)
  }
  return tgzs[0]
}

async function main() {
  rmSync(outputRoot, { recursive: true, force: true })
  mkdirSync(outputRoot, { recursive: true })

  await Promise.all(
    publishablePackages.map(async (pkg) => {
      const packageDir = join(rootDir, 'packages', pkg)
      const outputDir = join(outputRoot, pkg)
      mkdirSync(outputDir, { recursive: true })

      console.info(`\nPacking @point0/${pkg}...`)

      try {
        await run('bun', ['../../scripts/transform-package-for-local.ts'], packageDir)
        await run('npm', ['pack', '--pack-destination', outputDir, '--silent'], packageDir)

        const tarball = findPackedTarball(outputDir)
        await run('tar', ['-xzf', tarball], outputDir)

        const extractedDir = join(outputDir, 'package')
        for (const entry of readdirSync(extractedDir)) {
          cpSync(join(extractedDir, entry), join(outputDir, entry), { recursive: true })
        }
        rmSync(extractedDir, { recursive: true, force: true })

        const tarballPath = join(outputDir, tarball)
        const stableTarballPath = join(outputDir, 'package.tgz')
        if (tarballPath !== stableTarballPath) {
          renameSync(tarballPath, stableTarballPath)
        }

        console.info(`✓ Wrote ${outputDir}`)
      } finally {
        await run('bun', ['../../scripts/restore-package.ts'], packageDir)
      }
    }),
  )

  console.info(`\nDone. Local publish artifacts are in: ${outputRoot}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
