const branch = process.env.GITHUB_REF?.replace('refs/heads/', '') || ''

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: [{ name: 'main' }, { name: 'next', prerelease: true }],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        // HARD CAP — semantic-release must NEVER cut a major. A breaking change
        // (`feat!:` / a `BREAKING CHANGE:` footer) is downgraded to a minor (a
        // prerelease patch on `next`), so the version can never auto-jump to
        // 1.x / 2.x / … — it stays in 0.x until we deliberately change this.
        // Applies on every branch, always. (There is no other path to a major in
        // conventional commits, so capping `breaking` is sufficient.)
        releaseRules:
          branch === 'next'
            ? [
                { breaking: true, release: 'patch' },
                { type: '*', release: 'patch' },
              ]
            : [
                { breaking: true, release: 'minor' },
                { type: 'feat', release: 'minor' },
                { type: 'perf', release: 'patch' },
                { type: 'fix', release: 'patch' },
              ],
      },
    ],
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/core',
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/engine',
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/react-dom',
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/compiler',
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/cors',
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/openapi',
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/basic-auth',
      },
    ],
    // create-app (`create-point0-app`) is UNSCOPED — npm cannot publish an unscoped
    // package privately, so it would go PUBLIC = a leak. Excluded during the private
    // phase. Re-add this block at the public launch:
    //   ['@semantic-release/npm', { pkgRoot: 'packages/create-app' }],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/docs',
      },
    ],
    // After all packages are versioned by the npm plugins, materialize internal
    // @point0/* ranges to the new version (+ external deps from the catalog table)
    // so every published package.json ships correct, real dependency ranges.
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'bun scripts/sync-versions.ts --write --point0-version ${nextRelease.version}',
      },
    ],
    branch === 'next'
      ? undefined
      : [
          '@semantic-release/git',
          {
            assets: [
              'package.json',
              'packages/*/package.json',
              'packages/create-app/template/package.json',
              'examples/*/package.json',
              'CHANGELOG.md',
            ],
            message: 'chore(release): ${nextRelease.version} --skip-ci',
          },
        ],
    '@semantic-release/github',
  ].filter(Boolean),
}
