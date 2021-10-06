module.exports = function (config) {
  config.set({
    basePath: '',

    frameworks: ['browserify', 'jasmine'],
    // frameworks: ['karma-typescript', 'jasmine'],
    files: [{ pattern: 'src/**/*.test.js', included: true, type: 'js' }],

    exclude: [],

    preprocessors: {
      // 'src/*.[jt]s': ['babel', 'karma-typescript'],
      'src/**/*!(*.d).[jt]s': ['browserify'],
    },

    browserify: {
      debug: true,
      // Turn off declarationDir as it breaks tsify
      plugin: [
        [
          'tsify',
          {
            target: 'ES5',
            declaration: false,
            declarationDir: undefined,
          },
        ],
      ],
      transform: [
        [
          'babelify',
          {
            presets: [
              [
                '@babel/preset-env',
                {
                  modules: 'cjs',
                },
              ],
              '@babel/typescript',
            ],
            global: true,
          },
        ],
        'brfs',
      ],
      // extensions: ['ts', '.js'],
    },
    // babelPreprocessor: {
    //   options: {
    //     presets: ['@babel/preset-env', '@babel/typescript'],
    //     plugins: ['static-fs'],
    //   },
    // },
    // karmaTypescriptConfig: {
    //   tsconfig: './tsconfig.json',
    //   compilerOptions: {
    //     target: 'ES5',
    //     declaration: false,
    //     declarationDir: undefined,
    //     module: 'CommonJS',
    //   },
    //   bundlerOptions: {
    //     addNodeGlobals: false,
    //     transforms: [require('karma-typescript-es6-transform')()],
    //     resolve: {
    //       alias: {
    //         'test-helpers': './src/test-helpers.js',
    //         utils: './src/utils',
    //         cleaners: './src/cleaners',
    //         resource: './src/resource',
    //         extractors: './src/extractors',
    //       },
    //     },
    //   },
    // },

    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['Chrome'],
    singleRun: true,
    concurrency: Infinity,
  });
};
