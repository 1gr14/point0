module.exports = function (api) {
  api.cache(true)

  return {
    presets: ['babel-preset-expo'],
    plugins: [['@point0/compiler/plugin/babel', { side: 'client', scope: 'site' }]],
  }
}
