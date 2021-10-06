module.exports = function (api) {
  if (api) {
    api.cache(true);
    api.debug = true;
  }

  return {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      '@babel/preset-typescript',
    ],
    plugins: [
      'static-fs',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            './utils': 'utils',
            './cleaners': 'cleaners',
            './resource': 'resource',
            './extractors': 'extractors',
            './test-helpers.js': 'test-helpers',
            './mercury': 'mercury',
          },
        },
      ],
      [
        '@babel/plugin-transform-runtime',
        {
          regenerator: true,
        },
      ],
    ],
  };
};
