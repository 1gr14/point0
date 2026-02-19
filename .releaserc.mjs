const branch = process.env.GITHUB_REF?.replace('refs/heads/', '') || ''

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: [{ name: 'main' }, { name: 'next', prerelease: true }],
  plugins: [
    branch === 'next'
      ? [
          '@semantic-release/commit-analyzer',
          {
            preset: 'conventionalcommits',
            releaseRules: [{ type: '*', release: 'patch' }],
          },
        ]
      : '@semantic-release/commit-analyzer',
    branch === 'next'
      ? undefined
      : [
          '@semantic-release/git',
          {
            assets: ['package.json', 'packages/*/package.json', 'CHANGELOG.md'],
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Semantic Release message template
            message: 'chore(release): ${nextRelease.version} --skip-ci',
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
        pkgRoot: 'packages/wouter',
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'packages/cookies-store',
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
    '@semantic-release/github',
  ].filter(Boolean),
}
