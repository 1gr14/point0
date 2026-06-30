import { CString, dlopen, FFIType, type Pointer, read } from 'bun:ffi'
import nodeFs from 'node:fs'

// Bun auto-loads a .env cascade into the JS `process.env` before any CLI code runs, but it mutates
// ONLY that JS object — the process's native OS environment block is left untouched (verified on
// Windows: the Win32 block has none of the .env values the JS `process.env` shows). That native
// block is therefore the genuine shell environment, with zero .env contamination and nothing to
// "subtract". This module reads it directly, so the CLI can ignore Bun's JS-level injection entirely
// and load the cascade for the mode IT resolves — see env-files.ts.
//
// We need this on every normal launch: the cli.ts shebang is deliberately flag-free, so Bun is never
// told `--no-env-file` up front and always auto-loads its cascade into the JS `process.env` (a flagged
// `#!/usr/bin/env -S` shebang would mis-parse on Bun's Windows shim — see cli.ts). Only if something
// external passes `--no-env-file` does Bun load nothing, leaving `process.env` already genuine.

/**
 * Windows: kernel32 GetEnvironmentStringsW returns the genuine process environment block (UTF-16, double-NUL
 * terminated).
 */
const readWindowsEnviron = (): Record<string, string> => {
  const k32 = dlopen('kernel32.dll', {
    GetEnvironmentStringsW: { args: [], returns: FFIType.ptr },
    FreeEnvironmentStringsW: { args: [FFIType.ptr], returns: FFIType.i32 },
  })
  const base = k32.symbols.GetEnvironmentStringsW()
  try {
    const env: Record<string, string> = {}
    if (base === null) {
      return env
    }
    let entry = ''
    // The block is a run of NUL-terminated wide strings ending in an empty one (double-NUL).
    for (let i = 0; i < 1_000_000; i++) {
      const code = read.u16(base, i * 2)
      if (code === 0) {
        if (entry === '') break
        // Windows seeds per-drive working-dir pseudo-vars named like "=C:" — never real env vars.
        if (entry[0] !== '=') {
          const eq = entry.indexOf('=')
          if (eq > 0) env[entry.slice(0, eq)] = entry.slice(eq + 1)
        }
        entry = ''
      } else {
        entry += String.fromCharCode(code)
      }
    }
    return env
  } finally {
    k32.symbols.FreeEnvironmentStringsW(base)
    k32.close()
  }
}

const POINTER_SIZE = 8

/** macOS/Darwin: libSystem `_NSGetEnviron()` yields `char***`; walk the `char**` array of `KEY=VALUE` C strings. */
const readDarwinEnviron = (): Record<string, string> => {
  const lib = dlopen('libSystem.dylib', { _NSGetEnviron: { args: [], returns: FFIType.ptr } })
  try {
    const env: Record<string, string> = {}
    const environPtrPtr = lib.symbols._NSGetEnviron()
    if (environPtrPtr === null) {
      return env
    }
    // read.ptr returns the raw pointer as a number — 0 means NULL (end of the char* array / unset).
    const environPtr = read.ptr(environPtrPtr, 0)
    if (environPtr === 0) {
      return env
    }
    for (let i = 0; i < 1_000_000; i++) {
      const strPtr = read.ptr(environPtr as Pointer, i * POINTER_SIZE)
      if (strPtr === 0) break
      const entry = new CString(strPtr as Pointer).toString()
      const eq = entry.indexOf('=')
      if (eq > 0) env[entry.slice(0, eq)] = entry.slice(eq + 1)
    }
    return env
  } finally {
    lib.close()
  }
}

/** Linux: /proc/self/environ is the env captured at exec — libc setenv never rewrites it. */
const readLinuxEnviron = (): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const entry of nodeFs.readFileSync('/proc/self/environ', 'utf8').split('\0')) {
    if (entry === '') continue
    const eq = entry.indexOf('=')
    if (eq > 0) env[entry.slice(0, eq)] = entry.slice(eq + 1)
  }
  return env
}

/**
 * The genuine OS-level environment for this process, free of Bun's .env auto-load injection. Returns undefined when the
 * platform's native block can't be read, so callers can fall back gracefully.
 */
export const readOsEnviron = (): Record<string, string> | undefined => {
  try {
    if (process.platform === 'win32') return readWindowsEnviron()
    if (process.platform === 'linux') return readLinuxEnviron()
    if (process.platform === 'darwin') return readDarwinEnviron()
    return undefined
  } catch {
    return undefined
  }
}
