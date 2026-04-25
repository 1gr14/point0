#!/usr/bin/env node

import { cancel, confirm, intro, isCancel, outro, select, text } from '@clack/prompts'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'

type CliOptions = {
  vite?: boolean
  install?: boolean
  interactive?: boolean
  override?: boolean
}

const VITE_CONFIG_LINE = "viteConfig: '../vite.config.ts',"
const TAILWIND_LINK_COMMENT = '<!-- <link rel="stylesheet" href="/styles/index.css" /> -->'
const TAILWIND_LINK = '<link rel="stylesheet" href="/styles/index.css" />'
const HTML_CLIENT_SRC_DOT = './index.client.ts'
const HTML_CLIENT_SRC_ROOT = '/index.client.ts'
const DEFAULT_APP_NAME = 'my-app'

const program = new Command()

program
  .name('point0-create-app')
  .description('Scaffold a new point0 app')
  .argument('[name]', 'Directory name for the new app')
  .option('--vite', 'Use Vite for client bundling')
  .option('--no-vite', 'Do not use Vite for client bundling')
  .option('--install', 'Install dependencies after scaffolding')
  .option('--no-install', 'Skip dependency installation after scaffolding')
  .option('-O, --override', 'Override existing files if the target directory is not empty')
  .option('--no-override', 'Do not override existing files if the target directory is not empty')
  .option('-I, --no-interactive', 'Disable interactive prompts')
  .action(async (name: string | undefined, options: CliOptions) => {
    intro('point0-create-app')
    const interactive = options.interactive !== false
    const appName = await resolveAppName(name, interactive)
    if (!appName) {
      return
    }

    try {
      await ensureTargetDirectoryIsReady(appName, options.override, interactive)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      cancel(message)
      process.exit(1)
    }

    const useVite = await resolveUseViteFlag(options.vite, interactive)
    const shouldInstall = await resolveInstallFlag(options.install, interactive)

    try {
      await ensureBun(interactive)
      await copyTemplate(appName)
      await patchTemplate(appName, useVite)
      if (shouldInstall) {
        await installDependencies(appName)
      }
      outro(`Project "${appName}" created successfully with (${useVite ? 'vite' : 'bun'}) bundler.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      cancel(message)
      process.exit(1)
    }
  })

void run()

async function run() {
  await program.parseAsync(process.argv)
}

async function resolveAppName(name: string | undefined, interactive: boolean) {
  if (name && name.trim().length > 0) {
    return name.trim()
  }

  if (!interactive) {
    return DEFAULT_APP_NAME
  }

  const response = await text({
    message: 'Project name',
    defaultValue: DEFAULT_APP_NAME,
    validate(value: string | undefined) {
      if (!value || value.trim().length === 0) {
        return 'Please enter a project name.'
      }
      return undefined
    },
  })

  if (isCancel(response)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return response.trim()
}

async function resolveUseViteFlag(viteFlag: boolean | undefined, interactive: boolean) {
  if (typeof viteFlag === 'boolean') {
    return viteFlag
  }

  if (!interactive) {
    return false
  }

  const response = await select({
    message: 'Choose bundler mode',
    options: [
      { label: 'Bun', value: 'bun' },
      { label: 'Vite', value: 'vite' },
    ],
    initialValue: 'bun',
  })

  if (isCancel(response)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return response === 'vite'
}

async function resolveInstallFlag(installFlag: boolean | undefined, interactive: boolean) {
  if (typeof installFlag === 'boolean') {
    return installFlag
  }

  if (!interactive) {
    return true
  }

  const response = await confirm({
    message: 'Install dependencies now?',
    initialValue: true,
  })
  if (isCancel(response)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
  return response
}

async function ensureTargetDirectoryIsReady(
  appName: string,
  overrideFlag: boolean | undefined,
  interactive: boolean,
) {
  const projectPath = resolve(process.cwd(), appName)

  let pathStat: Awaited<ReturnType<typeof stat>> | undefined
  try {
    pathStat = await stat(projectPath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      throw error
    }
  }

  if (!pathStat) {
    await mkdir(projectPath, { recursive: true })
    return
  }

  if (!pathStat.isDirectory()) {
    throw new Error(`Target path exists and is not a directory: ${projectPath}`)
  }

  const entries = await readdir(projectPath)
  if (entries.length === 0) {
    return
  }

  const shouldOverride = await resolveOverrideFlag(projectPath, overrideFlag, interactive)
  if (!shouldOverride) {
    throw new Error(`Target directory is not empty: ${projectPath}`)
  }
}

async function resolveOverrideFlag(
  projectPath: string,
  overrideFlag: boolean | undefined,
  interactive: boolean,
) {
  if (typeof overrideFlag === 'boolean') {
    return overrideFlag
  }

  if (!interactive) {
    return false
  }

  const response = await confirm({
    message: `Target directory is not empty: ${projectPath}. Override existing files?`,
    initialValue: false,
  })
  if (isCancel(response)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
  return response
}

async function copyTemplate(appName: string) {
  const sourceTemplatePath = resolveTemplateDir()
  const targetPath = resolve(process.cwd(), appName)
  await cp(sourceTemplatePath, targetPath, { recursive: true, force: true })
}

async function patchTemplate(appName: string, useVite: boolean) {
  const appRoot = resolve(process.cwd(), appName)
  const packageJsonPath = resolve(appRoot, 'package.json')
  const enginePath = resolve(appRoot, 'src/engine.ts')
  const indexHtmlPath = resolve(appRoot, 'src/index.html')
  const viteConfigPath = resolve(appRoot, 'vite.config.ts')
  const gitignorePath = resolve(appRoot, '.gitignore')

  await patchPackageJson(packageJsonPath, useVite)
  await patchEngine(enginePath, useVite)
  await patchIndexHtml(indexHtmlPath, useVite)
  await patchViteConfig(viteConfigPath, useVite)
  await patchGitignore(gitignorePath)
}

async function patchGitignore(gitignorePath: string) {
  const current = await readFile(gitignorePath, 'utf8')
  const next = current.replace(/^### /gm, '')
  await writeFile(gitignorePath, next, 'utf8')
}

async function patchPackageJson(packageJsonPath: string, useVite: boolean) {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  if (useVite) {
    if (packageJson.dependencies?.['bun-plugin-tailwind']) {
      delete packageJson.dependencies['bun-plugin-tailwind']
    }
  } else {
    removeVitePackages(packageJson.dependencies)
    removeVitePackages(packageJson.devDependencies)
  }

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
}

function removeVitePackages(deps?: Record<string, string>) {
  if (!deps) {
    return
  }

  for (const key of Object.keys(deps)) {
    if (key.toLowerCase().includes('vite')) {
      delete deps[key]
    }
  }
}

async function patchEngine(enginePath: string, useVite: boolean) {
  const current = await readFile(enginePath, 'utf8')
  let next = current.replace(`// ${VITE_CONFIG_LINE}`, VITE_CONFIG_LINE).replace(VITE_CONFIG_LINE, '')

  if (useVite) {
    next = current.replace(`// ${VITE_CONFIG_LINE}`, VITE_CONFIG_LINE)
  } else {
    next = current.replace(`// ${VITE_CONFIG_LINE}`, '').replace(VITE_CONFIG_LINE, '')
  }

  await writeFile(enginePath, next, 'utf8')
}

async function patchIndexHtml(indexHtmlPath: string, useVite: boolean) {
  const current = await readFile(indexHtmlPath, 'utf8')
  let next = current

  if (useVite) {
    next = next.replace(TAILWIND_LINK_COMMENT, TAILWIND_LINK)
    next = next.replace(HTML_CLIENT_SRC_DOT, HTML_CLIENT_SRC_ROOT)
  } else {
    next = next.replace(TAILWIND_LINK_COMMENT, '')
    next = next.replace(TAILWIND_LINK, '')
  }

  await writeFile(indexHtmlPath, next, 'utf8')
}

async function patchViteConfig(viteConfigPath: string, useVite: boolean) {
  if (useVite) {
    return
  }
  await rm(viteConfigPath, { force: true })
}

async function ensureBun(interactive: boolean) {
  if (isBunInstalled()) {
    return
  }

  if (!interactive) {
    throw new Error('Bun is required but was not found in PATH. Install Bun and re-run this command.')
  }

  const shouldInstall = await confirm({
    message: 'Bun is not installed. Install it globally with npm now?',
    initialValue: true,
  })
  if (isCancel(shouldInstall) || !shouldInstall) {
    throw new Error('Bun is required. Please install Bun and re-run this command.')
  }

  const install = spawnSync('npm', ['install', '-g', 'bun'], { stdio: 'inherit' })
  if (install.status !== 0) {
    throw new Error('Failed to install Bun globally via npm.')
  }

  if (!isBunInstalled()) {
    throw new Error('Bun installation finished but bun is still unavailable in PATH.')
  }
}

async function installDependencies(appName: string) {
  const appRoot = resolve(process.cwd(), appName)
  const install = spawnSync('bun', ['install'], { cwd: appRoot, stdio: 'inherit' })
  if (install.status !== 0) {
    throw new Error('Failed to install dependencies in the generated project.')
  }
}

function isBunInstalled() {
  const check = spawnSync('bun', ['--version'], { stdio: 'ignore' })
  return check.status === 0
}

function resolveTemplateDir() {
  const currentFileDir = dirname(fileURLToPath(import.meta.url))
  return resolve(currentFileDir, '../../template')
}
